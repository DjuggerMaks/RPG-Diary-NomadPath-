function renderMoney() {
    const container = document.getElementById("money");
    container.innerHTML = `
      <h3>Финансовый учёт</h3>
      <p>Добавляй доходы и расходы с комментариями.</p>
  
      <div style="margin-top:10px;">
        <input type="text" id="moneyAmount" placeholder="Сумма (например: -500 или 1200)" style="width:100%;margin-bottom:5px;" />
        <input type="text" id="moneyNote" placeholder="Комментарий (еда, транспорт...)" style="width:100%;" />
        <button id="addMoney" style="margin-top:5px;">Добавить</button>
      </div>
  
      <ul id="moneyList" style="margin-top:15px; list-style: none; padding-left: 0;"></ul>
    `;
  
    const entries = JSON.parse(localStorage.getItem("moneyLog") || "[]");
    const list = document.getElementById("moneyList");
    entries.forEach(e => {
      const li = document.createElement("li");
      li.innerText = `${e.amount} — ${e.note}`;
      list.appendChild(li);
    });
  
    document.getElementById("addMoney").addEventListener("click", () => {
      const amount = document.getElementById("moneyAmount").value.trim();
      const note = document.getElementById("moneyNote").value.trim();
      if (!amount) return;
  
      const entry = { amount, note };
      entries.push(entry);
      localStorage.setItem("moneyLog", JSON.stringify(entries));
  
      const li = document.createElement("li");
      li.innerText = `${amount} — ${note}`;
      list.appendChild(li);
  
      document.getElementById("moneyAmount").value = "";
      document.getElementById("moneyNote").value = "";
    });
  }
  
  export { renderMoney };
  