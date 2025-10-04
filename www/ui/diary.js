import { loadCharacter, saveCharacter } from '../core/character.js';
import { analyzeEntry, analyzeSportEntry } from '../services/apiService.js';
import { applyProgression } from '../core/progression.js';
import { getAllSkills, addOrUpdateSkill } from '../core/skillsModel.js';
import { showNotification } from './app.js';

const isDebug = true; // Включено для отладки

function log(...args) {
  if (isDebug) console.log('[📝]', ...args);
}

function renderJournal() {
  log('Рендерим Дневник');
  const container = document.getElementById('diary');
  if (!container) {
    log('Контейнер #diary не найден');
    showNotification('Контейнер дневника не найден', 'error');
    return;
  }

  const character = loadCharacter();
  if (!character) {
    log('Персонаж не загружен, Дневник не рендерится');
    container.innerHTML = '<p class="text-red-500">Ошибка: персонаж не найден. Попробуйте перезагрузить страницу.</p>';
    showNotification('Персонаж не найден', 'error');
    return;
  }

  character.journal = character.journal || [];
  log('Записи журнала:', JSON.stringify(character.journal));

  container.innerHTML = `
    <div>
      <h2 class="text-2xl font-bold mb-4 text-gray-300">Дневник</h2>
      <textarea id="entryText" class="w-full p-2 border rounded-md bg-gray-800 text-gray-300" placeholder="Пиши всё, что считаешь важным..."></textarea>
      <div class="flex gap-2 mt-2">
        <button id="saveEntry" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Сохранить запись</button>
        <button id="analyzeEntry" class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">Анализировать</button>
      </div>
      <div class="mt-4 bg-gray-800 p-2 rounded-md">
        <h4 class="text-lg font-semibold text-gray-300">Записи:</h4>
        <ul id="entryList" class="text-gray-300">
          ${character.journal.length > 0
            ? character.journal.map((e, i) => `<li>[${i + 1}] ${e}</li>`).join('')
            : '<li class="text-gray-500">Нет записей</li>'}
        </ul>
      </div>
      <div id="analysisResult" class="text-gray-300 mt-2"></div>
    </div>
  `;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setupDiary(character));
  } else {
    setupDiary(character);
  }
}

function setupDiary(character) {
  log('Инициализация Дневника');
  const elements = {
    saveButton: document.getElementById('saveEntry'),
    analyzeButton: document.getElementById('analyzeEntry'),
    entryText: document.getElementById('entryText'),
    entryList: document.getElementById('entryList'),
    analysisResult: document.getElementById('analysisResult')
  };

  if (Object.values(elements).some(el => !el)) {
    log('Не найдены необходимые элементы DOM');
    showNotification('Ошибка: не найдены элементы дневника', 'error');
    return;
  }

  elements.saveButton.addEventListener('click', () => {
    try {
      const text = elements.entryText.value.trim();
      if (!text) {
        showNotification('Запись пуста. Введите текст.', 'error');
        return;
      }

      character.journal.push(text);
      saveCharacter(character);

      elements.entryList.innerHTML = character.journal.length > 0
        ? character.journal.map((e, i) => `<li>[${i + 1}] ${e}</li>`).join('')
        : '<li class="text-gray-500">Нет записей</li>';

      elements.entryText.value = '';
      showNotification('Запись сохранена!', 'success');
    } catch (e) {
      log('Ошибка при сохранении записи:', e);
      showNotification('Ошибка при сохранении записи', 'error');
    }
  });

  elements.analyzeButton.addEventListener('click', async () => {
    try {
      if (character.journal.length === 0 && !elements.entryText.value.trim()) {
        showNotification('Нет записей для анализа', 'error');
        return;
      }

      const textToAnalyze = character.journal.concat(elements.entryText.value.trim()).filter(t => t);
      await analyzeEntries(character, textToAnalyze, elements);
    } catch (e) {
      log('Ошибка при анализе записи:', e);
      showNotification('Ошибка при анализе записи', 'error');
    }
  });
}

async function analyzeEntries(character, texts, elements) {
  log('Анализируем записи:', JSON.stringify(texts));
  const today = new Date().toISOString().split('T')[0];
  const updates = [];
  let hasActivities = false;

  try {
    for (const text of texts) {
      if (!text.trim()) continue;

      const result = await analyzeEntry(text);
      log('Результат анализа записи:', JSON.stringify(result));

      if (result && Array.isArray(result.skills)) {
        for (const skill of result.skills) {
          if (!skill.name || typeof skill.xp !== 'number') continue;

          // Добавляем или обновляем навык через skillsModel
          addOrUpdateSkill(character, {
            name: skill.name,
            xp: skill.xp,
            description: skill.description || `Активность: ${skill.name}`,
            attributes: skill.attributes,
            parent: skill.parent || null,
            emoji: skill.emoji || '🌟'
          });
          updates.push(`🛠️ ${skill.name} +${skill.xp} XP`);
        }
      }

      const sportResult = await analyzeSportEntry(text);
      log('Результат анализа спортивных активностей:', JSON.stringify(sportResult));

      if (sportResult && Array.isArray(sportResult.activities)) {
        for (const activity of sportResult.activities) {
          character.fitnessActivities = character.fitnessActivities || [];
          const newActivity = {
            name: activity.name,
            count: activity.count || null,
            sets: activity.sets || null,
            date: activity.date || today,
            comment: activity.comment || ''
          };
          character.fitnessActivities.push(newActivity);
          updates.push(`🏋️ ${activity.name}${activity.count ? ` (${activity.count} раз)` : ''}`);
          hasActivities = true;
        }
      }

      if (result?.newChronicle) {
        character.chronicle = character.chronicle || [];
        character.chronicle.unshift(`${today}: ${result.newChronicle.trim()}`);
        updates.push(`📜 Добавлена запись в летопись`);
      }
    }

    // Финальная прогрессия
    applyProgression(character);

    // Очистка дневника
    character.journal = [];
    saveCharacter(character);

    if (updates.length > 0) {
      showModal(updates);
      showNotification(hasActivities ? 'Активности обработаны' : 'Анализ завершён!', 'success');
    } else {
      showNotification('Нет навыков или активностей для анализа', 'error');
    }

    elements.entryText.value = '';
    elements.analysisResult.innerHTML = updates.length
      ? `<p>Результаты анализа:</p><ul>${updates.map(update => `<li>${update}</li>`).join('')}</ul>`
      : '<p>Нет навыков или активностей для анализа.</p>';

    renderJournal();
    if (typeof window.renderFitness === 'function') window.renderFitness();
    if (typeof window.renderChronicle === 'function') window.renderChronicle();
    if (typeof window.renderSkills === 'function') window.renderSkills();

  } catch (e) {
    log('Ошибка при анализе записей:', e);
    showNotification('Ошибка при анализе записей', 'error');
  }
}

function showModal(updates) {
  if (document.querySelector('.modal')) {
    document.querySelector('.modal').remove();
  }

  const modal = document.createElement('div');
  modal.className = 'modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center';
  modal.innerHTML = `
    <div class="bg-gray-800 p-4 rounded-md max-w-md w-full">
      <h3 class="text-lg font-bold text-gray-300">Результаты анализа</h3>
      <ul class="text-gray-300">
        ${updates.map(update => `<li>${update}</li>`).join('')}
      </ul>
      <button class="close-modal px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 mt-2">Закрыть</button>
    </div>
  `;
  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.querySelector('.close-modal').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
}

export { renderJournal };
