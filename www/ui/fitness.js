import { loadCharacter, saveCharacter } from '../core/character.js';
import { showNotification } from './app.js';
import { analyzeSportEntry } from '../services/apiService.js';

function renderFitness() {
  console.log("[🏋️] Рендерим вкладку Фитнес");
  const container = document.getElementById("fitness");
  if (!container) {
    console.error("❌ Контейнер #fitness не найден");
    return;
  }

  const character = loadCharacter();
  if (!character) {
    console.warn("⚠️ Персонаж не загружен, календарь не рендерится");
    return;
  }

  // Инициализируем fitnessActivities, если отсутствует
  character.fitnessActivities = character.fitnessActivities || [];
  console.log("[🏋️] Фитнес-активности:", JSON.stringify(character.fitnessActivities, null, 2));

  // Получаем текущий месяц и год или используем выбранный
  let currentDate = new Date();
  const storedMonth = localStorage.getItem('fitnessMonth');
  if (storedMonth) {
    const [year, month] = storedMonth.split('-').map(Number);
    currentDate = new Date(year, month);
  }
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const firstDayOfWeek = firstDay.getDay() || 7; // 1 = Понедельник, 7 = Воскресенье

  // Формируем календарь
  let calendarHTML = `
    <div class="fitness-container">
      <div class="calendar-header">
        <button id="prevMonth">◄</button>
        <h3>Фитнес: ${currentDate.toLocaleString('ru-RU', { month: 'long', year: 'numeric' })}</h3>
        <button id="nextMonth">►</button>
      </div>
      <div style="margin-bottom: 10px;">
        <button id="cleanOldActivities">Очистить старые активности</button>
      </div>
      <table class="fitness-calendar">
        <thead>
          <tr>
            <th>Пн</th><th>Вт</th><th>Ср</th><th>Чт</th><th>Пт</th><th>Сб</th><th>Вс</th>
          </tr>
        </thead>
        <tbody>
  `;

  let day = 1;
  let isFirstWeek = true;
  while (day <= daysInMonth) {
    calendarHTML += '<tr>';
    for (let i = 1; i <= 7; i++) {
      if (isFirstWeek && i < firstDayOfWeek) {
        calendarHTML += '<td></td>';
      } else if (day <= daysInMonth) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const activities = character.fitnessActivities.filter(a => a.date === dateStr);
        const activityText = activities.length > 0
          ? activities.map(a => `${a.activityEmoji || '🏋️'} ${a.text}`).join(', ')
          : '';
        calendarHTML += `
          <td class="calendar-day" data-date="${dateStr}" style="cursor: pointer">
            <span class="day-number">${day}</span>
            <div class="activity-text">${activityText}</div>
          </td>`;
        day++;
      } else {
        calendarHTML += '<td></td>';
      }
    }
    calendarHTML += '</tr>';
    isFirstWeek = false;
  }

  calendarHTML += `
        </tbody>
      </table>
    </div>
    <div id="fitnessModal" class="modal" style="display: none;">
      <div class="modal-content">
        <h3 id="modalTitle">Активности</h3>
        <input id="modalInput" class="modal-input" placeholder="Например: Бег 5 раз">
        <button id="modalAdd" class="modal-button">Добавить активность</button>
        <div id="modalActivities" class="modal-activities"></div>
        <button id="modalClose" class="modal-button">Закрыть</button>
      </div>
    </div>
  `;

  container.innerHTML = calendarHTML;

  // Обработчик переключения месяцев
  document.getElementById("prevMonth")?.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    localStorage.setItem('fitnessMonth', `${currentDate.getFullYear()}-${currentDate.getMonth()}`);
    renderFitness();
  });

  document.getElementById("nextMonth")?.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    localStorage.setItem('fitnessMonth', `${currentDate.getFullYear()}-${currentDate.getMonth()}`);
    renderFitness();
  });

  // Обработчик очистки старых активностей
  const cleanButton = document.getElementById("cleanOldActivities");
  if (cleanButton) {
    cleanButton.addEventListener("click", () => {
      console.log("[🏋️] Нажата кнопка 'Очистить старые активности'");
      const initialCount = character.fitnessActivities.length;
      character.fitnessActivities = character.fitnessActivities.filter(a => a.date.startsWith('2025'));
      const removedCount = initialCount - character.fitnessActivities.length;
      saveCharacter(character);
      console.log(`[🏋️] Удалено ${removedCount} старых активностей, осталось:`, JSON.stringify(character.fitnessActivities, null, 2));
      showNotification(`Удалено ${removedCount} старых активностей`, 'success');
      renderFitness();
    });
  }

  // Обработчик клика по дню
  document.querySelectorAll(".calendar-day").forEach(day => {
    day.addEventListener("click", () => {
      const date = day.getAttribute("data-date");
      if (!date) return;

      console.log("[🏋️] Клик по дню:", date);
      showModal(date, character);
    });
  });
}

function showModal(date, character) {
  const modal = document.getElementById("fitnessModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalInput = document.getElementById("modalInput");
  const modalActivities = document.getElementById("modalActivities");
  const modalAdd = document.getElementById("modalAdd");
  const modalClose = document.getElementById("modalClose");

  modalTitle.textContent = `Активности за ${date}`;
  const activities = character.fitnessActivities.filter(a => a.date === date);
  modalActivities.innerHTML = activities.length
    ? `<ul>${activities.map(a => `<li>${a.activityEmoji || '🏋️'} ${a.text}</li>`).join('')}</ul>`
    : '<p>Нет активностей за этот день.</p>';

  modal.style.display = 'block';

  modalAdd.onclick = async () => {
    try {
      const input = modalInput.value.trim();
      if (!input) {
        console.warn("[🏋️] Пустой ввод в модальном окне");
        showNotification("Введите активность", 'error');
        return;
      }

      const sportResult = await analyzeSportEntry(input);
      console.log("[🏋️] Результат анализа активности:", JSON.stringify(sportResult, null, 2));
      if (sportResult && Array.isArray(sportResult.activities) && sportResult.activities.length) {
        const activity = sportResult.activities[0];
        if (!activity.name || typeof activity.name !== 'string') {
          console.warn("[🏋️] Некорректная активность:", JSON.stringify(activity));
          showNotification("Не удалось распознать активность", 'error');
          return;
        }

        const activityData = {
          date,
          text: `${activity.name}${activity.count ? ` ${activity.count} раз` : ''}${activity.sets ? ` (${activity.sets} подхода)` : ''}${activity.comment ? ` - ${activity.comment}` : ''}`,
          activityEmoji: getEmojiForActivity(activity.name)
        };

        const isDuplicate = character.fitnessActivities.some(
          existing => existing.date === date && existing.text === activityData.text
        );
        if (!isDuplicate) {
          character.fitnessActivities.push(activityData);
          saveCharacter(character);
          console.log("[🏋️] Добавлена активность:", activityData);
          showNotification(`Добавлена активность: ${activity.name}`, 'success');
          modalInput.value = '';
          renderFitness();
        } else {
          console.log("[🏋️] Активность уже существует:", activityData);
          showNotification("Активность уже добавлена", 'error');
        }
      } else {
        console.warn("[🏋️] Не удалось распознать активность:", input);
        showNotification("Не удалось распознать активность", 'error');
      }
    } catch (e) {
      console.error("[🏋️] Ошибка при добавлении активности:", e);
      showNotification("Ошибка при добавлении активности", 'error');
    }
  };

  modalClose.onclick = () => {
    console.log("[🏋️] Модальное окно закрыто");
    modal.style.display = 'none';
  };

  modal.onclick = (e) => {
    if (e.target === modal) {
      console.log("[🏋️] Модальное окно закрыто по клику вне контента");
      modal.style.display = 'none';
    }
  };
}

function getEmojiForActivity(activityName) {
  const skillEmojiMap = {
    'готовка': '🍳',
    'бег': '🏃',
    'езда на велосипеде': '🚴',
    'плавание': '🏊',
    'йога': '🧘',
    'физическая подготовка': '⛹️',
    'программирование': '💻',
    'игра в компьютер': '🎮'
  };
  return skillEmojiMap[activityName.toLowerCase()] || '🏋️';
}

export { renderFitness };