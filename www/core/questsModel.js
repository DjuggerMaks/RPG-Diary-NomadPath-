// core/questsModel.js
import { loadCharacter, saveCharacter } from './character.js';

function getAllQuests() {
  const character = loadCharacter();
  return character?.quests || [];
}

function addQuest({ title, type = "quest", description = "", xp = 10 }) {
  const character = loadCharacter();
  if (!character) return;

  const newQuest = {
    id: Date.now(),
    title,
    type,               // "quest" или "habit"
    description,
    xp,
    completed: false,
    createdAt: new Date().toISOString()
  };

  character.quests.push(newQuest);
  saveCharacter(character);
}

function completeQuest(id) {
  const character = loadCharacter();
  if (!character) return;

  const quest = character.quests.find(q => q.id === id);
  if (quest && !quest.completed) {
    quest.completed = true;
    character.xp += quest.xp;
    saveCharacter(character);
  }
}

function removeQuest(id) {
  const character = loadCharacter();
  if (!character) return;

  character.quests = character.quests.filter(q => q.id !== id);
  saveCharacter(character);
}

export {
  getAllQuests,
  addQuest,
  completeQuest,
  removeQuest
};
