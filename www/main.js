import { ensureApiKey } from './services/apiKeyManager.js';
import { showOnboardingModal } from './ui/onboarding.js';
import { loadCharacter } from './core/character.js';
import { showTab, bindTabButtons, bindToggleSidebar, showNotification } from './ui/app.js';
import { renderProfile } from './ui/profile.js';
import { renderStats } from './ui/stats.js';
import { renderSkills } from './ui/skills.js';
import { renderQuests } from './ui/quests.js';
import { renderHabits } from './ui/habits.js';
import { setupChronicle } from './ui/chronicle.js';
import { renderJournal } from './ui/diary.js';
import { renderFood } from './ui/food.js';
import { renderFitness } from './ui/fitness.js';
import { renderMoney } from './ui/money.js';

const isDebug = false; // Управление логированием

function log(...args) {
  if (isDebug) console.log('[🚀]', ...args);
}

document.addEventListener('DOMContentLoaded', () => {
  log('Запуск приложения NomadPath');

  // 1. Проверка и ввод API-ключа
  log('Проверяем API-ключ');
  try {
    ensureApiKey();
  } catch (e) {
    log('Ошибка при проверке API-ключа:', e);
    showNotification('Ошибка при проверке API-ключа', 'error');
  }

  // 2. Навигация
  log('Привязываем кнопки навигации');
  try {
    bindTabButtons();
    bindToggleSidebar();
  } catch (e) {
    log('Ошибка при привязке кнопок навигации или триггера:', e);
    showNotification('Ошибка при настройке навигации', 'error');
  }

  // 3. Загрузка персонажа
  log('Загружаем персонажа');
  const character = loadCharacter();

  if (!character) {
    log('Персонаж не найден, запускаем онбординг');
    try {
      showOnboardingModal();
    } catch (e) {
      log('Ошибка при запуске онбординга:', e);
      showNotification('Ошибка при запуске онбординга', 'error');
    }
    return;
  }

  log('Персонаж загружен:', JSON.stringify(character));

  // 4. Проверка структуры персонажа
  if (!character.skills || !Array.isArray(character.skills) ||
      !character.attributes || typeof character.attributes !== 'object' ||
      !character.chronicle || !Array.isArray(character.chronicle) ||
      !character.journal || !Array.isArray(character.journal) ||
      !character.fitnessActivities || !Array.isArray(character.fitnessActivities)) {
    log('Некорректная структура персонажа:', JSON.stringify(character));
    showNotification('Некорректная структура персонажа', 'error');
    return;
  }

  // 5. Инициализация всех вкладок
  log('Инициализируем все вкладки');
  try {
    renderProfile();
    renderStats();
    renderSkills();
    renderQuests();
    renderHabits();
    setupChronicle();
    renderJournal();
    renderFood();
    renderFitness();
    renderMoney();
  } catch (e) {
    log('Ошибка при инициализации вкладок:', e);
    showNotification('Ошибка при загрузке вкладок', 'error');
  }

  // 6. Показать вкладку "Профиль" по умолчанию
  log('Показываем вкладку "Профиль"');
  try {
    showTab('profile');
  } catch (e) {
    log('Ошибка при показе вкладки "Профиль":', e);
    showNotification('Ошибка при загрузке профиля', 'error');
  }
});

// Глобальный метод для безопасного обновления навыков
window.refreshSkills = () => {
  log('Вызван refreshSkills из window');
  try {
    renderSkills();
  } catch (e) {
    log('Ошибка при обновлении навыков:', e);
    showNotification('Ошибка при обновлении навыков', 'error');
  }
};