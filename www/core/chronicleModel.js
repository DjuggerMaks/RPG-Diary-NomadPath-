// core/chronicleModel.js

import { loadCharacter, saveCharacter } from './character.js';

/**
 * Возвращает массив всех художественных записей летописи.
 * @returns {string[]}
 */
function getChronicle() {
  const character = loadCharacter();
  character.chronicle = character.chronicle || [];
  return character.chronicle;
}

/**
 * Добавляет новый абзац или сцену в летопись.
 * @param {string} entry — художественный текст
 */
function addToChronicle(entry) {
  if (!entry || typeof entry !== 'string') return;
  const character = loadCharacter();
  character.chronicle = character.chronicle || [];
  character.chronicle.push(entry.trim());
  saveCharacter(character);
}

/**
 * Полностью очищает все записи летописи.
 */
function clearChronicle() {
  // 🔥 гарантированно стираем всё
  const character = loadCharacter();
  const cleared = { ...character, chronicle: [] };
  saveCharacter(cleared); // ✅ сохраняем модифицированную копию
}

/**
 * Объединяет все записи летописи в обратном порядке — новые сверху.
 * @returns {string}
 */
function getChronicleText() {
  return getChronicle().slice().reverse().join('\n\n');
}

export {
  getChronicle,
  addToChronicle,
  clearChronicle,
  getChronicleText
};
