import { renderJournal } from './diary.js';
import { renderProfile } from './profile.js';
import { renderFitness } from './fitness.js';
import { renderStats } from './stats.js';
import { renderSkills } from './skills.js';
import { renderQuests } from './quests.js';
import { renderHabits } from './habits.js';
import { renderFood } from './food.js';
import { renderMoney } from './money.js';
import { setupChronicle } from './chronicle.js';

const isDebug = true; // Включено для отладки боковой панели

function log(...args) {
  if (isDebug) console.log('[🧭]', ...args);
}

/**
 * Показывает вкладку по её ID и подсвечивает кнопку.
 * @param {string} tabId - ID вкладки.
 */
function showTab(tabId) {
  log(`Показываем вкладку: ${tabId}`);
  const elements = {
    tabs: document.querySelectorAll('.tab-content'),
    buttons: document.querySelectorAll('.nav-button'),
    pane: document.getElementById(tabId),
    btn: document.querySelector(`.nav-button[data-tab="${tabId}"]`)
  };

  log('Найдено вкладок (.tab-content):', elements.tabs.length);
  log('Найдено кнопок (.nav-button):', elements.buttons.length);
  log('Контейнер вкладки:', elements.pane ? `id=${tabId}` : 'не найден');
  log('Кнопка вкладки:', elements.btn ? `data-tab=${tabId}` : 'не найдена');

  if (!elements.tabs.length) {
    console.error('❌ Нет элементов с классом .tab-content');
    showNotification('Ошибка: нет вкладок для отображения', 'error');
    return;
  }
  if (!elements.buttons.length) {
    console.error('❌ Нет элементов с классом .nav-button');
    showNotification('Ошибка: нет кнопок навигации', 'error');
    return;
  }

  // Скрываем все вкладки
  elements.tabs.forEach(tab => {
    tab.classList.remove('active');
    tab.style.display = 'none'; // Скрываем неактивные вкладки
  });

  // Убираем подсветку со всех кнопок
  elements.buttons.forEach(btn => btn.classList.remove('active'));

  // Активируем вкладку или fallback на diary
  if (elements.pane) {
    elements.pane.classList.add('active');
    elements.pane.style.display = 'block'; // Показываем активную вкладку
    log(`Вкладка ${tabId} активирована`);

    // Вызываем рендеринг для соответствующей вкладки
    try {
      switch (tabId) {
        case 'diary':
          renderJournal();
          break;
        case 'profile':
          renderProfile();
          break;
        case 'fitness':
          renderFitness();
          break;
        case 'stats':
          renderStats();
          break;
        case 'skills':
          renderSkills();
          break;
        case 'quests':
          renderQuests();
          break;
        case 'habits':
          renderHabits();
          break;
        case 'food':
          renderFood();
          break;
        case 'money':
          renderMoney();
          break;
        case 'chronicle':
          setupChronicle();
          break;
        default:
          log(`⚠️ Неизвестный tabId: ${tabId}, рендерим diary`);
          renderJournal();
          tabId = 'diary';
      }
    } catch (e) {
      log(`Ошибка при рендеринге вкладки ${tabId}:`, e);
      showNotification(`Ошибка при загрузке вкладки ${tabId}`, 'error');
    }
  } else {
    log(`⚠️ Нет элемента с id="${tabId}", показываем diary`);
    const diaryPane = document.getElementById('diary');
    if (diaryPane) {
      diaryPane.classList.add('active');
      diaryPane.style.display = 'block';
      renderJournal();
      tabId = 'diary';
    } else {
      showNotification('Ошибка: вкладка "Дневник" не найдена', 'error');
      return;
    }
  }

  // Подсвечиваем кнопку
  if (elements.btn) {
    elements.btn.classList.add('active');
    log(`Кнопка для ${tabId} подсвечена`);
  } else {
    log(`⚠️ Кнопка для ${tabId} не найдена`);
    const diaryBtn = document.querySelector('.nav-button[data-tab="diary"]');
    if (diaryBtn) {
      diaryBtn.classList.add('active');
      log('Подсвечена кнопка для diary (fallback)');
    }
  }
}

/**
 * Привязывает обработчики событий к кнопкам навигации
 */
function bindTabButtons() {
  log('Привязываем кнопки навигации');
  const buttons = document.querySelectorAll('.nav-button');
  log('Найдено кнопок навигации:', buttons.length);
  if (!buttons.length) {
    console.error('❌ Нет кнопок с классом .nav-button');
    showNotification('Ошибка: кнопки навигации не найдены', 'error');
    return;
  }

  buttons.forEach(button => {
    const tabId = button.getAttribute('data-tab');
    log(`Привязываем кнопку для вкладки: ${tabId}`);
    button.removeEventListener('click', handleTabClick);
    button.removeEventListener('pointerdown', handleTabClick);
    button.addEventListener('click', () => handleTabClick(tabId), { passive: true });
  });

  function handleTabClick(tabId) {
    try {
      log(`Обработчик клика для вкладки: ${tabId}`);
      showTab(tabId);
    } catch (e) {
      log('Ошибка при переключении вкладки:', e);
      showNotification('Ошибка при переключении вкладки', 'error');
    }
  }

  // Показываем diary по умолчанию
  showTab('diary');
}

/**
 * Переключение состояния боковой панели по клику на триггер
 */
function bindToggleSidebar() {
  log('Привязываем триггер боковой панели');
  const elements = {
    toggle: document.querySelector('.toggle-sidebar'),
    sidebar: document.querySelector('.sidebar')
  };

  if (!elements.toggle) {
    console.error('❌ Элемент .toggle-sidebar не найден');
    showNotification('Ошибка: триггер боковой панели не найден', 'error');
    return;
  }
  if (!elements.sidebar) {
    console.error('❌ Элемент .sidebar не найден');
    showNotification('Ошибка: боковая панель не найдена', 'error');
    return;
  }

  // Устанавливаем начальное состояние: развернута для десктопа, свернута для мобильных
  if (window.innerWidth < 768) {
    elements.sidebar.classList.add('collapsed');
    log('Боковая панель по умолчанию свернута для мобильных');
  } else {
    elements.sidebar.classList.remove('collapsed');
    log('Боковая панель по умолчанию развернута для десктопа');
  }

  elements.toggle.removeEventListener('click', handleToggleSidebar);
  elements.toggle.removeEventListener('pointerdown', handleToggleSidebar);
  elements.toggle.addEventListener('click', handleToggleSidebar, { passive: true });

  function handleToggleSidebar() {
    try {
      elements.sidebar.classList.toggle('collapsed');
      log(`Боковая панель ${elements.sidebar.classList.contains('collapsed') ? 'свернута' : 'развернута'} через триггер`);
    } catch (e) {
      log('Ошибка при переключении боковой панели:', e);
      showNotification('Ошибка при переключении боковой панели', 'error');
    }
  }
}

/**
 * Показывает уведомление.
 */
function showNotification(message, type) {
  log(`Показываем уведомление: ${message} (тип: ${type})`);
  try {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.remove();
      log(`Уведомление "${message}" удалено`);
    }, 3000);
  } catch (e) {
    log('Ошибка при показе уведомления:', e);
  }
}

export { showTab, bindTabButtons, showNotification, bindToggleSidebar };