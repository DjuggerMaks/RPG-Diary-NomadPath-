import { loadCharacter, saveCharacter } from '../core/character.js';
import { addOrUpdateSkill, levelFromXP, xpDetails } from '../core/skillsModel.js';
import { applyProgression } from '../core/progression.js';
import { analyzeSkillsFromAnswers } from '../services/apiService.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

function emojiForAttribute(attr) {
  const map = {
    сила: '💪', ловкость: '🤸', интеллект: '🧠', харизма: '🗣️',
    воля: '🛡️', дух: '🔥', мудрость: '📘', энергия: '⚡'
  };
  return map[attr] || '🔹';
}

export function renderSkills() {
  console.log("[🕸️] Рендерим паутину навыков");
  const container = document.getElementById("skills");
  if (!container) return console.error("❌ Контейнер #skills не найден");

  const character = loadCharacter();
  if (!character) return console.warn("⚠️ Персонаж не загружен, паутина не рендерится");

  // пересчёт уровней
  character.skills.forEach(skill => {
    skill.level = levelFromXP(skill.xp || 0); // только уровень (число)
  });

  const { nodes, links } = character.skillGraph || { nodes: [], links: [] };
  if (!Array.isArray(nodes) || !Array.isArray(links)) return console.error("❌ Некорректные данные skillGraph");

  const width = container.clientWidth || 300;
  const height = Math.min(width, window.innerHeight * 0.5);

  container.innerHTML = `
    <div class="skills-container flex flex-col md:flex-row gap-4 p-2">
      <div id="skillsList" class="w-full md:w-64 max-h-[50vh] overflow-y-auto bg-gray-900 border-r border-gray-700 p-3 rounded-md">
        <div class="flex justify-between items-center mb-2">
          <h3 class="text-sm font-bold text-gray-300">Список навыков</h3>
          <select id="skillsListSort" class="bg-gray-800 text-gray-300 text-xs p-1 rounded">
            <option value="name">По имени</option>
            <option value="xp">По XP</option>
            <option value="lastUsed">По последнему использованию</option>
          </select>
        </div>
        <div class="flex gap-2 mb-2">
          <input id="skillsSearch" type="text" placeholder="Поиск навыков..." class="w-full p-2 bg-gray-800 border border-gray-700 rounded text-xs text-gray-300"/>
          <button id="skillsSearchClear" class="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs hover:bg-gray-600">Очистить</button>
        </div>
        <ul id="skillsListItems" class="list-none p-0">
          ${character.skills.length ? character.skills.map(s => {
              const isRecent = new Date(s.lastUsed).getTime() > Date.now() - 86400000;
              return `<li class="cursor-pointer p-2 hover:bg-gray-700 rounded ${isRecent ? 'bg-gray-800' : ''}" data-skill="${s.name}">
                ${s.emoji || '🌟'} ${s.name} ${isRecent ? '<span class="text-green-500 text-xs">(новое)</span>' : ''}
              </li>`;
            }).join('') : '<li class="p-2 text-gray-500">Нет навыков</li>'}
        </ul>
      </div>
      <div class="flex-grow">
        <h3 class="text-sm font-bold text-gray-300 mb-2">Навыки персонажа</h3>
        <svg id="skills-web" class="w-full h-auto"></svg>
        <div id="skillsEditor" class="mt-2 ${character.skills.length > 0 ? 'hidden' : ''}">
          ${character.skills.length === 0 ? `
            <h3 class="text-sm font-bold">Этап 3: Стартовые навыки</h3>
            <p class="text-xs text-gray-400">Ответь на 3 вопроса — GPT предложит тебе ключевые навыки.</p>
            <button id="startStage3" class="px-3 py-1 bg-blue-600 text-white rounded text-xs">Начать этап 3</button>
          ` : `<p class="text-xs text-gray-400">Кликни на навык или в списке слева для деталей.</p>`}
        </div>
      </div>
    </div>`;

  const svg = d3.select("#skills-web")
    .attr('width', '100%').attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  nodes.forEach(n => { if (!n.x || !n.y) { n.x = width/2; n.y = height/2; n.fx = n.x; n.fy = n.y; }});

  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).distance(width / 10))
    .force("charge", d3.forceManyBody().strength(-20))
    .force("center", d3.forceCenter(width/2, height/2))
    .force("collide", d3.forceCollide(15)).tick(10);

  window.addEventListener('resize', () => {
    const nw = container.clientWidth || 300, nh = Math.min(nw, window.innerHeight*0.5);
    svg.attr('viewBox', `0 0 ${nw} ${nh}`);
    simulation.force("center", d3.forceCenter(nw/2, nh/2)).alpha(0.5).restart();
  });

  const link = svg.selectAll(".link").data(links).enter().append("line")
    .attr("class", "link").style("stroke", "#a29bfe").style("stroke-width", 1).style("stroke-opacity", .5);

  const node = svg.selectAll(".node").data(nodes).enter().append("g")
    .attr("class", d => d.type === "stat" ? "stat-node" : "skill-node")
    .call(d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended));

  node.append("circle")
    .attr("r", d => d.type === "stat" ? 8 : Math.min(15, Math.max(5, 5+(d.level||1)*2)))
    .style("fill", d => d.type==="stat" ? "#6c5ce7" : "#60a5fa").style("stroke","#fff").style("stroke-width",0.5);

  node.append("text")
    .attr("dy", d=> d.type==="stat"?-15:0).attr("text-anchor","middle")
    .style("fill","#e5e7eb").style("font-size",d=>d.type==="stat"?"12px":"16px")
    .text(d => d.type==="stat"?d.id:(character.skills.find(s=>s.name.toLowerCase()===d.id.toLowerCase())?.emoji || "🌟"));

  simulation.on("tick", () => {
    link.attr("x1",d=>d.source.x).attr("y1",d=>d.source.y).attr("x2",d=>d.target.x).attr("y2",d=>d.target.y);
    node.attr("transform", d=>`translate(${d.x},${d.y})`);
  });

  function dragstarted(e,d){ if(!e.active) simulation.alphaTarget(.3).restart(); d.fx=d.x; d.fy=d.y; }
  function dragged(e,d){ d.fx=e.x; d.fy=e.y; }
  function dragended(e,d){ if(!e.active) simulation.alphaTarget(0); d.x=d.fx; d.y=d.fy; saveCharacter({...character,skillGraph:{nodes,links}}); }

  node.on("click",(e,d)=>{ if(d.type==="skill") showSkillDetails(d,character,links); });

  // сортировка и поиск
  const updateSkillsList = skills => {
    const list=document.getElementById("skillsListItems");
    list.innerHTML = skills.length?skills.map(s=>`<li class="cursor-pointer p-2" data-skill="${s.name}">${s.emoji||'🌟'} ${s.name}</li>`).join(''):'<li class="p-2 text-gray-500">Нет навыков</li>';
    list.querySelectorAll("li").forEach(item=>item.addEventListener("click",()=>{
      const skillNode=nodes.find(n=>n.id.toLowerCase()===item.dataset.skill.toLowerCase());
      if(skillNode) showSkillDetails(skillNode,character,links);
    }));
  };

  document.getElementById("skillsListSort")?.addEventListener("change", e=>{
    let s=[...character.skills], sortBy=e.target.value;
    s.sort((a,b)=>sortBy==="xp"?(b.xp||0)-(a.xp||0):a.name.localeCompare(b.name));
    updateSkillsList(s);
  });
  document.getElementById("skillsSearch")?.addEventListener("input", e=>{
    const q=e.target.value.toLowerCase();
    updateSkillsList(character.skills.filter(s=>s.name.toLowerCase().includes(q)));
  });
  document.getElementById("skillsSearchClear")?.addEventListener("click",()=>{
    document.getElementById("skillsSearch").value=""; updateSkillsList([...character.skills]);
  });
  updateSkillsList([...character.skills]);

  document.getElementById("startStage3")?.addEventListener("click",()=>startStage3(character));
}

// ---------------- детали навыка ----------------
function showSkillDetails(d, character, links) {
  const skill = character.skills.find(s=>s.name.toLowerCase()===d.id.toLowerCase());
  if (!skill) return;

  const res = xpDetails(skill.xp || 0); // объект {level,remainder,needed}
  const xpProgress = res.needed > 0 ? Math.min((res.remainder / res.needed) * 100,100) : 0;

  const relatedAttributes = links.filter(l=>l.source.id===d.id && l.target.type==="stat").map(l=>l.target.id);

  const modal=document.createElement("div");
  modal.className="modal bg-gray-900 bg-opacity-75 p-4 rounded";
  modal.innerHTML=`
    <div class="modal-content bg-gray-800 p-4 rounded">
      <h3 class="text-sm font-bold">${skill.name} ${skill.emoji||'🌟'}</h3>
      <p class="text-xs">Уровень: ${res.level}</p>
      <div class="xp-progress-bar bg-gray-700 h-2 rounded"><div class="xp-progress-fill bg-blue-500 h-full" style="width:${xpProgress}%"></div></div>
      <p class="text-xs mt-1">${res.remainder}/${res.needed} XP до уровня ${res.level+1}</p>
      <p class="text-xs">Описание: ${skill.description||'-'}</p>
      <p class="text-xs">Атрибуты: ${skill.attributes?.map(a=>`${emojiForAttribute(a)} ${a}`).join(', ')||'-'}</p>
      <p class="text-xs">Родительский навык: ${skill.parent||'-'}</p>
      <p class="text-xs">Связи: ${relatedAttributes.join(', ')||'-'}</p>
      <div class="modal-buttons mt-2 flex justify-end"><button class="modal-cancel px-3 py-1 bg-gray-700 text-gray-300 rounded">Закрыть</button></div>
    </div>`;
  document.body.appendChild(modal);
  modal.querySelector(".modal-cancel").addEventListener("click",()=>modal.remove());
}

// ---------------- этап 3 ----------------
function startStage3(character){
  const questions=[
    "Чем ты любишь заниматься в свободное время?",
    "В каком деле ты чувствуешь себя опытным или полезным?",
    "Какой новый навык ты хочешь освоить?"
  ];
  let idx=0, answers=[]; const editor=document.getElementById("skillsEditor");

  function renderQuestion(){
    editor.innerHTML=`
      <h3 class="text-sm font-bold">Вопрос ${idx+1}/${questions.length}</h3>
      <p class="text-xs text-gray-400">${questions[idx]}</p>
      <textarea id="stage3Answer" class="w-full p-2 bg-gray-800 text-xs text-gray-300 h-24"></textarea>
      <div class="flex gap-2 mt-2">
        <button id="prevQ" ${idx===0?'disabled':''} class="px-3 py-1 bg-gray-700 text-xs">Назад</button>
        <button id="skipQ" class="px-3 py-1 bg-gray-700 text-xs">Пропустить</button>
        <button id="nextQ" class="px-3 py-1 bg-blue-600 text-white text-xs">Ответить</button>
      </div>`;
    editor.querySelector('#prevQ').onclick=()=>{idx--;renderQuestion();};
    editor.querySelector('#skipQ').onclick=()=>{answers[idx]='';if(++idx>=questions.length)finish();else renderQuestion();};
    editor.querySelector('#nextQ').onclick=()=>{
      const v=editor.querySelector('#stage3Answer').value.trim();
      if(!v&&!confirm("Пусто. Пропустить?")) return;
      answers[idx]=v;if(++idx>=questions.length)finish();else renderQuestion();
    };
  }

  async function finish(){
    const newSkills=await analyzeSkillsFromAnswers(answers);
    for(const s of newSkills){
      if(!s.name) continue;
      const skill={...s,xp:s.xp||1,lastUsed:new Date().toISOString()};
      addOrUpdateSkill(character,skill); applyProgression(character,skill);
    }
    saveCharacter(character);
    if(window.refreshSkills) window.refreshSkills();
    if(window.refreshStats) window.refreshStats();
    editor.classList.add("hidden");
    alert("Стартовые навыки созданы!");
  }

  renderQuestion();
}
