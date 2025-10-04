import { loadCharacter, saveCharacter, resetCharacter, createCharacterFromInit } from '../core/character.js';
import { showOnboardingModal } from './onboarding.js';
import { xpDetails } from '../core/skillsModel.js';

const isDebug = true; // включаем логирование профиля
function log(...args) {
  if (isDebug) console.log('[👤]', ...args);
}

/**
 * Глобальный уровень считается из СУММЫ уровней характеристик:
 * level = floor(sum(attr.level) / 10)
 * progress = sum(attr.level) % 10
 * required = 10
 * Если в персонаже уже есть character.globalProgress / globalRequired — используем их.
 */
function getGlobalProgress(character) {
  if (!character) return { level: 0, current: 0, required: 10, percent: 0 };

  // Предпочтительно используем значения, рассчитанные progression.applyGlobalXP
  if (typeof character.level === 'number' &&
      typeof character.globalProgress === 'number' &&
      typeof character.globalRequired === 'number') {
    const level = character.level;
    const current = character.globalProgress;
    const required = character.globalRequired || 10;
    const percent = required > 0 ? Math.floor((current / required) * 100) : 0;
    log(`Глобальный прогресс (из характера): L${level} ${current}/${required} (${percent}%)`);
    return { level, current, required, percent };
  }

  // Фоллбек — считаем на лету из атрибутов
  const attributes = character.attributes || {};
  const totalAttributeLevels = Object.values(attributes).reduce((sum, a) => sum + (a?.level || 0), 0);
  const level = Math.floor(totalAttributeLevels / 10);
  const current = totalAttributeLevels % 10;
  const required = 10;
  const percent = required > 0 ? Math.floor((current / required) * 100) : 0;
  log(`Глобальный прогресс (fallback): суммарно ${totalAttributeLevels} уровней атрибутов → L${level} ${current}/${required}`);
  return { level, current, required, percent };
}

function renderProfile() {
  const character = loadCharacter();
  const container = document.getElementById("profile");
  if (!container) return console.error("[🧑] Контейнер #profile не найден");

  if (!character || !character.name || !character.generatedDescription) {
    // Экран создания персонажа
    container.innerHTML = `
      <div style="display:flex;gap:30px;flex-wrap:wrap;align-items:flex-start;">
        <div style="flex:1;min-width:280px;">
          <h3>Профиль персонажа</h3>
          <div style="text-align:center;">
            <h2 id="profileDisplayName">Путник</h2>
            <div id="avatarPreview" style="margin-top:10px;"><p style="color:#888;">Нет изображения</p></div>
            <p style="margin-top:10px;">Уровень: 0</p>
            <div style="background:#444;height:12px;border-radius:6px;overflow:hidden;margin:4px 0;">
              <div style="background:#6c6;width:0%;height:100%;"></div>
            </div>
            <small style="color:#ccc;">0 / 10 XP до следующего уровня</small>
            <p style="font-style:italic;color:#ccc;margin-top:10px;">Нет описания</p>
          </div>
        </div>
        <div style="flex:1;min-width:300px;" id="profileEdit">
          <h3>Создать персонажа</h3>
          <input id="profileName" type="text" placeholder="Имя" style="width:100%;margin-bottom:10px;padding:5px;">
          <textarea id="profileDescription" placeholder="Описание" style="width:100%;height:80px;margin-bottom:10px;padding:5px;"></textarea>
          <input id="profileAvatar" type="file" accept="image/*" style="margin-bottom:10px;">
          <button id="createProfile">Создать</button>
        </div>
      </div>
    `;

    document.getElementById("createProfile").addEventListener("click", async () => {
      try {
        const name = document.getElementById("profileName").value.trim();
        const desc = document.getElementById("profileDescription").value.trim();
        const avatarInput = document.getElementById("profileAvatar");
        let avatarData = null;

        if (avatarInput.files && avatarInput.files[0]) {
          avatarData = await new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(avatarInput.files[0]);
          });
        }

        const initData = {
          name: name || 'Путник',
          description: desc || '',
          avatar: avatarData
        };

        log('Создание персонажа из инициализации', initData);
        const created = await createCharacterFromInit(initData);
        log('Персонаж создан', created);

        renderProfile();
      } catch (e) {
        console.error("[🧑] Ошибка создания персонажа:", e);
        alert("Ошибка создания персонажа");
      }
    });
  } else {
    // Просмотр персонажа
    const { level, current, required, percent } = getGlobalProgress(character);
    container.innerHTML = `
      <div style="display:flex;gap:30px;flex-wrap:wrap;align-items:flex-start;">
        <div style="flex:1;min-width:280px;">
          <h3>Профиль персонажа</h3>
          <div style="text-align:center;">
            <h2 id="profileDisplayName">${character.name || "Путник"}</h2>
            <div id="avatarPreview" style="margin-top:10px;">
              ${character.avatar ? `<img src="${character.avatar}" alt="Аватар" style="max-width:200px;border-radius:8px;">` : '<p style="color:#888;">Нет изображения</p>'}
            </div>
            <p style="margin-top:10px;">Уровень: ${level}</p>
            <div class="xp-progress-bar"><div class="xp-progress-fill" style="width:${percent}%;"></div></div>
            <small style="color:#ccc;">${current} / ${required} очков атрибутов до следующего глобального уровня</small>
            <p style="font-style:italic;color:#ccc;margin-top:10px;">${character.generatedDescription || "Нет описания"}</p>
          </div>
        </div>
        <div style="flex:1;min-width:300px;" id="profileEdit">
          <h3>Управление профилем</h3>
          <button id="resetCharacter">Сбросить</button>
        </div>
      </div>
    `;

    // Сброс персонажа
    document.getElementById("resetCharacter")?.addEventListener("click", () => {
      const modal = document.createElement("div");
      modal.className = "modal";
      modal.innerHTML = `
        <div class="modal-content">
          <h3>Сброс персонажа</h3>
          <p>Вы уверены? Данные будут удалены.</p>
          <div class="modal-buttons">
            <button class="modal-confirm">Сбросить</button>
            <button class="modal-cancel">Отмена</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector(".modal-confirm").addEventListener("click", () => {
        log('Сброс персонажа');
        resetCharacter();
        modal.remove();
        showOnboardingModal();
        renderProfile();
      });
      modal.querySelector(".modal-cancel").addEventListener("click", () => modal.remove());
    });
  }
}

export { renderProfile };
