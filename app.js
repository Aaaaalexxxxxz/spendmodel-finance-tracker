const STORAGE_KEY = "spendmodel.transactions.v1";
const GOAL_KEY = "spendmodel.goal.v1";
const RECURRING_KEY = "spendmodel.recurring.v1";

const categories = [
  "Housing",
  "Food",
  "Transport",
  "Shopping",
  "Health",
  "Entertainment",
  "Subscriptions",
  "Debt",
  "Savings",
  "Income",
  "Other"
];

const categoryIcons = {
  Housing: "⌂",
  Food: "◐",
  Transport: "↗",
  Shopping: "◇",
  Health: "+",
  Entertainment: "♪",
  Subscriptions: "↻",
  Debt: "!",
  Savings: "▴",
  Income: "$",
  Other: "•"
};

const sampleTransactions = [
  ["2026-02-02", "Salary", "Income", "income", 4200],
  ["2026-02-03", "Rent", "Housing", "expense", 1450],
  ["2026-02-05", "Groceries", "Food", "expense", 182.45],
  ["2026-02-09", "Train pass", "Transport", "expense", 96],
  ["2026-02-13", "Dinner", "Food", "expense", 68.2],
  ["2026-02-16", "Streaming bundle", "Subscriptions", "expense", 32.98],
  ["2026-02-20", "Pharmacy", "Health", "expense", 41.3],
  ["2026-03-02", "Salary", "Income", "income", 4200],
  ["2026-03-03", "Rent", "Housing", "expense", 1450],
  ["2026-03-07", "Groceries", "Food", "expense", 211.76],
  ["2026-03-11", "Ride shares", "Transport", "expense", 74.1],
  ["2026-03-15", "Clothes", "Shopping", "expense", 156.89],
  ["2026-03-18", "Coffee shops", "Food", "expense", 47.25],
  ["2026-03-23", "Gym", "Health", "expense", 64],
  ["2026-04-02", "Salary", "Income", "income", 4300],
  ["2026-04-03", "Rent", "Housing", "expense", 1450],
  ["2026-04-05", "Groceries", "Food", "expense", 193.17],
  ["2026-04-10", "Car repair", "Transport", "expense", 388.44],
  ["2026-04-15", "Concert", "Entertainment", "expense", 128.5],
  ["2026-04-18", "Streaming bundle", "Subscriptions", "expense", 32.98],
  ["2026-04-24", "Side project", "Income", "income", 360],
  ["2026-05-02", "Salary", "Income", "income", 4300],
  ["2026-05-03", "Rent", "Housing", "expense", 1450],
  ["2026-05-06", "Groceries", "Food", "expense", 205.32],
  ["2026-05-08", "Lunches", "Food", "expense", 91.6],
  ["2026-05-12", "New headphones", "Shopping", "expense", 229.99],
  ["2026-05-17", "Streaming bundle", "Subscriptions", "expense", 32.98],
  ["2026-05-21", "Credit card payment", "Debt", "expense", 260]
].map(([date, description, category, type, amount], index) => ({
  id: makeId(index),
  date,
  description,
  category,
  type,
  amount
}));

let transactions = loadTransactions();
let recurringRules = loadRecurringRules();
let activityEditMode = false;

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

const exactMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD"
});

const chartTheme = {
  background: "#0d1722",
  grid: "#263445",
  text: "#9aa8b8",
  ink: "#ecf2f8",
  income: "#2dd4bf",
  expense: "#fb7185"
};

const els = {
  category: document.querySelector("#category"),
  categoryGrid: document.querySelector("#categoryGrid"),
  recurringCategory: document.querySelector("#recurringCategory"),
  recurringCategoryGrid: document.querySelector("#recurringCategoryGrid"),
  form: document.querySelector("#transactionForm"),
  recurringForm: document.querySelector("#recurringForm"),
  date: document.querySelector("#date"),
  recurringStart: document.querySelector("#recurringStart"),
  periodFilter: document.querySelector("#periodFilter"),
  budgetPeriodFilter: document.querySelector("#budgetPeriodFilter"),
  goalInput: document.querySelector("#goalInput"),
  budgetGoalInput: document.querySelector("#budgetGoalInput"),
  searchInput: document.querySelector("#searchInput"),
  activityEditBtn: document.querySelector("#activityEditBtn"),
  table: document.querySelector("#transactionTable"),
  addPanel: document.querySelector("#addPanel"),
  recurringPanel: document.querySelector("#recurringPanel"),
  addButton: document.querySelector("#addButton"),
  closeAddPanel: document.querySelector("#closeAddPanel"),
  closeRecurringPanel: document.querySelector("#closeRecurringPanel"),
  manageRecurringBtn: document.querySelector("#manageRecurringBtn"),
  recurringRulesList: document.querySelector("#recurringRulesList"),
  recurringTotal: document.querySelector("#recurringTotal"),
  csvInput: document.querySelector("#csvInput"),
  profileCsvInput: document.querySelector("#profileCsvInput"),
  exportBtn: document.querySelector("#exportBtn"),
  profileExportBtn: document.querySelector("#profileExportBtn"),
  resetBtn: document.querySelector("#resetBtn"),
  profileResetBtn: document.querySelector("#profileResetBtn"),
  metrics: {
    income: document.querySelector("#incomeMetric"),
    spend: document.querySelector("#spendMetric"),
    savings: document.querySelector("#savingsMetric"),
    forecast: document.querySelector("#forecastMetric"),
    incomeDelta: document.querySelector("#incomeDelta"),
    spendDelta: document.querySelector("#spendDelta"),
    savingsDelta: document.querySelector("#savingsDelta"),
    forecastDelta: document.querySelector("#forecastDelta")
  }
};

categories.forEach((category) => {
  els.categoryGrid.append(createCategoryButton(category, () => setTransactionCategory(category)));
  els.recurringCategoryGrid.append(createCategoryButton(category, () => setRecurringCategory(category)));
});

setTransactionCategory(els.category.value || "Food");
setRecurringCategory(els.recurringCategory.value || "Housing");

els.date.valueAsDate = new Date();
els.recurringStart.valueAsDate = new Date();
els.goalInput.value = localStorage.getItem(GOAL_KEY) || "800";
els.budgetGoalInput.value = els.goalInput.value;
els.budgetPeriodFilter.value = els.periodFilter.value;
syncRecurringTransactions();

document.querySelectorAll(".footer-tab").forEach((tab) => {
  tab.addEventListener("click", () => switchView(tab.dataset.view));
});

document.querySelectorAll(".mini-tab").forEach((tab) => {
  tab.addEventListener("click", () => switchAddMode(tab.dataset.addMode));
});

els.addButton.addEventListener("click", openAddPanel);
els.closeAddPanel.addEventListener("click", closeAddPanel);
els.manageRecurringBtn.addEventListener("click", openRecurringPanel);
els.closeRecurringPanel.addEventListener("click", closeRecurringPanel);
els.addPanel.addEventListener("click", (event) => {
  if (event.target === els.addPanel) closeAddPanel();
});
els.recurringPanel.addEventListener("click", (event) => {
  if (event.target === els.recurringPanel) closeRecurringPanel();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeAddPanel();
    closeRecurringPanel();
  }
});
document.addEventListener("click", (event) => {
  const addButton = event.target.closest("#addButton");
  const closeButton = event.target.closest("#closeAddPanel");
  const closeRecurringButton = event.target.closest("#closeRecurringPanel");
  const modeButton = event.target.closest("[data-add-mode]");
  if (addButton) openAddPanel();
  if (closeButton) closeAddPanel();
  if (closeRecurringButton) closeRecurringPanel();
  if (modeButton) switchAddMode(modeButton.dataset.addMode);
});

els.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(els.form);
  transactions.push({
    id: makeId(),
    date: data.get("date"),
    description: data.get("description").trim(),
    category: data.get("category"),
    type: data.get("type"),
    amount: Math.abs(Number(data.get("amount")))
  });
  saveTransactions();
  els.form.reset();
  els.date.valueAsDate = new Date();
  closeAddPanel();
  render();
});

els.recurringForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(els.recurringForm);
  recurringRules.push({
    id: makeId(),
    name: data.get("name").trim(),
    amount: Math.abs(Number(data.get("amount"))),
    category: data.get("category"),
    frequency: data.get("frequency"),
    startDate: data.get("startDate")
  });
  saveRecurringRules();
  syncRecurringTransactions();
  els.recurringForm.reset();
  els.recurringStart.valueAsDate = new Date();
  render();
});

els.periodFilter.addEventListener("change", render);
els.budgetPeriodFilter.addEventListener("change", () => {
  els.periodFilter.value = els.budgetPeriodFilter.value;
  render();
});
els.searchInput.addEventListener("input", renderTable);
els.activityEditBtn.addEventListener("click", () => {
  activityEditMode = !activityEditMode;
  renderTable();
});
document.querySelector("#type").addEventListener("change", (event) => {
  if (event.target.value === "income") {
    setTransactionCategory("Income");
  } else if (els.category.value === "Income") {
    setTransactionCategory("Other");
  }
});
els.goalInput.addEventListener("input", () => {
  localStorage.setItem(GOAL_KEY, els.goalInput.value);
  els.budgetGoalInput.value = els.goalInput.value;
  render();
});
els.budgetGoalInput.addEventListener("input", () => {
  els.goalInput.value = els.budgetGoalInput.value;
  localStorage.setItem(GOAL_KEY, els.budgetGoalInput.value);
  render();
});

els.table.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-id]");
  if (!button) return;
  transactions = transactions.filter((transaction) => transaction.id !== button.dataset.id);
  saveTransactions();
  render();
});

els.recurringRulesList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-rule-id]");
  if (!button) return;
  recurringRules = recurringRules.filter((rule) => rule.id !== button.dataset.ruleId);
  saveRecurringRules();
  render();
});

els.resetBtn?.addEventListener("click", () => {
  resetData();
});

els.exportBtn?.addEventListener("click", exportCsv);
els.profileExportBtn.addEventListener("click", exportCsv);
els.csvInput?.addEventListener("change", importCsv);
els.profileCsvInput.addEventListener("change", importCsv);
els.profileResetBtn.addEventListener("click", resetData);

render();

function loadTransactions() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [...sampleTransactions];
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [...sampleTransactions];
  } catch {
    return [...sampleTransactions];
  }
}

function loadRecurringRules() {
  const stored = localStorage.getItem(RECURRING_KEY);
  if (!stored) return sampleRecurringRules();
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : sampleRecurringRules();
  } catch {
    return sampleRecurringRules();
  }
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function saveRecurringRules() {
  localStorage.setItem(RECURRING_KEY, JSON.stringify(recurringRules));
}

function makeId(seed = Math.random()) {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${String(seed).replace(".", "")}`;
}

function filteredTransactions() {
  const period = els.periodFilter.value;
  if (period === "all") return [...transactions];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - Number(period));
  return transactions.filter((transaction) => new Date(`${transaction.date}T00:00:00`) >= cutoff);
}

function render() {
  syncRecurringTransactions();
  els.budgetPeriodFilter.value = els.periodFilter.value;
  els.budgetGoalInput.value = els.goalInput.value;
  const data = filteredTransactions();
  const model = buildModel(data);
  renderMetrics(model);
  drawTrendChart(model.months);
  drawCategoryChart(model.categories);
  renderInsights(model);
  renderPatterns(model);
  renderRecurringRules();
  renderTable();
}

function buildModel(data) {
  const income = sum(data.filter((item) => item.type === "income"));
  const expenses = sum(data.filter((item) => item.type === "expense"));
  const net = income - expenses;
  const expenseItems = data.filter((item) => item.type === "expense");
  const days = Math.max(1, dateSpanDays(data));
  const dailySpend = expenses / days;
  const monthlyRecurring = recurringRules.reduce((total, rule) => total + monthlyValue(rule), 0);
  const forecast = (dailySpend * 30) + monthlyRecurring;
  const months = groupByMonth(data);
  const categoryTotals = groupTotals(expenseItems, "category");
  const recurring = Object.entries(groupTotals(expenseItems, "description"))
    .map(([name, total]) => ({ name, total, count: expenseItems.filter((item) => item.description === name).length }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);
  return {
    data,
    income,
    expenses,
    net,
    days,
    dailySpend,
    forecast,
    months,
    categories: categoryTotals,
    recurring,
    monthlyRecurring,
    topCategory: Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0],
    savingsRate: income > 0 ? net / income : 0
  };
}

function sum(items) {
  return items.reduce((total, item) => total + Number(item.amount || 0), 0);
}

function dateSpanDays(data) {
  if (!data.length) return 1;
  const dates = data.map((item) => new Date(`${item.date}T00:00:00`).getTime());
  return Math.max(1, Math.ceil((Math.max(...dates) - Math.min(...dates)) / 86400000) + 1);
}

function groupTotals(items, key) {
  return items.reduce((totals, item) => {
    totals[item[key]] = (totals[item[key]] || 0) + Number(item.amount || 0);
    return totals;
  }, {});
}

function groupByMonth(data) {
  const groups = {};
  data.forEach((item) => {
    const month = item.date.slice(0, 7);
    groups[month] ||= { month, income: 0, expenses: 0 };
    groups[month][item.type === "income" ? "income" : "expenses"] += Number(item.amount || 0);
  });
  return Object.values(groups).sort((a, b) => a.month.localeCompare(b.month));
}

function renderMetrics(model) {
  els.metrics.income.textContent = money.format(model.income);
  els.metrics.spend.textContent = money.format(model.expenses);
  els.metrics.savings.textContent = money.format(model.net);
  els.metrics.forecast.textContent = money.format(model.forecast);
  els.metrics.incomeDelta.textContent = `${model.data.filter((item) => item.type === "income").length} income entries`;
  els.metrics.spendDelta.textContent = `${money.format(model.dailySpend)} average per day`;
  els.metrics.savingsDelta.textContent = `${Math.round(model.savingsRate * 100)}% savings rate`;
  els.metrics.forecastDelta.textContent = `${money.format(model.monthlyRecurring)} fixed monthly bills`;
}

function renderInsights(model) {
  const insights = [];
  const goal = Number(els.goalInput.value || 0);
  const top = model.topCategory;
  const score = Math.max(0, Math.min(100, Math.round(50 + model.savingsRate * 120 - (model.forecast / Math.max(model.income, 1)) * 20)));
  document.querySelector("#healthScore").textContent = `Score ${score}`;

  if (top) {
    insights.push({
      badge: "1",
      title: `${top[0]} is the biggest spending category`,
      detail: `${exactMoney.format(top[1])} across the selected window.`
    });
  }
  insights.push({
    badge: "2",
    title: model.net >= goal ? "Savings goal is on track" : "Savings goal needs attention",
    detail: model.net >= goal ? `You are ${exactMoney.format(model.net - goal)} above the goal.` : `You need ${exactMoney.format(goal - model.net)} more in net savings.`
  });
  insights.push({
    badge: "3",
    title: "Modeled daily spend",
    detail: `Your average is ${exactMoney.format(model.dailySpend)} per day, projecting ${exactMoney.format(model.forecast)} over 30 days.`
  });

  document.querySelector("#insightsList").innerHTML = insights.map((insight) => `
    <div class="insight">
      <span class="badge">${insight.badge}</span>
      <span><b>${escapeHtml(insight.title)}</b><small>${escapeHtml(insight.detail)}</small></span>
      <span></span>
    </div>
  `).join("");
}

function renderPatterns(model) {
  const recurring = model.recurring.length ? model.recurring : [{ name: "No expense data yet", total: 0, count: 0 }];
  document.querySelector("#recurringList").innerHTML = recurring.map((item, index) => `
    <div class="rank-item">
      <span class="badge">${index + 1}</span>
      <span><b>${escapeHtml(item.name)}</b><small>${item.count} transaction${item.count === 1 ? "" : "s"}</small></span>
      <strong>${money.format(item.total)}</strong>
    </div>
  `).join("");
  document.querySelector("#budgetFixedLabel").textContent = `${money.format(model.monthlyRecurring)} fixed`;

  const goal = Number(els.goalInput.value || 0);
  const progress = goal > 0 ? Math.max(0, Math.min(100, (model.net / goal) * 100)) : 100;
  document.querySelector("#goalFill").style.width = `${progress}%`;
  document.querySelector("#goalText").textContent = goal > 0
    ? `You have reached ${Math.round(progress)}% of a ${exactMoney.format(goal)} savings goal in this window.`
    : "Set a savings goal to model progress.";

  const top = model.topCategory;
  const recommendation = top
    ? `A practical next move is to reduce ${top[0].toLowerCase()} by 10%. That would free about ${exactMoney.format(top[1] * 0.1)} in this period and lower the 30-day forecast.`
    : "Add transactions or import a CSV to generate a habit recommendation.";
  document.querySelector("#recommendation").textContent = recommendation;
}

function renderRecurringRules() {
  const monthlyTotal = recurringRules.reduce((total, rule) => total + monthlyValue(rule), 0);
  els.recurringTotal.textContent = `${money.format(monthlyTotal)}/mo`;
  els.recurringRulesList.innerHTML = recurringRules.length ? recurringRules.map((rule) => `
    <div class="rank-item">
      <span><b>${escapeHtml(rule.name)}</b><small>${escapeHtml(frequencyLabel(rule.frequency))} from ${escapeHtml(rule.startDate)}</small></span>
      <strong>${money.format(monthlyValue(rule))}/mo</strong>
      <button class="secondary-action" data-rule-id="${rule.id}" type="button" title="Remove recurring bill">DEL</button>
    </div>
  `).join("") : `
    <div class="rank-item">
      <span><b>No recurring bills yet</b><small>Add rent, insurance, phone, or car payments.</small></span>
      <strong>$0/mo</strong>
    </div>
  `;
}

function renderTable() {
  const query = els.searchInput.value.trim().toLowerCase();
  const rows = [...filteredTransactions()]
    .filter((item) => !query || `${item.date} ${item.description} ${item.category} ${item.type}`.toLowerCase().includes(query))
    .sort((a, b) => b.date.localeCompare(a.date));

  els.activityEditBtn.classList.toggle("active", activityEditMode);
  els.activityEditBtn.textContent = activityEditMode ? "Done" : "Edit";
  els.table.closest("table").classList.toggle("editing", activityEditMode);

  let activeMonth = "";
  els.table.innerHTML = rows.map((item) => {
    const month = monthLabel(item.date);
    const showMonth = month !== activeMonth;
    activeMonth = month;
    return `
      ${showMonth ? `
        <tr class="month-row">
          <td colspan="4"><span>${escapeHtml(month)}</span></td>
        </tr>
      ` : ""}
      <tr>
        <td class="delete-column">${activityEditMode ? `<button class="delete-row" data-id="${escapeHtml(item.id)}" type="button" title="Delete ${escapeHtml(item.description)}">×</button>` : ""}</td>
        <td class="date-cell">${escapeHtml(shortDate(item.date))}</td>
        <td class="description-cell">
          <span>${escapeHtml(item.description)}</span>
          <small>${escapeHtml(item.category)}</small>
        </td>
        <td class="amount ${item.type === "income" ? "income-amount" : "expense-amount"}">${item.type === "expense" ? "-" : ""}${exactMoney.format(item.amount)}</td>
      </tr>
    `;
  }).join("");
}

function drawTrendChart(months) {
  const canvas = document.querySelector("#trendChart");
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  drawChartFrame(ctx, width, height);
  if (!months.length) return;

  const pad = 46;
  const max = Math.max(...months.flatMap((month) => [month.income, month.expenses]), 1);
  const slot = (width - pad * 2) / months.length;
  months.forEach((month, index) => {
    const x = pad + index * slot + slot * 0.18;
    const incomeHeight = (month.income / max) * (height - pad * 2);
    const expenseHeight = (month.expenses / max) * (height - pad * 2);
    bar(ctx, x, height - pad - incomeHeight, slot * 0.24, incomeHeight, chartTheme.income);
    bar(ctx, x + slot * 0.3, height - pad - expenseHeight, slot * 0.24, expenseHeight, chartTheme.expense);
    ctx.fillStyle = chartTheme.text;
    ctx.font = "700 13px system-ui";
    ctx.fillText(month.month.slice(5), x, height - 18);
  });
  document.querySelector("#trendLabel").textContent = `${months.length} month${months.length === 1 ? "" : "s"}`;
}

function drawCategoryChart(categoriesByTotal) {
  const canvas = document.querySelector("#categoryChart");
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = chartTheme.background;
  ctx.fillRect(0, 0, width, height);
  const entries = Object.entries(categoriesByTotal).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const total = entries.reduce((value, [, amount]) => value + amount, 0);
  const colors = ["#60a5fa", "#2dd4bf", "#fb7185", "#fbbf24", "#86efac", "#a78bfa"];
  let start = -Math.PI / 2;
  entries.forEach(([name, amount], index) => {
    const slice = total ? (amount / total) * Math.PI * 2 : 0;
    ctx.beginPath();
    ctx.moveTo(150, 150);
    ctx.arc(150, 150, 104, start, start + slice);
    ctx.closePath();
    ctx.fillStyle = colors[index];
    ctx.fill();
    start += slice;

    ctx.fillStyle = colors[index];
    ctx.fillRect(286, 54 + index * 34, 12, 12);
    ctx.fillStyle = chartTheme.ink;
    ctx.font = "700 13px system-ui";
    ctx.fillText(name, 306, 65 + index * 34);
  });
  document.querySelector("#categoryLabel").textContent = total ? money.format(total) : "No spending";
}

function drawChartFrame(ctx, width, height) {
  ctx.fillStyle = chartTheme.background;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = chartTheme.grid;
  ctx.lineWidth = 1;
  for (let y = 54; y < height - 40; y += 54) {
    ctx.beginPath();
    ctx.moveTo(36, y);
    ctx.lineTo(width - 24, y);
    ctx.stroke();
  }
}

function bar(ctx, x, y, width, height, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, Math.max(8, width), Math.max(1, height));
}

function switchView(view) {
  document.querySelectorAll(".footer-tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.view === view));
  document.querySelectorAll(".view").forEach((panel) => panel.classList.toggle("active", panel.id === `${view}View`));
}

function resetData() {
  transactions = [...sampleTransactions];
  recurringRules = sampleRecurringRules();
  saveTransactions();
  saveRecurringRules();
  syncRecurringTransactions();
  render();
}

function switchAddMode(mode) {
  document.querySelectorAll(".mini-tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.addMode === mode));
  document.querySelectorAll(".add-mode").forEach((panel) => panel.classList.toggle("active", panel.id === `${mode}Form`));
}

function createCategoryButton(category, onSelect) {
  const button = document.createElement("button");
  button.className = "category-option";
  button.type = "button";
  button.dataset.category = category;
  button.setAttribute("role", "radio");
  button.setAttribute("aria-checked", "false");
  button.innerHTML = `<span class="category-icon">${categoryIcons[category] || "•"}</span><span>${category}</span>`;
  button.addEventListener("click", onSelect);
  return button;
}

function setTransactionCategory(category) {
  els.category.value = category;
  els.categoryGrid.querySelectorAll(".category-option").forEach((button) => {
    const selected = button.dataset.category === category;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-checked", String(selected));
  });
}

function setRecurringCategory(category) {
  els.recurringCategory.value = category;
  els.recurringCategoryGrid.querySelectorAll(".category-option").forEach((button) => {
    const selected = button.dataset.category === category;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-checked", String(selected));
  });
}

function openAddPanel() {
  els.addPanel.classList.add("open");
  els.addPanel.setAttribute("aria-hidden", "false");
  document.querySelector("#description").focus();
}

function closeAddPanel() {
  els.addPanel.classList.remove("open");
  els.addPanel.setAttribute("aria-hidden", "true");
}

function openRecurringPanel() {
  closeAddPanel();
  els.recurringPanel.classList.add("open");
  els.recurringPanel.setAttribute("aria-hidden", "false");
}

function closeRecurringPanel() {
  els.recurringPanel.classList.remove("open");
  els.recurringPanel.setAttribute("aria-hidden", "true");
}

function sampleRecurringRules() {
  return [
    {
      id: makeId("sample-rent"),
      name: "Rent",
      amount: 1450,
      category: "Housing",
      frequency: "monthly",
      startDate: "2026-02-03"
    },
    {
      id: makeId("sample-phone"),
      name: "Phone payment",
      amount: 75,
      category: "Subscriptions",
      frequency: "monthly",
      startDate: "2026-02-12"
    },
    {
      id: makeId("sample-insurance"),
      name: "Car insurance",
      amount: 132,
      category: "Transport",
      frequency: "monthly",
      startDate: "2026-02-20"
    }
  ];
}

function syncRecurringTransactions() {
  const generated = [];
  recurringRules.forEach((rule) => {
    generated.push(...occurrencesUntilToday(rule).map((date) => ({
      id: `recurring-${rule.id}-${date}`,
      recurringId: rule.id,
      date,
      description: rule.name,
      category: rule.category,
      type: "expense",
      amount: Number(rule.amount)
    })));
  });
  const manual = transactions.filter((item) => !item.recurringId);
  const existingIds = new Set(manual.map((item) => item.id));
  const manualKeys = new Set(manual.map(transactionKey));
  const freshGenerated = generated.filter((item) => !existingIds.has(item.id) && !manualKeys.has(transactionKey(item)));
  const nextTransactions = [...manual, ...freshGenerated];
  if (nextTransactions.length !== transactions.length) {
    transactions = nextTransactions;
    saveTransactions();
  } else {
    transactions = nextTransactions;
  }
}

function transactionKey(item) {
  return `${item.date}|${item.description}|${item.category}|${item.type}|${Number(item.amount).toFixed(2)}`;
}

function occurrencesUntilToday(rule) {
  const dates = [];
  const current = new Date(`${rule.startDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  while (current <= today && dates.length < 240) {
    dates.push(formatDate(current));
    advanceDate(current, rule.frequency);
  }
  return dates;
}

function advanceDate(date, frequency) {
  if (frequency === "weekly") {
    date.setDate(date.getDate() + 7);
  } else if (frequency === "biweekly") {
    date.setDate(date.getDate() + 14);
  } else {
    date.setMonth(date.getMonth() + 1);
  }
}

function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthlyValue(rule) {
  const amount = Number(rule.amount || 0);
  if (rule.frequency === "weekly") return amount * 52 / 12;
  if (rule.frequency === "biweekly") return amount * 26 / 12;
  return amount;
}

function frequencyLabel(frequency) {
  if (frequency === "weekly") return "Weekly";
  if (frequency === "biweekly") return "Every 2 weeks";
  return "Monthly";
}

function importCsv(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const rows = parseCsv(String(reader.result));
    const imported = rows
      .map(rowToTransaction)
      .filter(Boolean);
    transactions = [...transactions, ...imported];
    saveTransactions();
    render();
    if (els.csvInput) els.csvInput.value = "";
    els.profileCsvInput.value = "";
  };
  reader.readAsText(file);
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (!lines.length) return [];
  const header = lines.shift().split(",").map((item) => item.trim().toLowerCase());
  return lines.map((line) => {
    const values = line.split(",").map((item) => item.trim().replace(/^"|"$/g, ""));
    return header.reduce((row, key, index) => {
      row[key] = values[index] || "";
      return row;
    }, {});
  });
}

function rowToTransaction(row) {
  const amount = Math.abs(Number(row.amount));
  if (!row.date || !row.description || !amount) return null;
  const type = (row.type || (Number(row.amount) < 0 ? "expense" : "income")).toLowerCase();
  return {
    id: makeId(),
    date: row.date,
    description: row.description,
    category: row.category || (type === "income" ? "Income" : "Other"),
    type: type === "income" ? "income" : "expense",
    amount
  };
}

function exportCsv() {
  const header = "date,description,category,type,amount";
  const lines = transactions.map((item) => [
    item.date,
    `"${String(item.description).replaceAll('"', '""')}"`,
    item.category,
    item.type,
    item.type === "expense" ? -item.amount : item.amount
  ].join(","));
  const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "spendly-transactions.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function shortDate(value) {
  const [, month, day] = String(value).split("-");
  return `${month}/${day}`;
}

function monthLabel(value) {
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleString("en-US", { month: "short" });
}
