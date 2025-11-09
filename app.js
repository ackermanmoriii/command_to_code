/*
 * این فایل باید به صورت type="module" در HTML لود شود
 * چون ما از 'import' استفاده می‌کنیم
*/
import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

// --- 1. گرفتن المان‌های DOM ---
const apiKeyScreen = document.getElementById('api-key-screen');
const mainAppScreen = document.getElementById('main-app');

const startBtn = document.getElementById('start-btn');
const generateBtn = document.getElementById('generate-btn');

const apiKeyInput = document.getElementById('api-key-input');
const languageInput = document.getElementById('language-input');
const promptInput = document.getElementById('prompt-input');

const promptDisplay = document.getElementById('prompt-display');
const codeDisplay = document.getElementById('code-display');

// متغیرهایی برای نگهداری آبجکت‌های API
let genAI;
let model;

// لیست رنگ‌های زیبا برای هایلایت
const HIGHLIGHT_COLORS = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#d35400'];

// --- 2. رویداد شروع اپ ---
startBtn.addEventListener('click', () => {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    alert('لطفاً API Key را وارد کنید.');
    return;
  }

  try {
    // مقداردهی اولیه Google AI SDK
    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    // تعویض صفحه‌ها
    apiKeyScreen.classList.remove('active');
    mainAppScreen.classList.add('active');
  } catch (error) {
    console.error("خطا در مقداردهی اولیه API:", error);
    alert('API Key نامعتبر است یا خطایی رخ داده.');
  }
});

// --- 3. رویداد اصلی: تولید کد ---
generateBtn.addEventListener('click', async () => {
  const language = languageInput.value.trim();
  const userPrompt = promptInput.value.trim();

  if (!language || !userPrompt) {
    alert('لطفاً هم زبان/فریمورک و هم پرامپت را وارد کنید.');
    return;
  }

  // فعال کردن حالت لودینگ
  generateBtn.disabled = true;
  generateBtn.innerHTML = '<span>⏳</span>';
  
  // پاک کردن خروجی‌های قبلی
  promptDisplay.innerHTML = '<h3>پرامپت شما</h3>';
  codeDisplay.innerHTML = '<h3>کد تولید شده</h3>';

  // --- ساخت "متا-پرامپت" (مغز متفکر) ---
  const metaPrompt = `
    You are an expert code generation assistant. The user wants code in the following language: ${language}
    The user's request is: "${userPrompt}"

    Your task is to:
    1. Generate the requested code.
    2. Provide a precise mapping between the meaningful segments of the user's prompt and the corresponding segments of the generated code.

    You MUST return your response as a single JSON object. The JSON object must have two keys:
    1. \`code\`: A string containing the full, complete generated code.
    2. \`mapping\`: An array of objects. Each object must have:
        - \`prompt_segment\`: The text fragment from the user's prompt.
        - \`code_segment\`: The corresponding generated code fragment.
        - \`id\`: A unique string ID (e.g., "seg-1", "seg-2") to link them.

    ---
    EXAMPLE:
    User Request: "In JavaScript, create a variable 'user' with name 'Ali' and print it to console."
    Language/Framework: JavaScript
    Your JSON Output:
    {
      "code": "const user = {\\n  name: 'Ali'\\n};\\nconsole.log(user);",
      "mapping": [
        {
          "prompt_segment": "create a variable 'user' with name 'Ali'",
          "code_segment": "const user = {\\n  name: 'Ali'\\n};",
          "id": "seg-1"
        },
        {
          "prompt_segment": "and print it to console",
          "code_segment": "console.log(user);",
          "id": "seg-2"
        }
      ]
    }
    ---

    Now, process the following user request:
    Language/Framework: ${language}
    User's Prompt: ${userPrompt}
  `;

  // --- 4. صدا زدن API ---
  try {
    const result = await model.generateContent(metaPrompt);
    const response = await result.response;
    const responseText = response.text();

    // --- 5. پارس کردن JSON ---
    // Gemini ممکن است JSON را در بلاک ```json ... ``` برگرداند
    let jsonString = responseText.trim();
    if (jsonString.startsWith('```json')) {
      jsonString = jsonString.substring(7, jsonString.length - 3).trim();
    }
    
    const data = JSON.parse(jsonString);

    // --- 6. رندر کردن جادویی! ---
    renderOutput(data.mapping);

  } catch (error) {
    console.error("خطا در دریافت پاسخ از Gemini:", error);
    codeDisplay.innerHTML += '<p style="color:red; direction:rtl;">خطایی در پردازش درخواست رخ داد. لطفاً API Key و پرامپت خود را بررسی کنید.</p>';
  } finally {
    // غیرفعال کردن حالت لودینگ
    generateBtn.disabled = false;
    generateBtn.innerHTML = '<span>🚀</span> Generate';
  }
});


// --- 7. تابع رندر کردن خروجی ---
function renderOutput(mapping) {
  const langClass = `language-${languageInput.value.trim().toLowerCase()}`;

  mapping.forEach((segment, index) => {
    const color = HIGHLIGHT_COLORS[index % HIGHLIGHT_COLORS.length];
    const id = segment.id;

    // 1. ساخت کارت پرامپت
    const promptCard = document.createElement('div');
    promptCard.className = 'segment-card prompt-card';
    promptCard.style.borderLeftColor = color;
    promptCard.dataset.id = id; // ست کردن ID برای هاور
    promptCard.textContent = segment.prompt_segment;

    // 2. ساخت کارت کد
    const codeCard = document.createElement('div');
    codeCard.className = 'segment-card code-card';
    codeCard.style.borderLeftColor = color;
    codeCard.dataset.id = id; // ست کردن همان ID
    
    // ساختار <pre><code> برای highlight.js
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.className = langClass;
    code.textContent = segment.code_segment;
    
    // اعمال هایلایت
    hljs.highlightElement(code);
    
    pre.appendChild(code);
    codeCard.appendChild(pre);
    
    promptDisplay.appendChild(promptCard);
    codeDisplay.appendChild(codeCard);
  });

  // --- 8. فعال‌سازی هاور (Hover) ---
  addHoverListeners();
}

// --- 9. تابع افزودن شنونده‌های هاور ---
function addHoverListeners() {
  const allCards = document.querySelectorAll('.segment-card');
  
  allCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      const id = card.dataset.id;
      if (!id) return;
      // همه کارت‌های با این ID را پیدا کن و کلاس 'is-hovered' بده
      document.querySelectorAll(`[data-id="${id}"]`).forEach(c => {
        c.classList.add('is-hovered');
      });
    });

    card.addEventListener('mouseleave', () => {
      const id = card.dataset.id;
      if (!id) return;
      // کلاس 'is-hovered' را بردار
      document.querySelectorAll(`[data-id="${id}"]`).forEach(c => {
        c.classList.remove('is-hovered');
      });
    });
  });
}