import { loadCharacter, saveCharacter } from './character.js';
import { applyProgression } from './progression.js';

const ALL_ATTRIBUTES = ["сила", "ловкость", "интеллект", "харизма", "воля", "дух", "мудрость", "энергия"];

const skillAttributeMap = {
  'Готовка': ['интеллект', 'ловкость', 'воля', 'энергия'],
  'Отжимания': ['сила', 'воля', 'энергия', 'ловкость'],
  'Посещение бани': ['дух', 'энергия', 'воля'],
  'Программирование': ['интеллект', 'мудрость', 'воля', 'энергия'],
  'Бег': ['ловкость', 'сила', 'энергия', 'воля'],
  'Езда на велосипеде': ['ловкость', 'сила', 'энергия', 'воля'],
  'Игра на компьютере': ['ловкость', 'энергия', 'воля', 'дух'],
  'Игра на гитаре': ['ловкость', 'воля', 'энергия'],
  'Кулинария': ['интеллект', 'ловкость', 'воля', 'энергия'],
  'Музыка': ['ловкость', 'воля', 'энергия'],
  'Физическая подготовка': ['сила', 'ловкость', 'энергия', 'воля'],
  'Физическая активность': ['сила', 'ловкость', 'энергия', 'воля'],
  'Мультизадачность': ['интеллект', 'мудрость', 'воля', 'энергия']
};

/**
 * Сколько XP нужно для перехода с уровня `level` на следующий
 */
function xpForNextLevel(level) {
  const xp = (level + 1) * 10;
  console.log(`📊 XP для перехода с уровня ${level} → ${level + 1}: ${xp}`);
  return xp;
}

/**
 * Вычисляет уровень по суммарному XP (возвращает только число!)
 */
function levelFromXP(xp) {
  if (xp <= 0) return 0;
  let remainingXp = xp;
  let level = 0;
  while (remainingXp >= (level + 1) * 10) {
    remainingXp -= (level + 1) * 10;
    level++;
  }
  return level;
}

/**
 * Возвращает подробные данные для UI: уровень, остаток XP и сколько нужно до следующего
 */
function xpDetails(xp) {
  let totalXp = xp;
  let level = 0;
  let needed = 10;

  while (totalXp >= needed) {
    totalXp -= needed;
    level++;
    needed = (level + 1) * 10;
  }

  console.log(`[📊] xpDetails → уровень ${level}, остаток ${totalXp}, нужно ${needed}`);
  return { level, remainder: totalXp, needed };
}

/**
 * Возвращает все навыки (с учётом "забывания")
 */
function getAllSkills() {
  const character = loadCharacter();
  if (!character) {
    console.warn("⚠️ Персонаж не загружен → возвращаем пустой список навыков");
    return [];
  }
  if (!character.skills) character.skills = [];

  // Инициализация характеристик
  if (!character.attributes || typeof character.attributes !== 'object') {
    character.attributes = Object.fromEntries(ALL_ATTRIBUTES.map(attr => [attr, { xp: 0, level: 0 }]));
  }

  const now = Date.now();
  character.skills = character.skills.map(skill => {
    if (skill.lastUsed) {
      const last = new Date(skill.lastUsed).getTime();
      const daysPassed = (now - last) / (1000 * 60 * 60 * 24);
      const weeks = Math.floor(daysPassed / 7);
      if (weeks > 0) {
        skill.xp = Math.max(0, skill.xp - weeks);
        console.log(`[🧠] Навык "${skill.name}" потерял ${weeks} XP за неиспользование`);
      }
    }
    skill.level = levelFromXP(skill.xp || 0);
    return skill;
  });

  saveCharacter(character);
  console.log("[📘] Все навыки:", character.skills.map(s => ({ name: s.name, xp: s.xp, lvl: s.level })));
  return character.skills;
}

/**
 * Обновляет или добавляет навык
 */
function addOrUpdateSkill(character, {
  name,
  xp = 1,
  description = '',
  attributes = [],
  attribute = null,
  parent = null,
  emoji = '🌟'
}) {
  if (!character || !name) {
    console.warn("⚠️ Некорректные данные для добавления/обновления навыка", { name, xp });
    return;
  }

  if (!character.attributes || typeof character.attributes !== 'object') {
    character.attributes = Object.fromEntries(ALL_ATTRIBUTES.map(attr => [attr, { xp: 0, level: 0 }]));
  }

  const validAttributes = skillAttributeMap[name.trim()] ||
    (Array.isArray(attributes) ? attributes.filter(attr => ALL_ATTRIBUTES.includes(attr)).slice(0, 4) : ['ловкость', 'энергия']);

  character.skills = character.skills || [];
  const nowIso = new Date().toISOString();

  let skill = character.skills.find(s => s.name.trim().toLowerCase() === name.trim().toLowerCase());
  let previousLevel = skill ? skill.level : 0;

  if (skill) {
    skill.xp = (skill.xp || 0) + xp;
    skill.lastUsed = nowIso;
    skill.description = skill.description || description;
    skill.attributes = validAttributes;
    skill.attribute = parent ? (attribute || null) : null;
    skill.parent = parent || null;
    skill.emoji = emoji || skill.emoji || '🌟';
    console.log(`[⚙️] Навык "${skill.name}" обновлён: +${xp} XP (итого ${skill.xp})`);
  } else {
    skill = {
      name: name.trim(),
      description: description.trim(),
      attributes: validAttributes,
      attribute: parent ? (attribute || null) : null,
      parent: parent || null,
      xp,
      level: 0,
      lastUsed: nowIso,
      emoji: emoji || '🌟'
    };
    character.skills.push(skill);
    console.log(`[🆕] Новый навык "${skill.name}" создан: ${xp} XP`);
  }

  skill.level = levelFromXP(skill.xp);
  if (skill.level > previousLevel) {
    console.log(`[🆙] Навык "${skill.name}" повысил уровень → ${skill.level}`);
    applyProgression(character, skill); // при апе передаём прогресс дальше
  }

  saveCharacter(character);
}

/**
 * Массовая установка навыков
 */
function setSkills(skillsList = []) {
  const character = loadCharacter();
  if (!character) return;

  if (!character.attributes || typeof character.attributes !== 'object') {
    character.attributes = Object.fromEntries(ALL_ATTRIBUTES.map(attr => [attr, { xp: 0, level: 0 }]));
  }

  const nowIso = new Date().toISOString();
  const seenSkills = new Set();
  const newSkills = [];

  for (const newSkill of skillsList) {
    const name = newSkill.name?.trim();
    if (!name || seenSkills.has(name.toLowerCase())) continue;
    seenSkills.add(name.toLowerCase());

    const validAttributes = skillAttributeMap[name] ||
      (Array.isArray(newSkill.attributes) ? newSkill.attributes.filter(attr => ALL_ATTRIBUTES.includes(attr)).slice(0, 4) : ['ловкость', 'энергия']);

    let existing = character.skills.find(s => s.name.toLowerCase() === name.toLowerCase());
    let previousLevel = existing ? existing.level : 0;

    if (existing) {
      existing.xp = (existing.xp || 0) + (newSkill.xp || 0);
      existing.description = existing.description || newSkill.description || '';
      existing.attributes = validAttributes;
      existing.attribute = newSkill.parent ? (newSkill.attribute || null) : null;
      existing.parent = newSkill.parent || null;
      existing.level = levelFromXP(existing.xp);
      existing.lastUsed = nowIso;
      existing.emoji = newSkill.emoji || existing.emoji || '🌟';
      newSkills.push(existing);

      if (existing.level > previousLevel) {
        console.log(`[🆙] Навык "${name}" повысил уровень → ${existing.level}`);
        applyProgression(character, existing);
      }
    } else {
      const skill = {
        name,
        description: newSkill.description || '',
        attributes: validAttributes,
        attribute: newSkill.parent ? (newSkill.attribute || null) : null,
        parent: newSkill.parent || null,
        xp: newSkill.xp || 0,
        level: levelFromXP(newSkill.xp || 0),
        lastUsed: nowIso,
        emoji: newSkill.emoji || '🌟'
      };
      newSkills.push(skill);
    }
  }

  character.skills = newSkills;
  saveCharacter(character);

  if (typeof window.refreshSkills === 'function') {
    window.refreshSkills();
  }
}

/**
 * Получить навык по имени
 */
function getSkillByName(name) {
  const character = loadCharacter();
  if (!character) return null;
  return character.skills?.find(s => s.name.trim().toLowerCase() === name.trim().toLowerCase()) || null;
}

/**
 * Очистить все навыки
 */
function clearSkills() {
  const character = loadCharacter();
  if (!character) return;
  character.skills = [];
  saveCharacter(character);
  if (typeof window.refreshSkills === 'function') {
    window.refreshSkills();
  }
}

export {
  getAllSkills,
  addOrUpdateSkill,
  setSkills,
  getSkillByName,
  clearSkills,
  levelFromXP,
  xpForNextLevel,
  xpDetails
};
