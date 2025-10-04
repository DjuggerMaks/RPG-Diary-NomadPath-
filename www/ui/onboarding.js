import { sendAvatarRequest } from '../services/apiService.js';
import { createCharacterFromInit } from '../core/character.js';
import { showTab } from './app.js';

let nameAnswer = "";
let appearanceAnswer = "";
let uploadedAvatarData = null;

function showOnboardingModal() {
  // Проверяем, не существует ли уже модалка
  if (document.getElementById("onboardingModal")) {
    console.log("[🆕] Модалка уже существует, пропускаем создание");
    return;
  }

  console.log("[🆕] Запуск онбординга: создание модального окна");
  const modal = document.createElement("div");
  modal.id = "onboardingModal";
  modal.className = "modal";
  modal.innerHTML = `
    <div class="modal-content">
      <h3>Создание персонажа</h3>
      <p id="onboardingStep">Придумай имя своему персонажу</p>
      <input id="onboardingInput" type="text" placeholder="Имя персонажа" />
      <div class="modal-buttons">
        <button id="onboardingNext" class="modal-confirm">Далее</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  const input = document.getElementById("onboardingInput");
  const nextButton = document.getElementById("onboardingNext");

  if (!input || !nextButton) {
    console.error("[🆕] Не найдены элементы: input=", !!input, "button=", !!nextButton);
    return;
  }

  console.log("[🆕] Кнопка #onboardingNext найдена, привязываем события");
  // Прямые обработчики
  nextButton.addEventListener("click", handleStep1);
  nextButton.addEventListener("mousedown", handleStep1);
  nextButton.addEventListener("touchstart", handleStep1);
  nextButton.addEventListener("pointerdown", handleStep1);
  nextButton.addEventListener("touchend", handleStep1);

  // Делегирование через document
  document.addEventListener("click", function delegateClick(event) {
    if (event.target.id === "onboardingNext") {
      console.log("[🆕] Клик по #onboardingNext через делегирование, событие:", event.type);
      handleStep1(event);
    }
  }, { once: true });

  // Обход Grammarly: принудительный фокус
  input.addEventListener("focus", () => console.log("[🆕] Поле ввода в фокусе"));
  input.addEventListener("blur", () => console.log("[🆕] Поле ввода потеряло фокус"));
  input.focus(); // Принудительно фокусируем поле
}

function handleStep1(event) {
  try {
    event.preventDefault();
    event.stopPropagation();
    console.log("[🆕] Обработка шага 1, событие:", event.type);
    const input = document.getElementById("onboardingInput");
    if (!input) {
      console.error("[🆕] Поле ввода не найдено");
      return;
    }
    nameAnswer = input.value.trim();
    if (!nameAnswer) {
      alert("Пожалуйста, введи имя персонажа.");
      return;
    }
    console.log("[🆕] Имя введено:", nameAnswer);

    const modalContent = document.querySelector("#onboardingModal .modal-content");
    modalContent.innerHTML = `
      <h3>Создание персонажа</h3>
      <p id="onboardingStep">Опиши внешность или характер своего персонажа</p>
      <textarea id="onboardingAppearance" placeholder="Например: высокий воин с тёмными глазами или весёлый путешественник"></textarea>
      <div class="modal-buttons">
        <button id="onboardingBack" class="modal-cancel">Назад</button>
        <button id="onboardingNext" class="modal-confirm">Далее</button>
      </div>`;
    document.getElementById("onboardingBack").addEventListener("click", () => {
      showOnboardingModal();
    });
    document.getElementById("onboardingNext").addEventListener("click", handleStep2);
  } catch (e) {
    console.error("[🆕] Ошибка при обработке шага 1:", e);
  }
}

function handleStep2(event) {
  try {
    event.preventDefault();
    event.stopPropagation();
    console.log("[🆕] Обработка шага 2, событие:", event.type);
    const textarea = document.getElementById("onboardingAppearance");
    if (!textarea) {
      console.error("[🆕] Текстовое поле не найдено");
      return;
    }
    appearanceAnswer = textarea.value.trim();
    console.log("[🆕] Описание внешности/характера:", appearanceAnswer);

    const modalContent = document.querySelector("#onboardingModal .modal-content");
    modalContent.innerHTML = `
      <h3>Создание персонажа</h3>
      <p id="onboardingStep">Загрузи аватар или пропусти этот шаг</p>
      <input id="onboardingAvatar" type="file" accept="image/*" />
      <div class="modal-buttons">
        <button id="onboardingBack" class="modal-cancel">Назад</button>
        <button id="onboardingConfirm" class="modal-confirm">Подтвердить</button>
      </div>`;
    document.getElementById("onboardingBack").addEventListener("click", handleStep1);
    document.getElementById("onboardingConfirm").addEventListener("click", handleConfirmAvatar);
    document.getElementById("onboardingAvatar").addEventListener("change", handleAvatarUpload);
  } catch (e) {
    console.error("[🆕] Ошибка при обработке шага 2:", e);
  }
}

function handleAvatarUpload(event) {
  try {
    event.preventDefault();
    event.stopPropagation();
    console.log("[🆕] Загрузка аватара, событие:", event.type);
    const fileInput = document.getElementById("onboardingAvatar");
    if (!fileInput || !fileInput.files || !fileInput.files[0]) {
      console.log("[🆕] Файл не выбран, пропускаем загрузку");
      return;
    }
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      uploadedAvatarData = reader.result;
      console.log("[🆕] Аватар загружен:", uploadedAvatarData.slice(0, 50) + "...");
    };
    reader.readAsDataURL(file);
  } catch (e) {
    console.error("[🆕] Ошибка при загрузке аватара:", e);
    alert("Произошла ошибка при загрузке аватара. Попробуйте ещё раз.");
  }
}

function handleConfirmAvatar(event) {
  try {
    event.preventDefault();
    event.stopPropagation();
    console.log("[🆕] Подтверждение создания персонажа, событие:", event.type);
    const descriptionText = appearanceAnswer || "";
    console.log("[🆕] Описание персонажа:", descriptionText);

    const newCharacter = {
      name: nameAnswer || "Путник",
      avatar: uploadedAvatarData || null,
      generatedDescription: descriptionText,
      level: 0,
      xp: 0,
      attributes: {
        сила: 0, ловкость: 0, интеллект: 0, харизма: 0,
        воля: 0, дух: 0, мудрость: 0, энергия: 0
      },
      skills: [],
      habits: [],
      quests: [],
      chronicle: [],
      journal: []
    };

    createCharacterFromInit(newCharacter);
    console.log("[🆕] Персонаж создан:", JSON.stringify(newCharacter, null, 2));
    document.getElementById("avatarConfirm")?.remove(); // Удаляем модальное окно подтверждения, если есть
    const onboardingModal = document.getElementById("onboardingModal");
    if (onboardingModal) {
      onboardingModal.remove();
      console.log("[🆕] Модальное окно онбординга удалено");
    }

    // Рендерим все вкладки
    import('./profile.js').then(m => m.renderProfile());
    import('./stats.js').then(m => m.renderStats());
    import('./skills.js').then(m => m.renderSkills());
    import('./quests.js').then(m => m.renderQuests());
    import('./habits.js').then(m => m.renderHabits());
    import('./chronicle.js').then(m => m.setupChronicle());
    import('./food.js').then(m => m.renderFood());
    import('./fitness.js').then(m => m.renderFitness());
    import('./money.js').then(m => m.renderMoney());
    import('./diary.js').then(m => m.renderJournal());

    showTab("profile");
    console.log("[🆕] Онбординг завершён, переход на вкладку профиля");
  } catch (e) {
    console.error("[🆕] Ошибка при создании персонажа:", e);
    alert("Произошла ошибка при создании персонажа. Попробуйте отключить расширения браузера.");
  }
}

export { showOnboardingModal };