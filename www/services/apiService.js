import { getOpenAIKey } from './apiKeyManager.js';
import { showNotification } from '../ui/app.js';

const isDebug = true; // Управление логированием

function log(...args) {
  if (isDebug) console.log('[🤖]', ...args);
}

/**
 * Отправляет запрос к OpenAI API.
 * @param {Array} messages - Массив сообщений для GPT.
 * @param {string} apiKey - API-ключ.
 * @returns {string} Ответ GPT или "[пустой ответ]".
 */
async function requestGPT(messages, apiKey) {
  log('Отправка запроса в GPT:', JSON.stringify(messages, null, 2));
  const body = {
    model: 'gpt-3.5-turbo',
    messages,
    temperature: 0.6
  };

  try {
    log('Формируем запрос: model=gpt-3.5-turbo, temperature=0.6');
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    log('Ответ сервера получен, статус:', res.status);
    if (!res.ok) {
      throw new Error(`HTTP ошибка: ${res.status} ${res.statusText}`);
    }

    const json = await res.json();
    log('Получен JSON от GPT:', JSON.stringify(json, null, 2));
    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      log('GPT вернул пустой ответ:', JSON.stringify(json, null, 2));
      showNotification('GPT вернул пустой ответ', 'error');
      return '[пустой ответ]';
    }
    log('Ответ от GPT:', content);
    return content;
  } catch (error) {
    log('Ошибка запроса к GPT:', error.message, error.stack);
    showNotification('Ошибка запроса к GPT', 'error');
    throw error;
  }
}

/**
 * Создаёт описание аватара на основе ответов.
 * @param {Array} answers - Ответы пользователя.
 * @returns {string} Описание аватара.
 */
async function sendAvatarRequest(answers) {
  log('Запрос на создание описания аватара, ответы:', JSON.stringify(answers, null, 2));
  const apiKey = getOpenAIKey();
  if (!apiKey) {
    log('Нет API-ключа для sendAvatarRequest');
    showNotification('Нет API-ключа', 'error');
    throw new Error('Нет API-ключа.');
  }

  const messages = [
    {
      role: 'system',
      content: 'Ты создаёшь образ RPG-персонажа. Верни краткое красивое описание его внешности (1-2 предложения). Без обращения к пользователю, только текст.'
    },
    {
      role: 'user',
      content: `Ответы:\n${answers.map((a, i) => `[${i + 1}] ${a}`).join('\n')}`
    }
  ];

  log('Сообщения для GPT (sendAvatarRequest):', JSON.stringify(messages, null, 2));
  const result = await requestGPT(messages, apiKey);
  log('Результат sendAvatarRequest:', result);
  return result;
}

/**
 * Оценивает ответ для атрибута персонажа.
 * @param {string} attribute - Название атрибута.
 * @param {string} answer - Ответ пользователя.
 * @returns {number} Оценка в XP (10, 30, 60, 100, 150).
 */
async function scoreAttributeAnswer(attribute, answer) {
  log('Оценка атрибута:', attribute, 'Ответ:', answer);
  const apiKey = getOpenAIKey();
  if (!apiKey) {
    log('Нет API-ключа для scoreAttributeAnswer');
    showNotification('Нет API-ключа', 'error');
    throw new Error('Нет API-ключа.');
  }

  const messages = [
    {
      role: 'system',
      content: `Ты оцениваешь ответы пользователя для создания RPG-персонажа. Верни число XP (10, 30, 60, 100, 150), где:
- 10 XP: качество "${attribute}" слабо выражено (уровень 1).
- 30 XP: качество "${attribute}" умеренно выражено (уровень 2).
- 60 XP: качество "${attribute}" хорошо выражено (уровень 3).
- 100 XP: качество "${attribute}" сильно выражено (уровень 4).
- 150 XP: качество "${attribute}" исключительно выражено (уровень 5).
Сумма XP для всех характеристик не должна превышать 300. Верни ТОЛЬКО число (10, 30, 60, 100, 150).`
    },
    {
      role: 'user',
      content: `Атрибут: ${attribute}\nОтвет: ${answer}`
    }
  ];

  log('Сообщения для GPT (scoreAttributeAnswer):', JSON.stringify(messages, null, 2));
  const raw = await requestGPT(messages, apiKey);
  log('Сырой ответ GPT для scoreAttributeAnswer:', raw);
  const xp = parseInt(raw.trim());

  if (isNaN(xp) || ![10, 30, 60, 100, 150].includes(xp)) {
    log('Некорректное значение XP от GPT:', raw, 'Возвращаем 10 XP по умолчанию');
    showNotification('Некорректное значение XP от GPT', 'error');
    return 10; // Минимальный XP по умолчанию
  }

  log(`Назначен XP для атрибута "${attribute}": ${xp}`);
  return xp;
}

/**
 * Анализирует ответы для создания начальных навыков.
 * @param {Array} answers - Ответы пользователя.
 * @returns {Array} Массив навыков.
 */
async function analyzeSkillsFromAnswers(answers) {
  log('Анализ ответов для создания навыков:', JSON.stringify(answers, null, 2));
  const apiKey = getOpenAIKey();
  if (!apiKey) {
    log('Нет API-ключа для analyzeSkillsFromAnswers');
    showNotification('Нет API-ключа', 'error');
    throw new Error('Нет API-ключа.');
  }

  const messages = [
    {
      role: 'system',
      content: `Ты — помощник по созданию RPG-персонажа. Проанализируй ответы пользователя и предложи 1-3 начальных навыка. Верни ТОЛЬКО JSON-массив объектов с полями:
- name: название навыка
- description: краткое описание
- xp: начальный XP (1-5)
- attributes: массив из 2-4 атрибутов (из списка: ловкость, энергия, воля, интеллект, мудрость, харизма, сила, дух)
- emoji: подходящий эмодзи

Пример:
[
  {
    "name": "Программирование",
    "description": "Написание кода",
    "xp": 3,
    "attributes": ["интеллект", "мудрость", "воля", "дух"],
    "emoji": "💻"
  }
]`
    },
    {
      role: 'user',
      content: `Ответы:\n${answers.map((a, i) => `[${i + 1}] ${a}`).join('\n')}`
    }
  ];

  log('Сообщения для GPT (analyzeSkillsFromAnswers):', JSON.stringify(messages, null, 2));
  const raw = await requestGPT(messages, apiKey);
  log('GPT ответ (анализ навыков):', raw);

  try {
    const match = raw.match(/\[\s*\{[\s\S]*?\}\s*(?:,\s*\{[\s\S]*?\}\s*)*\]/);
    if (!match) throw new Error('JSON-массив не найден.');
    log('Найден JSON-массив:', match[0]);
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) throw new Error('Ответ не является массивом.');
    log('Распарсенные данные:', JSON.stringify(parsed, null, 2));
    const validated = parsed.map(skill => ({
      name: skill.name || 'Неизвестный навык',
      description: skill.description || 'Без описания',
      xp: Math.max(1, Math.min(5, parseInt(skill.xp) || 1)),
      attributes: Array.isArray(skill.attributes) && skill.attributes.length >= 2 && skill.attributes.length <= 4
        ? skill.attributes.filter(attr => ['ловкость', 'энергия', 'воля', 'интеллект', 'мудрость', 'харизма', 'сила', 'дух'].includes(attr))
        : ['ловкость', 'энергия', 'воля', 'дух'],
      emoji: skill.emoji || '🌟'
    }));
    log('Валидированные навыки:', JSON.stringify(validated, null, 2));
    return validated;
  } catch (e) {
    log('Ошибка парсинга навыков:', e.message, e.stack, 'Ответ GPT:', raw);
    showNotification('Ошибка парсинга навыков', 'error');
    const fallbackSkills = [];
    const lowerText = answers.join(' ').toLowerCase();
    log('Текст для fallback анализа:', lowerText);
    if (lowerText.includes('бег') || lowerText.includes('пробежал')) {
      fallbackSkills.push({
        name: 'Бег',
        description: 'Бег на дистанцию',
        xp: 1,
        attributes: ['ловкость', 'энергия', 'воля', 'дух'],
        emoji: '🏃'
      });
    }
    if (lowerText.includes('велосипед') || lowerText.includes('прокатился')) {
      fallbackSkills.push({
        name: 'Езда на велосипеде',
        description: 'Езда на велосипеде',
        xp: 1,
        attributes: ['ловкость', 'энергия', 'воля', 'дух'],
        emoji: '🚴'
      });
    }
    log('Fallback навыки:', JSON.stringify(fallbackSkills, null, 2));
    return fallbackSkills;
  }
}

/**
 * Анализирует текст дневника для навыков и летописи.
 * @param {string} text - Текст дневника.
 * @returns {Object} Объект с навыками и летописью.
 */
async function analyzeEntry(text) {
  log('Анализируем текст дневника:', text);
  const apiKey = getOpenAIKey();
  if (!apiKey) {
    log('Нет API-ключа для analyzeEntry');
    showNotification('Нет API-ключа', 'error');
    throw new Error('Нет API-ключа.');
  }

  const messages = [
    {
      role: 'system',
      content: `Ты — помощник по анализу дневника в RPG-приложении. Проанализируй текст и выдели навыки (1-3) и художественную запись для летописи. Верни ТОЛЬКО JSON-объект с полями:
- skills: массив объектов с полями:
  - name: название навыка
  - description: краткое описание
  - xp: XP (1-5)
  - attributes: массив из 2-4 атрибутов (из списка: ловкость, энергия, воля, интеллект, мудрость, харизма, сила, дух)
  - emoji: подходящий эмодзи
- newChronicle: строка для летописи (1-2 предложения, художественный стиль)

Пример:
{
  "skills": [
    {
      "name": "Бег",
      "description": "Бег на дистанцию",
      "xp": 2,
      "attributes": ["ловкость", "энергия", "воля", "дух"],
      "emoji": "🏃"
    }
  ],
  "newChronicle": "Герой пробежал через леса, укрепляя дух и тело."
}`
    },
    {
      role: 'user',
      content: `Текст:\n"""${text}"""`
    }
  ];

  log('Сообщения для GPT (analyzeEntry):', JSON.stringify(messages, null, 2));
  const raw = await requestGPT(messages, apiKey);
  log('GPT ответ (анализ дневника):', raw);

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.skills)) throw new Error('Skills не является массивом.');
    log('Распарсенные данные:', JSON.stringify(parsed, null, 2));
    const validated = {
      skills: parsed.skills.map(skill => ({
        name: skill.name || 'Неизвестный навык',
        description: skill.description || 'Без описания',
        xp: Math.max(1, Math.min(5, parseInt(skill.xp) || 1)),
        attributes: Array.isArray(skill.attributes) && skill.attributes.length >= 2 && skill.attributes.length <= 4
          ? skill.attributes.filter(attr => ['ловкость', 'энергия', 'воля', 'интеллект', 'мудрость', 'харизма', 'сила', 'дух'].includes(attr))
          : ['ловкость', 'энергия', 'воля', 'дух'],
        emoji: skill.emoji || '🌟'
      })),
      newChronicle: typeof parsed.newChronicle === 'string' ? parsed.newChronicle.trim() : text
    };
    log('Валидированные данные:', JSON.stringify(validated, null, 2));
    return validated;
  } catch (e) {
    log('Ошибка парсинга дневника:', e.message, e.stack, 'Ответ GPT:', raw);
    showNotification('Ошибка парсинга дневника', 'error');
    const fallbackSkills = [];
    const lowerText = text.toLowerCase();
    log('Текст для fallback анализа:', lowerText);
    if (lowerText.includes('бег') || lowerText.includes('пробежал')) {
      fallbackSkills.push({
        name: 'Бег',
        description: 'Бег на дистанцию',
        xp: 1,
        attributes: ['ловкость', 'энергия', 'воля', 'дух'],
        emoji: '🏃'
      });
    }
    if (lowerText.includes('велосипед') || lowerText.includes('прокатился')) {
      fallbackSkills.push({
        name: 'Езда на велосипеде',
        description: 'Езда на велосипеде',
        xp: 1,
        attributes: ['ловкость', 'энергия', 'воля', 'дух'],
        emoji: '🚴'
      });
    }
    if (lowerText.includes('отжался') || lowerText.includes('отжимания')) {
      fallbackSkills.push({
        name: 'Отжимания',
        description: 'Силовые упражнения для верхней части тела',
        xp: 1,
        attributes: ['сила', 'энергия', 'воля', 'дух'],
        emoji: '💪'
      });
    }
    log('Fallback навыки:', JSON.stringify(fallbackSkills, null, 2));
    return {
      skills: fallbackSkills,
      newChronicle: text
    };
  }
}

/**
 * Анализирует спортивные активности в тексте дневника.
 * @param {string} text - Текст дневника.
 * @returns {Object} Объект с массивом активностей.
 */
async function analyzeSportEntry(text) {
  log('Анализируем спортивные активности в тексте:', text);
  const apiKey = getOpenAIKey();
  if (!apiKey) {
    log('Нет API-ключа для analyzeSportEntry');
    showNotification('Нет API-ключа', 'error');
    throw new Error('Нет API-ключа.');
  }

  const messages = [
    {
      role: 'system',
      content: `Ты — помощник по анализу спортивных активностей в RPG-дневнике. Проанализируй текст и выдели спортивные активности (например, отжимания, бег, плавание, йога, езда на велосипеде). Верни ТОЛЬКО JSON-массив объектов с полями:
- name: название активности (например, "Отжимания", "Бег")
- count: число повторений или дистанция (если указано, иначе null)
- sets: количество подходов (если указано, иначе null)
- date: дата в формате YYYY-MM-DD (если указана, иначе текущая дата)
- comment: краткий комментарий из текста (если есть, иначе пустая строка)

❗ Верни только активности, связанные со спортом или физической активностью (включая отжимания, бег, езду на велосипеде и т.д.).
❗ Если дата не указана, используй текущую дату.
❗ Верни ТОЛЬКО JSON-массив, без пояснений.

Пример:
[
  {
    "name": "Отжимания",
    "count": 20,
    "sets": 2,
    "date": "2025-09-30",
    "comment": "Делал утром на улице"
  },
  {
    "name": "Бег",
    "count": 5,
    "sets": null,
    "date": "2025-09-30",
    "comment": "Бегал в парке"
  }
]`
    },
    {
      role: 'user',
      content: `Текст:\n"""${text}"""`
    }
  ];

  log('Сообщения для GPT (analyzeSportEntry):', JSON.stringify(messages, null, 2));
  const raw = await requestGPT(messages, apiKey);
  log('GPT ответ (спортивные активности):', raw);

  try {
    const match = raw.match(/\[\s*\{[\s\S]*?\}\s*(?:,\s*\{[\s\S]*?\}\s*)*\]/);
    if (!match) throw new Error('JSON-массив не найден.');
    log('Найден JSON-массив:', match[0]);
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) throw new Error('Ответ не является массивом.');
    log('Распарсенные данные:', JSON.stringify(parsed, null, 2));
    const validated = parsed.map(activity => ({
      name: activity.name || 'Неизвестная активность',
      count: activity.count != null ? parseInt(activity.count) : null,
      sets: activity.sets != null ? parseInt(activity.sets) : null,
      date: activity.date || new Date().toISOString().split('T')[0],
      comment: activity.comment || ''
    }));
    log('Валидированные активности:', JSON.stringify(validated, null, 2));
    return { activities: validated };
  } catch (e) {
    log('Ошибка парсинга спортивных активностей:', e.message, e.stack, 'Ответ GPT:', raw);
    showNotification('Ошибка парсинга спортивных активностей', 'error');
    const fallbackActivities = [];
    const lowerText = text.toLowerCase();
    log('Текст для fallback анализа:', lowerText);
    if (lowerText.includes('бег') || lowerText.includes('пробежал')) {
      fallbackActivities.push({
        name: 'Бег',
        count: lowerText.includes('5 км') ? 5 : null,
        sets: null,
        date: new Date().toISOString().split('T')[0],
        comment: 'Бег на дистанцию'
      });
    }
    if (lowerText.includes('велосипед') || lowerText.includes('прокатился')) {
      fallbackActivities.push({
        name: 'Езда на велосипеде',
        count: null,
        sets: null,
        date: new Date().toISOString().split('T')[0],
        comment: 'Езда на велосипеде'
      });
    }
    if (lowerText.includes('отжался') || lowerText.includes('отжимания')) {
      fallbackActivities.push({
        name: 'Отжимания',
        count: lowerText.includes('10 раз') ? 10 : null,
        sets: null,
        date: new Date().toISOString().split('T')[0],
        comment: 'Силовые упражнения'
      });
    }
    log('Fallback активности:', JSON.stringify(fallbackActivities, null, 2));
    return { activities: fallbackActivities };
  }
}

export {
  sendAvatarRequest,
  scoreAttributeAnswer,
  analyzeEntry,
  analyzeSportEntry,
  analyzeSkillsFromAnswers
};