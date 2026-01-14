import { getMonthKey } from "./date-utils.js";
import {
  initState,
  ensureMonth,
  getState,
  getCurrentMonthKey,
  setCurrentMonthKey,
  recomputeAllOverviews,
  normalizeRowToActivityCount,
  toggleCustomizeMode
} from "./state.js";
import { saveState } from "./storage.js";
import {
  buildTable,
  renderMonthPicker,
  renderCompareSelect,
  updateComparison,
  renderYearOverview
} from "./ui.js";
import {
  monthPicker,
  compareSelect,
  resetCurrentMonthBtn,
  addActivityBtn,
  customizeToggle,
  appRoot
} from "./dom.js";

// Daily Activity Tracker v2.0 (module split)

monthPicker.addEventListener("change", () => {
  const value = monthPicker.value;
  if (!value) return;
  const [y, m] = value.split("-").map(Number);
  const year = y;
  const monthIndex = m - 1;

  const key = getMonthKey(year, monthIndex);
  ensureMonth(year, monthIndex);
  setCurrentMonthKey(key);

  buildTable();
  renderMonthPicker();
  renderCompareSelect();
  updateComparison();
});

compareSelect.addEventListener("change", () => {
  updateComparison();
  renderYearOverview();
});

resetCurrentMonthBtn.addEventListener("click", () => {
  const state = getState();
  const currentMonthKey = getCurrentMonthKey();
  const month = state.months[currentMonthKey];
  if (!month) return;

  const monthLabel = `${month.year}-${String(month.monthIndex + 1).padStart(2, "0")}`;
  if (!confirm(`Clear all data for ${monthLabel}?`)) return;

  month.data = Array.from({ length: month.days }, () => ({
    activities: state.activities.map(() => "none"),
    overview: null
  }));

  recomputeAllOverviews();
  saveState(state);
  buildTable();
  updateComparison();
});

addActivityBtn?.addEventListener("click", () => {
  const state = getState();
  if (state.activities.length >= 8) {
    alert("For now, max 8 activity columns are allowed.");
    return;
  }
  const name = prompt("New activity name (e.g. Reading, Gym, Journaling):");
  if (!name || !name.trim()) return;

  state.activities.push(name.trim());

  Object.values(state.months).forEach((m) => {
    m.data.forEach((row) => {
      normalizeRowToActivityCount(row);
      row.activities.push("none");
    });
  });

  recomputeAllOverviews();
  saveState(state);

  buildTable();
  renderCompareSelect();
  renderYearOverview();
  updateComparison();
});

customizeToggle.addEventListener("click", () => {
  const isOn = toggleCustomizeMode();
  if (isOn) {
    appRoot.classList.remove("customize-off");
    appRoot.classList.add("customize-on");
    customizeToggle.textContent = "✔ Done customizing";
  } else {
    appRoot.classList.remove("customize-on");
    appRoot.classList.add("customize-off");
    customizeToggle.textContent = "⚙ Customize";
  }
});

initState();
renderMonthPicker();
buildTable();
renderCompareSelect();
updateComparison();
