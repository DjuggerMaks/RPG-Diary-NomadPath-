/**
 * Сколько XP нужно для перехода на следующий уровень.
 * Пример: уровень 0 → 10 XP, уровень 1 → 20 XP и т.д.
 */
function getXpThreshold(level) {
  return (level + 1) * 10;
}

/**
 * Получить уровень по текущему XP
 */
function levelFromXP(xp = 0) {
  let level = 0;
  let threshold = getXpThreshold(level);

  while (xp >= threshold) {
    xp -= threshold;
    level++;
    threshold = getXpThreshold(level);
  }

  return level;
}

export {
  getXpThreshold,
  levelFromXP
};
