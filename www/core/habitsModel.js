// core/habitsModel.js
import { loadCharacter, saveCharacter } from './character.js';

function ensureHabits() {
  const c = loadCharacter();
  if (!c.habits) {
    c.habits = [];
    saveCharacter(c);
  }
  return c.habits;
}

function getAllHabits() {
  return ensureHabits();
}

function addHabit({ name, good = true }) {
  const character = loadCharacter();
  const now = new Date().toISOString().slice(0, 10);
  character.habits.push({
    name,
    good,
    created: now,
    streak: 0,
    days: [],      // даты в формате YYYY-MM-DD
    lastMarked: null
  });
  saveCharacter(character);
}

function markHabit(name) {
  const character = loadCharacter();
  const today = new Date().toISOString().slice(0, 10);
  const h = character.habits.find(h => h.name === name);
  if (!h) return;

  if (!h.days.includes(today)) {
    h.days.push(today);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (h.lastMarked === yesterday) {
      h.streak++;
    } else {
      h.streak = 1;
    }
    h.lastMarked = today;
    saveCharacter(character);
  }
}

function clearHabits() {
  const character = loadCharacter();
  character.habits = [];
  saveCharacter(character);
}

export {
  getAllHabits,
  addHabit,
  markHabit,
  clearHabits
};
