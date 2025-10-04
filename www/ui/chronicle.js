import { getChronicleText, clearChronicle } from '../core/chronicleModel.js';
import { renderProfile } from './profile.js';

function renderChronicle() {
  const container = document.getElementById("chronicle");
  const text = getChronicleText();

  container.innerHTML = `
    <div class="chronicle-container">
      <div class="chronicle-header">
        <h3>Летопись персонажа</h3>
        <button id="clearChronicle">Очистить</button>
      </div>
      <div class="chronicle-content">
        ${text ? text : '<p class="no-entries">Летопись пуста. После анализа дневника сюда будут попадать художественные описания твоих приключений.</p>'}
      </div>
    </div>
  `;

  document.getElementById("clearChronicle").addEventListener("click", () => {
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modal-content">
        <p>Удалить всю летопись?</p>
        <div class="modal-buttons">
          <button onclick="this.parentElement.parentElement.remove()">Отмена</button>
          <button id="confirmClear">Подтвердить</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    document.getElementById("confirmClear").addEventListener("click", () => {
      clearChronicle();
      renderChronicle();
      if (typeof renderProfile === 'function') renderProfile();
      modal.remove();
    });
  });
}

function setupChronicle() {
  renderChronicle();
  window.refreshChronicle = renderChronicle; // Для вызова из diary.js
}

export { setupChronicle };