// services/utils.js

// Преобразует дату ISO в читабельный формат
function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString("ru-RU", {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  
  // Ограничение текста до N символов
  function truncateText(text, maxLength = 100) {
    return text.length > maxLength ? text.slice(0, maxLength) + "…" : text;
  }
  
  // Генерация случайного ID
  function generateId() {
    return Date.now() + Math.floor(Math.random() * 1000);
  }
  
  // Проверка строки на валидность (не пустая, не только пробелы)
  function isValidString(str) {
    return typeof str === 'string' && str.trim().length > 0;
  }
  
  export {
    formatDate,
    truncateText,
    generateId,
    isValidString
  };
  