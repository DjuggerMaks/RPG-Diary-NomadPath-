import { levelFromXP, xpForNextLevel } from './skillsModel.js';
import { saveCharacter } from './character.js';

/**
 * Конвертирует навыки в граф для D3.js паутины
 */
function convertSkillsToGraph(skills, existingGraph = { nodes: [], links: [] }) {
  const ALL_ATTRIBUTES = ["сила", "ловкость", "интеллект", "харизма", "воля", "дух", "мудрость", "энергия"];

  // helper: безопасно получить id узла (строка или объект)
  const getId = (v) => (v && typeof v === 'object' ? v.id : v);

  // Сохраняем позиции узлов
  const savedPositions = (existingGraph.nodes || []).reduce((acc, node) => {
    const id = getId(node.id ?? node);
    acc[id] = {
      x: node.x, y: node.y, fx: node.fx, fy: node.fy,
      type: node.type, xp: node.xp, level: node.level, emoji: node.emoji
    };
    return acc;
  }, {});

  const nodes = [
    ...ALL_ATTRIBUTES.map(attr => ({
      id: attr,
      type: "stat",
      ...savedPositions[attr]
    })),
    ...skills.map(skill => ({
      id: skill.name,
      type: "skill",
      xp: skill.xp || 0,
      level: skill.level || 0,
      emoji: skill.emoji || '🌟',
      ...savedPositions[skill.name]
    }))
  ];

  // Пересоздаём связи (оставляем только валидные и существующие)
  const existingLinks = (existingGraph.links || []).filter(link => {
    const s = getId(link.source);
    const t = getId(link.target);
    return skills.some(skill => skill.name === s) && ALL_ATTRIBUTES.includes(t);
  });

  const newLinks = skills.flatMap(skill =>
    (skill.attributes || []).map(attr => ({
      source: skill.name,
      target: attr,
      value: (skill.xp || 1) / 2
    }))
  );

  const links = [
    ...existingLinks,
    ...newLinks.filter(nl => !existingLinks.some(el => getId(el.source) === nl.source && getId(el.target) === nl.target))
  ];

  return { nodes, links };
}

/**
 * Считает суммарное XP до указанного уровня
 */
function totalXpBeforeLevel(level) {
  let sum = 0;
  for (let i = 0; i < level; i++) {
    sum += xpForNextLevel(i);
  }
  return sum;
}

/**
 * Обновляет уровни характеристик на основе XP
 */
function applyAttributeProgress(character) {
  if (!character || !character.attributes) return 0;

  let lvlUps = 0;
  for (const [name, attr] of Object.entries(character.attributes)) {
    if (!attr || typeof attr.xp !== 'number') continue;

    const prevLevel = attr.level || 0;
    const newLevel = levelFromXP(attr.xp) || 0;

    if (newLevel !== prevLevel) {
      attr.level = newLevel;
      if (newLevel > prevLevel) lvlUps += (newLevel - prevLevel);
    }
  }
  return lvlUps;
}

/**
 * Применяет глобальный уровень
 * Общий уровень = floor(сумма уровней атрибутов / 10)
 */
function applyGlobalXP(character) {
  if (!character) return;

  const totalAttributeLevels = Object.values(character.attributes || {})
    .reduce((sum, attr) => sum + (attr.level || 0), 0);

  character.level = Math.floor(totalAttributeLevels / 10); // целый «глобальный» уровень
  character.globalProgress = totalAttributeLevels % 10;     // прогресс к след. глоб. уровню
  character.globalRequired = 10;                            // нужно 10 очков атрибутов
}

/**
 * Выдать очки в связанные характеристики ЗА ПОВЫШЕННЫЕ УРОВНИ навыка.
 * ВНИМАНИЕ: ЗДЕСЬ НЕ ДОБАВЛЯЕМ XP К НАВЫКУ! Только раздаём бонусы за апы.
 */
function awardAttributesForSkillLevelUps(character, skill) {
  if (!character || !skill || !Array.isArray(skill.attributes)) return;

  // инициализируем маркер «до какого уровня уже награждали»
  if (typeof skill.awardedLevel !== 'number') {
    // при первом появлении навыка награды за прошлые уровни не выдаём
    skill.awardedLevel = skill.level || 0;
    return;
  }

  const currentLevel = skill.level || 0;
  const alreadyAwarded = skill.awardedLevel || 0;

  if (currentLevel > alreadyAwarded) {
    const diff = currentLevel - alreadyAwarded;
    // за каждый новый уровень → +1 XP в каждую характеристику
    for (const attr of skill.attributes) {
      if (!character.attributes[attr]) {
        character.attributes[attr] = { xp: 0, level: 0 };
      }
      character.attributes[attr].xp += diff;
    }
    // обновляем маркер
    skill.awardedLevel = currentLevel;
  }
}

/**
 * Применяет прогресс по всем навыкам:
 *  - НЕ добавляет XP к навыкам,
 *  - выдаёт атрибутам очки только за новые уровни навыков (через awardedLevel),
 *  - пересобирает граф,
 *  - обновляет уровни атрибутов и глобальный уровень.
 */
function applyProgression(character, changedSkill = null) {
  if (!character) return null;

  // 1) у всех навыков уровень уже должен быть пересчитан снаружи (после addOrUpdateSkill)
  //    здесь только раздача бонусов атрибутам за НОВЫЕ уровни
  if (changedSkill) {
    // точечно по изменённому навыку
    const s = character.skills.find(x => x.name?.toLowerCase() === changedSkill.name?.toLowerCase());
    if (s) awardAttributesForSkillLevelUps(character, s);
  } else {
    // или по всем (если нужно массово синхронизировать)
    for (const s of (character.skills || [])) {
      awardAttributesForSkillLevelUps(character, s);
    }
  }

  // 2) граф навыков
  character.skillGraph = convertSkillsToGraph(character.skills || [], character.skillGraph || { nodes: [], links: [] });

  // 3) атрибуты и глобальный уровень
  applyAttributeProgress(character);
  applyGlobalXP(character);

  saveCharacter(character);
  return character;
}

/**
 * Применяет правила прогресса (для атрибутов и глобального уровня)
 * Полезно вызывать после правок XP атрибутов напрямую.
 */
function applyProgressionRules(character) {
  if (!character) return;
  applyAttributeProgress(character);
  applyGlobalXP(character);
  saveCharacter(character);
}

export {
  applyProgression,
  applyProgressionRules,
  convertSkillsToGraph,
  xpForNextLevel,
  totalXpBeforeLevel
};
