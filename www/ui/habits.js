// ui/habits.js
import { getAllHabits, addHabit, markHabit } from '../core/habitsModel.js';

function renderHabits() {
  const container = document.getElementById("habits");
  const habits = getAllHabits();

  container.innerHTML = `
    <div style="display:flex;gap:30px;flex-wrap:wrap;align-items:flex-start;">
      <!-- Левая часть — список привычек -->
      <div style="flex:1;min-width:280px;">
        <h3>Привычки</h3>
        ${habits.length ? `
          <ul style="list-style:none;padding:0;">
            ${habits.map(renderHabitItem).join('')}
          </ul>
        ` : `<p>Привычек пока нет. Добавь первую привычку.</p>`}
      </div>

      <!-- Правая часть — добавление новой привычки -->
      <div style="flex:1;min-width:300px;">
        <h3>Добавить привычку</h3>
        <input type="text" id="habitName" placeholder="Название привычки" style="width:100%;padding:8px;" />
        <label style="display:block;margin-top:10px;">
          <input type="checkbox" id="habitGood" checked /> Полезная привычка
        </label>
        <button id="addHabitBtn" style="margin-top:10px;">Добавить</button>
      </div>
    </div>
  `;

  document.getElementById("addHabitBtn").addEventListener("click", () => {
    const name = document.getElementById("habitName").value.trim();
    const good = document.getElementById("habitGood").checked;
    if (!name) {
      alert("Введите название привычки");
      return;
    }
    addHabit({ name, good });
    renderHabits();
  });

  // Обработка отметки дня
  container.querySelectorAll("button.markHabit").forEach(btn => {
    btn.addEventListener("click", () => {
      const name = btn.dataset.name;
      markHabit(name);
      renderHabits();
    });
  });
}

function renderHabitItem(habit) {
  const totalDays = habit.days?.length || 0;
  const streak = habit.streak || 0;
  const level = Math.floor(totalDays / 30);
  const progress = totalDays % 30;
  const percent = Math.floor((progress / 30) * 100);
  const today = new Date().toISOString().slice(0, 10);
  const doneToday = habit.days?.includes(today);

  return `
    <li style="margin-bottom:12px;border:1px solid #333;padding:10px;border-radius:6px;">
      <strong>${habit.name}</strong> — ${level} мес. (${streak} дней подряд)
      <div style="background:#444;height:10px;border-radius:5px;overflow:hidden;margin:6px 0;">
        <div style="width:${percent}%;background:#6c6;height:100%;"></div>
      </div>
      <small style="color:#aaa;">${progress} / 30 дней до следующего месяца</small><br/>
      <button class="markHabit" data-name="${habit.name}" ${doneToday ? 'disabled' : ''}>
        ${doneToday ? 'Сегодня уже отмечено' : 'Отметить на сегодня'}
      </button>
    </li>
  `;
}

export { renderHabits };
