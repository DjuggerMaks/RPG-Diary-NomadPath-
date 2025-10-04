import { loadCharacter, saveCharacter } from '../core/character.js';
import { scoreAttributeAnswer } from '../services/apiService.js';
import { applyProgressionRules } from '../core/progression.js';
import { xpDetails, levelFromXP } from '../core/skillsModel.js';

/**
 * Возвращает прогресс конкретной характеристики (через xpDetails)
 */
function getAttributeProgress(xp) {
  const { level, remainder, needed } = xpDetails(xp || 0);
  const percent = needed > 0 ? Math.floor((remainder / needed) * 100) : 0;
  console.log(`[📊] Прогресс: уровень ${level}, ${remainder}/${needed} XP (${percent}%)`);
  return { level, current: remainder, required: needed, percent };
}

function renderStats() {
  console.log("[📊] Рендеринг характеристик");
  const character = loadCharacter();
  if (!character) {
    console.warn("[📊] Персонаж не загружен");
    return;
  }

  // Синхронизируем уровни характеристик
  character.attributeXP = character.attributeXP || {};
  Object.keys(character.attributes).forEach(attr => {
    const xp = character.attributeXP[attr] || 0;
    character.attributes[attr] = { xp, level: levelFromXP(xp) };
  });
  applyProgressionRules(character);

  const container = document.getElementById("stats");
  if (!container) {
    console.error("[📊] Контейнер #stats не найден");
    return;
  }

  const attrHtml = Object.entries(character.attributes).map(([attr, data]) => {
    const xp = character.attributeXP?.[attr] || 0;
    const { level, current, required, percent } = getAttributeProgress(xp);
    console.log("[📊] Характеристика:", { attr, xp, level });
    return `
      <tr>
        <td style="padding:4px;">${attr}</td>
        <td style="padding:4px; text-align:right;">Ур. ${level}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding:0 4px 10px;">
          <div style="background:#444;height:10px;border-radius:5px;overflow:hidden;">
            <div style="width:${percent}%;background:#6c6;height:100%;"></div>
          </div>
          <small style="color:#aaa;">${current} / ${required} XP</small>
        </td>
      </tr>
    `;
  }).join('');

  // Проверяем сумму уровней характеристик
  const totalAttributes = Object.values(character.attributes).reduce((sum, data) => sum + (data.level || 0), 0);
  const isStage2Visible = totalAttributes === 0;

  container.innerHTML = `
    <div style="display:flex;gap:30px;flex-wrap:wrap;align-items:flex-start;">
      <div style="flex:1;min-width:280px;">
        <h3>Характеристики</h3>
        <table style="width:100%;border-collapse:collapse;">
          <tbody>${attrHtml}</tbody>
        </table>
      </div>
      <div style="flex:1;min-width:300px;" id="statsEditor" ${isStage2Visible ? '' : 'class="hidden"'}>
        <h3>Этап 2: Оценка характеристик</h3>
        <p style="color:#777;">Ответь на 8 вопросов, чтобы задать начальные уровни.</p>
        <button id="startStage2">Начать этап 2</button>
      </div>
    </div>
  `;

  const startButton = document.getElementById("startStage2");
  if (startButton) {
    startButton.addEventListener("click", () => startStage2(character));
    console.log("[📊] Кнопка 'Начать этап 2' привязана");
  } else if (!container.querySelector('#statsEditor.hidden')) {
    console.warn("[📊] Кнопка 'Начать этап 2' не найдена, этап может быть завершён");
  }
}

function startStage2(character) {
  console.log("[📊] Запуск этапа 2");
  const questions = [
    { attr: "сила", text: "Насколько ты силён физически — можешь ли поднимать тяжёлые вещи или заниматься спортом?" },
    { attr: "ловкость", text: "Как хорошо ты справляешься с задачами, требующими точности или координации?" },
    { attr: "интеллект", text: "Часто ли ты решаешь сложные задачи или учишься чему-то новому?" },
    { attr: "харизма", text: "Легко ли тебе находить общий язык с людьми и убеждать их?" },
    { attr: "воля", text: "Смог бы ты устоять перед соблазном или закончить начатое, даже если трудно?" },
    { attr: "дух", text: "Насколько ты уверен в себе и своих силах в стрессовых ситуациях?" },
    { attr: "мудрость", text: "Как ты обычно принимаешь важные решения — интуитивно, с анализом или советуешься с кем-то?" },
    { attr: "энергия", text: "Насколько часто ты ощущаешь прилив сил и готовность к действию?" }
  ];

  let idx = 0;
  const editor = document.getElementById("statsEditor");

  function renderQuestion() {
    console.log(`[📊] Рендер вопроса ${idx + 1}/${questions.length}`);
    const q = questions[idx];
    editor.innerHTML = `
      <h3>Вопрос ${idx + 1} / ${questions.length}</h3>
      <p>${q.text}</p>
      <textarea id="stage2Answer" style="width:100%;height:80px;"></textarea>
      <div style="margin-top:10px;">
        <button id="prevQ"${idx === 0 ? ' disabled' : ''}>Назад</button>
        <button id="skipQ">Пропустить</button>
        <button id="nextQ">Ответить</button>
      </div>
    `;

    editor.querySelector('#prevQ')?.addEventListener('click', () => { idx--; renderQuestion(); });
    editor.querySelector('#skipQ').addEventListener('click', () => { idx++; if (idx >= questions.length) finish(); else renderQuestion(); });
    editor.querySelector('#nextQ').addEventListener('click', async () => {
      const val = editor.querySelector('#stage2Answer').value.trim();
      if (!val) { alert("Введите ответ или нажмите «Пропустить»."); return; }
      const attr = questions[idx].attr;
      const score = await scoreAttributeAnswer(attr, val);

      character.attributeXP = character.attributeXP || {};
      character.attributeXP[attr] = score;
      character.attributes[attr] = { xp: score, level: levelFromXP(score) };

      console.log(`[🎯] Установлен уровень ${character.attributes[attr].level} и XP ${score} для "${attr}"`);
      idx++;
      if (idx >= questions.length) finish(); else renderQuestion();
    });
  }

  function finish() {
    console.log("[🎯] Завершение этапа 2");
    applyProgressionRules(character);
    saveCharacter(character);

    const editor = document.getElementById("statsEditor");
    if (editor) { editor.classList.add('hidden'); console.log("[🎯] Этап 2 скрыт"); }

    import('./profile.js').then(m => m.renderProfile());
    import('./stats.js').then(m => m.renderStats());

    alert("Характеристики и уровень персонажа установлены.");
  }

  renderQuestion();
}

export { renderStats };
