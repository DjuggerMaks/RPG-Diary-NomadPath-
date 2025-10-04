import { convertSkillsToGraph } from './progression.js';
import { showNotification } from '../ui/app.js';
import { levelFromXP } from './skillsModel.js';
import { addOrUpdateSkill } from './skillsModel.js';

const STORAGE_KEY = 'nomadpath_character';
const isDebug = true; // Управление логированием

function log(...args) {
  if (isDebug) console.log('[📁]', ...args);
}

const defaultCharacter = {
  name: 'Безымянный',
  avatar: null,
  generatedDescription: '',
  level: 0,
  xp: 0,
  attributes: {
    сила: { xp: 0, level: 0 },
    ловкость: { xp: 0, level: 0 },
    интеллект: { xp: 0, level: 0 },
    харизма: { xp: 0, level: 0 },
    воля: { xp: 0, level: 0 },
    дух: { xp: 0, level: 0 },
    мудрость: { xp: 0, level: 0 },
    энергия: { xp: 0, level: 0 }
  },
  attributeXP: {},
  skills: [],
  skillGraph: { nodes: [], links: [] },
  habits: [],
  quests: [],
  chronicle: [],
  journal: [],
  fitnessActivities: []
};

function loadCharacter() {
  log('Загрузка персонажа из localStorage, ключ:', STORAGE_KEY);
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    log('Нет данных в localStorage, возвращаем null');
    return null;
  }

  try {
    log('Сырые данные из localStorage:', raw);
    const parsed = JSON.parse(raw);
    log('Распарсенные данные:', JSON.stringify(parsed, null, 2));

    // Аккуратная валидация (дополняем, а не перезаписываем)
    parsed.name = parsed.name || defaultCharacter.name;
    parsed.avatar = parsed.avatar || defaultCharacter.avatar;
    parsed.generatedDescription = parsed.generatedDescription || '';
    parsed.level = parsed.level ?? 0;
    parsed.xp = parsed.xp ?? 0;

    parsed.attributes = parsed.attributes || structuredClone(defaultCharacter.attributes);
    for (const attr in defaultCharacter.attributes) {
      if (!parsed.attributes[attr]) {
        parsed.attributes[attr] = { xp: 0, level: 0 };
      } else if (typeof parsed.attributes[attr] === 'number') {
        // Старый формат (число XP вместо объекта)
        const xp = parsed.attributes[attr];
        parsed.attributes[attr] = { xp, level: levelFromXP(xp) };
      }
    }

    parsed.skills = Array.isArray(parsed.skills) ? parsed.skills : [];
    parsed.skills = parsed.skills.map(skill => ({
      ...skill,
      xp: typeof skill.xp === 'number' ? skill.xp : 0,
      level: typeof skill.level === 'number' ? skill.level : levelFromXP(skill.xp || 0),
      emoji: skill.emoji || '🌟',
      attributes: Array.isArray(skill.attributes) ? skill.attributes : ['ловкость', 'энергия'],
      lastUsed: skill.lastUsed || new Date().toISOString()
    }));

    parsed.skillGraph = parsed.skillGraph || { nodes: [], links: [] };
    parsed.habits = Array.isArray(parsed.habits) ? parsed.habits : [];
    parsed.quests = Array.isArray(parsed.quests) ? parsed.quests : [];
    parsed.chronicle = Array.isArray(parsed.chronicle) ? parsed.chronicle : [];
    parsed.journal = Array.isArray(parsed.journal) ? parsed.journal : [];
    parsed.fitnessActivities = Array.isArray(parsed.fitnessActivities) ? parsed.fitnessActivities : [];

    log('После валидации персонаж:', JSON.stringify(parsed, null, 2));
    return parsed;
  } catch (e) {
    log('Ошибка парсинга данных персонажа:', e.message);
    showNotification('Ошибка загрузки персонажа', 'error');
    return null;
  }
}

function saveCharacter(character) {
  if (!character) {
    log('Нельзя сохранить пустого персонажа');
    showNotification('Ошибка: пустой персонаж', 'error');
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(character));
    log('Персонаж сохранён в localStorage');
  } catch (e) {
    log('Ошибка сохранения персонажа:', e.message);
    showNotification('Ошибка сохранения персонажа', 'error');
  }
}

function resetCharacter() {
  log('Сброс персонажа');
  try {
    localStorage.removeItem(STORAGE_KEY);
    log('Данные персонажа удалены');
  } catch (e) {
    log('Ошибка при сбросе персонажа:', e.message);
    showNotification('Ошибка сброса персонажа', 'error');
  }
}

function createCharacterFromInit({ name, avatar, description }) {
  const character = structuredClone(defaultCharacter);
  character.name = name || defaultCharacter.name;
  character.avatar = avatar || defaultCharacter.avatar;
  character.generatedDescription = description || defaultCharacter.generatedDescription;
  saveCharacter(character);
  log('Создан новый персонаж:', JSON.stringify(character, null, 2));
  return character;
}

/**
 * Старый метод addSkill → теперь обёртка над addOrUpdateSkill
 */
function addSkill(character, skillData) {
  log('addSkill (обёртка) → перенаправляем в addOrUpdateSkill');
  return addOrUpdateSkill(character, skillData);
}

/**
 * Старый метод addXP → теперь вызывает addOrUpdateSkill с XP
 */
function addXP(character, skillName, xp) {
  log(`addXP (обёртка) → добавляем ${xp} XP в навык "${skillName}"`);
  return addOrUpdateSkill(character, { name: skillName, xp });
}

export {
  loadCharacter,
  saveCharacter,
  resetCharacter,
  createCharacterFromInit,
  addSkill,
  addXP
};
