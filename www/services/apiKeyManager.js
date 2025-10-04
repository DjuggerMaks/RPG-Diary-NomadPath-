// services/apiKeyManager.js

function ensureApiKey() {
    const existingKey = localStorage.getItem("openai_api_key");
    if (existingKey) return;
  
    const modal = document.createElement("div");
    modal.innerHTML = `
      <div style="position:fixed;top:0;left:0;width:100%;height:100%;background:#000a;display:flex;align-items:center;justify-content:center;z-index:9999;">
        <div style="background:#222;padding:20px;color:white;border-radius:8px;max-width:400px;width:90%;">
          <h3>Введите OpenAI API ключ</h3>
          <p style="font-size:12px;opacity:0.7;">Ключ хранится только на вашем устройстве</p>
          <input id="apiKeyInput" type="password" placeholder="sk-..." style="width:100%;padding:10px;" />
          <button id="saveApiKey" style="margin-top:10px;">Сохранить</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  
    document.getElementById("saveApiKey").addEventListener("click", () => {
      const key = document.getElementById("apiKeyInput").value.trim();
      if (!key.startsWith("sk-")) {
        alert("Неверный формат ключа");
        return;
      }
      localStorage.setItem("openai_api_key", key);
      modal.remove();
    });
  }
  
  function getOpenAIKey() {
    return localStorage.getItem("openai_api_key");
  }
  
  export { ensureApiKey, getOpenAIKey };
  