// ui/quests.js
import { getAllQuests, completeQuest } from '../core/questsModel.js';
import { applyProgression } from '../core/progression.js';
import { loadCharacter, saveCharacter } from '../core/character.js';
import { renderProfile } from './profile.js';

function renderQuests() {
  const container = document.getElementById("quests");
  const all = getAllQuests();

  const active = all.filter(q => !q.completed);
  const done = all.filter(q => q.completed);

  const renderList = (quests, completed = false) => {
    if (!quests.length) return "<p>Пусто.</p>";
    return `
      <ul style="list-style:none;padding-left:0;">
        ${quests.map(q => `
          <li style="margin-bottom:10px;border-bottom:1px solid #333;padding:6px;">
            <strong>${q.title}</strong> (${q.type}, +${q.xp} XP)
            ${q.description ? `<div style="font-size:0.9em;color:#aaa;">${q.description}</div>` : ""}
            ${!completed ? `<button data-id="${q.id}">Выполнено</button>` : `<span style="color:green;">✓ Завершено</span>`}
          </li>
        `).join('')}
      </ul>
    `;
  };

  container.innerHTML = `
    <h3>Активные</h3>
    ${renderList(active, false)}
    <h3>Завершённые</h3>
    ${renderList(done, true)}
  `;

  // Привязываем кнопки "Выполнено"
  container.querySelectorAll("button[data-id]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.dataset.id);
      completeQuest(id);

      const character = loadCharacter();
      // Здесь ты можешь привязывать XP к нужным навыкам или характеристикам
      // Сейчас просто даём +10 XP к "дух" как временный пример
      applyProgression(character, {
        attributes: [{ name: "дух", xp: 10 }]
      });

      saveCharacter(character);
      renderProfile();
      renderQuests();
    });
  });
}

export { renderQuests };
