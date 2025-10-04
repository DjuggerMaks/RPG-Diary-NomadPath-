// core/storage.js

function saveToStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (err) {
      console.error(`Ошибка при сохранении в localStorage (${key})`, err);
    }
  }
  
  function loadFromStorage(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.error(`Ошибка при загрузке из localStorage (${key})`, err);
      return null;
    }
  }
  
  function removeFromStorage(key) {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      console.error(`Ошибка при удалении из localStorage (${key})`, err);
    }
  }
  
  export {
    saveToStorage,
    loadFromStorage,
    removeFromStorage
  };
  