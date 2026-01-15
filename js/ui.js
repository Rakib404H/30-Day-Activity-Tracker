import { ACTIVITY_OPTIONS } from "./config.js";
import { monthName } from "./date-utils.js";
import {
  getPctFromValue,
  stageFromActivityValue,
  stageFromOverview,
  computeOverviewValueFromActivities
} from "./activity-utils.js";
import {
  getState,
  getCurrentMonthKey,
  ensureMonth,
  normalizeRowToActivityCount,
  recomputeAllOverviews
} from "./state.js";
import { saveState } from "./storage.js";
import {
  monthPicker,
  compareSelect,
  tableHead,
  tableBody,
  summaryText,
  compareSummary,
  yearGrid,
  yearProgressLabel,
  yearProgressFill,
  appRoot,
  headerAvg,
  headerStreakMeta,
  dashAvg,
  dashStreak,
  dashDays,
  dashPerfect,
  dashboardSync,
  accountLastSync
} from "./dom.js";

export function updateActivityCell(monthKey, dayIndex, activityIndex) {
  const state = getState();
  const month = state.months[monthKey];
  if (!month) return;
  const val = month.data[dayIndex].activities[activityIndex];
  const pct = getPctFromValue(val);
  const { stage, label } = stageFromActivityValue(val);

  const select = document.querySelector(
    `select[data-month="${monthKey}"][data-day="${dayIndex}"][data-activity="${activityIndex}"]`
  );
  if (!select) return;

  const field = select.parentNode;
  const fill = field.querySelector(".activity-fill");
  const labelEl = field.querySelector(".activity-label");

  let width = pct;
  if (val === "unable") width = 100;

  fill.style.width = width + "%";
  fill.className = "activity-fill stage-" + stage + (val === "unable" ? " danger" : "");
  labelEl.textContent = label;
}

export function updateOverviewForDay(monthKey, dayIndex) {
  const state = getState();
  const month = state.months[monthKey];
  if (!month) return;

  const day = month.data[dayIndex];
  normalizeRowToActivityCount(day);

  day.overview = computeOverviewValueFromActivities(day.activities);
  const overview = day.overview;

  const wrap = document.querySelector(
    `div[data-month-overview="${monthKey}"][data-overview-linear="${dayIndex}"]`
  );
  if (!wrap) return;

  const fill = wrap.querySelector(".overview-linear-fill");
  const labelEl = wrap.querySelector(".overview-linear-label");
  const textEl = wrap.querySelector(".overview-linear-text");

  const { stage, label, danger } = stageFromOverview(overview);
  wrap.className = "overview-linear stage-" + stage + (danger ? " danger" : "");

  const width = overview === null || isNaN(overview) ? 0 : overview;
  fill.style.width = width + "%";

  if (textEl) textEl.textContent = (overview === null || isNaN(overview)) ? "-" : `${overview}%`;
  if (labelEl) labelEl.innerHTML = `<strong>${label}</strong>`;
}

function computeLongestStreakForMonth(monthKey) {
  const state = getState();
  const month = state.months[monthKey];
  if (!month) return 0;
  let longest = 0;
  let current = 0;
  month.data.forEach((day) => {
    const ov = day.overview;
    const active = ov !== null && !isNaN(ov) && ov > 0;
    if (active) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 0;
    }
  });
  return longest;
}

export function computeMonthStats(monthKey) {
  const state = getState();
  const month = state.months[monthKey];
  if (!month) return { avg: null, daysTracked: 0, perfectDays: 0, longestStreak: 0 };

  let daysWith = 0;
  let sum = 0;
  let perfect = 0;
  month.data.forEach((day) => {
    if (day.overview !== null && !isNaN(day.overview)) {
      daysWith++;
      sum += day.overview;
      if (day.overview === 100) perfect++;
    }
  });

  const longestStreak = computeLongestStreakForMonth(monthKey);
  if (daysWith === 0) return { avg: null, daysTracked: 0, perfectDays: 0, longestStreak };
  return {
    avg: Math.round(sum / daysWith),
    daysTracked: daysWith,
    perfectDays: perfect,
    longestStreak
  };
}

export function updateSummaryAndHeader() {
  const currentMonthKey = getCurrentMonthKey();
  const stats = computeMonthStats(currentMonthKey);

  if (stats.daysTracked === 0) {
    summaryText.textContent = "No daily completion data yet for this month.";
    headerAvg.textContent = "0%";
    headerStreakMeta.textContent = "Longest streak: 0 days";
    updateDashboardStats();
    return;
  }

  summaryText.textContent =
    `Average completion this month: ${stats.avg}% · Perfect days (100%): ${stats.perfectDays} · Longest streak: ${stats.longestStreak} days`;
  headerAvg.textContent = `${stats.avg}%`;
  headerStreakMeta.textContent = `Longest streak: ${stats.longestStreak} days`;
  updateDashboardStats();
}

export function updateDashboardStats() {
  if (!dashAvg || !dashStreak || !dashDays || !dashPerfect) return;
  const currentMonthKey = getCurrentMonthKey();
  const stats = computeMonthStats(currentMonthKey);

  if (stats.daysTracked === 0) {
    dashAvg.textContent = "0%";
    dashStreak.textContent = "Longest streak: 0 days";
    dashDays.textContent = "0";
    dashPerfect.textContent = "Perfect days: 0";
    return;
  }

  dashAvg.textContent = `${stats.avg}%`;
  dashStreak.textContent = `Longest streak: ${stats.longestStreak} days`;
  dashDays.textContent = `${stats.daysTracked}`;
  dashPerfect.textContent = `Perfect days: ${stats.perfectDays}`;
}

export function updateSyncStatus(status) {
  if (!dashboardSync) return;
  dashboardSync.classList.remove("is-pending", "is-error");
  switch (status) {
    case "syncing":
      dashboardSync.textContent = "Sync: syncing...";
      dashboardSync.classList.add("is-pending");
      break;
    case "pending":
      dashboardSync.textContent = "Sync: pending";
      dashboardSync.classList.add("is-pending");
      break;
    case "synced":
      dashboardSync.textContent = "Sync: up to date";
      if (accountLastSync) {
        const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        accountLastSync.textContent = `Last sync: ${time}`;
      }
      break;
    case "error":
      dashboardSync.textContent = "Sync: needs attention";
      dashboardSync.classList.add("is-error");
      break;
    case "offline":
      dashboardSync.textContent = "Sync: offline";
      break;
    default:
      dashboardSync.textContent = "Sync: idle";
      break;
  }
}

function setInputsEnabled(enabled) {
  const selects = document.querySelectorAll(".activity-select");
  selects.forEach((sel) => { sel.disabled = !enabled; });
  if (enabled) appRoot.classList.remove("compare-locked");
  else appRoot.classList.add("compare-locked");
}

function highlightCompareMonthCard(compareKey) {
  const cards = document.querySelectorAll(".year-month-card");
  cards.forEach((card) => {
    const key = card.dataset.monthKey;
    if (compareKey && key === compareKey) card.classList.add("is-compare");
    else card.classList.remove("is-compare");
  });
}

export function updateComparison() {
  const currentMonthKey = getCurrentMonthKey();
  const otherKey = compareSelect.value;

  if (!otherKey) {
    compareSummary.innerHTML =
      `<div class="compare-empty">
        Select another month (or click a month card below) to see side-by-side averages, streaks, and insights.
      </div>`;
    setInputsEnabled(true);
    highlightCompareMonthCard(null);
    return;
  }

  const currentStats = computeMonthStats(currentMonthKey);
  const otherStats = computeMonthStats(otherKey);

  const curLabel = currentStats.avg === null ? "-" : `${currentStats.avg}%`;
  const otherLabel = otherStats.avg === null ? "-" : `${otherStats.avg}%`;

  let insight = "";
  if (currentStats.avg !== null && otherStats.avg !== null) {
    const diff = currentStats.avg - otherStats.avg;
    if (diff > 0) insight = `<span class="compare-highlight">You're up by ${diff} points compared to this month.</span>`;
    else if (diff < 0) insight = `<span class="compare-negative">You're down by ${Math.abs(diff)} points vs this month.</span>`;
    else insight = `Both months have the <strong>same average completion</strong>.`;
  } else {
    insight = "One of the months has no completion data yet.";
  }

  compareSummary.innerHTML =
    `<div class="compare-block">
       <div class="compare-title">Current month</div>
       <div class="compare-metric">${curLabel}</div>
       <div class="compare-meta">
         Days tracked: ${currentStats.daysTracked}<br>
         Perfect days: ${currentStats.perfectDays}<br>
         Longest streak: ${currentStats.longestStreak} days
       </div>
     </div>
     <div class="compare-block">
       <div class="compare-title">Comparison month</div>
       <div class="compare-metric">${otherLabel}</div>
       <div class="compare-meta">
         Days tracked: ${otherStats.daysTracked}<br>
         Perfect days: ${otherStats.perfectDays}<br>
         Longest streak: ${otherStats.longestStreak} days
       </div>
     </div>
     <div class="compare-block">
       <div class="compare-title">Insights</div>
       <div class="compare-note">${insight}</div>
     </div>`;

  setInputsEnabled(false);
  highlightCompareMonthCard(otherKey);
}

export function renderMonthPicker() {
  const state = getState();
  const currentMonthKey = getCurrentMonthKey();
  const m = state.months[currentMonthKey];
  if (!m) return;
  monthPicker.value = `${m.year}-${String(m.monthIndex + 1).padStart(2, "0")}`;
}

export function renderCompareSelect() {
  const state = getState();
  const currentMonthKey = getCurrentMonthKey();
  const keys = Object.keys(state.months).sort();
  const selected = compareSelect.value;

  compareSelect.innerHTML = "";
  const optNone = document.createElement("option");
  optNone.value = "";
  optNone.textContent = "None";
  compareSelect.appendChild(optNone);

  keys.forEach((key) => {
    if (key === currentMonthKey) return;
    const m = state.months[key];
    const option = document.createElement("option");
    option.value = key;
    option.textContent = `${m.year}-${String(m.monthIndex + 1).padStart(2, "0")}`;
    compareSelect.appendChild(option);
  });

  if (selected && keys.includes(selected) && selected !== currentMonthKey) compareSelect.value = selected;
  else compareSelect.value = "";
}

export function renderYearOverview() {
  const state = getState();
  const keys = Object.keys(state.months).sort();
  yearGrid.innerHTML = "";

  if (!keys.length) {
    yearGrid.innerHTML = "<div style='font-size:12px;color:#6b7280;'>No month data yet.</div>";
    yearProgressLabel.textContent =
      "No tracked days yet. Once you log activity, this will show your yearly average completion.";
    yearProgressFill.style.width = "0%";
    return;
  }

  let globalSum = 0;
  let globalCount = 0;
  let globalLongestStreak = 0;

  keys.forEach((key) => {
    const stats = computeMonthStats(key);
    if (stats.avg !== null && stats.daysTracked > 0) {
      globalSum += stats.avg * stats.daysTracked;
      globalCount += stats.daysTracked;
    }
    if (stats.longestStreak > globalLongestStreak) globalLongestStreak = stats.longestStreak;
  });

  if (globalCount === 0) {
    yearProgressLabel.textContent =
      "No tracked days yet. Once you log activity, this will show your yearly average completion.";
    yearProgressFill.style.width = "0%";
  } else {
    const globalAvg = Math.round(globalSum / globalCount);
    yearProgressLabel.textContent =
      `Yearly average completion: ${globalAvg}% · Longest streak across months: ${globalLongestStreak} days`;
    yearProgressFill.style.width = `${globalAvg}%`;
  }

  const compareKey = compareSelect.value || null;

  keys.forEach((key) => {
    const m = state.months[key];
    const stats = computeMonthStats(key);

    const card = document.createElement("div");
    card.className = "year-month-card";
    card.dataset.monthKey = key;
    if (compareKey && key === compareKey) card.classList.add("is-compare");

    const title = document.createElement("div");
    title.className = "year-month-title";
    title.textContent = `${monthName(m.monthIndex)} ${m.year}`;

    const main = document.createElement("div");
    main.className = "year-month-main";
    main.textContent = stats.avg === null ? "-" : `${stats.avg}% avg`;

    const meta = document.createElement("div");
    meta.className = "year-month-meta";
    meta.textContent =
      `Days tracked: ${stats.daysTracked} · Perfect days: ${stats.perfectDays} · Longest streak: ${stats.longestStreak} days`;

    card.appendChild(title);
    card.appendChild(main);
    card.appendChild(meta);

    card.addEventListener("click", () => {
      const currentMonthKey = getCurrentMonthKey();
      if (key === currentMonthKey) compareSelect.value = "";
      else compareSelect.value = key;
      updateComparison();
      renderYearOverview();
    });

    yearGrid.appendChild(card);
  });
}

export function buildTable() {
  const state = getState();
  const currentMonthKey = getCurrentMonthKey();
  const month = state.months[currentMonthKey];
  if (!month) return;

  ensureMonth(month.year, month.monthIndex);
  recomputeAllOverviews();

  tableHead.innerHTML = "";
  tableBody.innerHTML = "";

  const headRow = document.createElement("tr");

  const dayTh = document.createElement("th");
  dayTh.className = "col-day";
  dayTh.textContent = "Day";
  headRow.appendChild(dayTh);

  state.activities.forEach((name, index) => {
    const th = document.createElement("th");
    const headerDiv = document.createElement("div");
    headerDiv.className = "activity-header";

    const titleSpan = document.createElement("span");
    titleSpan.className = "activity-title";
    titleSpan.textContent = name;
    titleSpan.title = "Click to rename";

    const actionsDiv = document.createElement("div");
    actionsDiv.className = "header-actions customize-only";

    const renameBtn = document.createElement("button");
    renameBtn.className = "icon-btn";
    renameBtn.type = "button";
    renameBtn.textContent = "✎";
    renameBtn.title = "Rename activity";
    renameBtn.addEventListener("click", () => {
      const current = state.activities[index];
      const next = prompt("Rename activity:", current);
      if (next && next.trim()) {
        state.activities[index] = next.trim();
        recomputeAllOverviews();
        saveState(state);
        buildTable();
        renderCompareSelect();
        renderYearOverview();
        updateComparison();
      }
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "icon-btn";
    deleteBtn.type = "button";
    deleteBtn.textContent = "🗑";
    deleteBtn.title = "Delete activity column";
    deleteBtn.addEventListener("click", () => {
      if (state.activities.length <= 1) {
        alert("At least one activity column is required.");
        return;
      }
      if (!confirm(`Delete activity "${state.activities[index]}" from all months?`)) return;

      state.activities.splice(index, 1);
      Object.values(state.months).forEach((m) => {
        m.data.forEach((row) => {
          normalizeRowToActivityCount(row);
          row.activities.splice(index, 1);
        });
      });

      recomputeAllOverviews();
      saveState(state);

      if (compareSelect.value && !state.months[compareSelect.value]) compareSelect.value = "";

      buildTable();
      renderCompareSelect();
      renderYearOverview();
      updateComparison();
    });

    actionsDiv.appendChild(renameBtn);
    actionsDiv.appendChild(deleteBtn);

    headerDiv.appendChild(titleSpan);
    headerDiv.appendChild(actionsDiv);
    th.appendChild(headerDiv);
    headRow.appendChild(th);
  });

  const overviewTh = document.createElement("th");
  overviewTh.textContent = "Daily completion overview";
  headRow.appendChild(overviewTh);
  tableHead.appendChild(headRow);

  for (let d = 0; d < month.days; d++) {
    const rowData = month.data[d] || { activities: state.activities.map(() => "none"), overview: null };
    month.data[d] = rowData;
    normalizeRowToActivityCount(rowData);

    const tr = document.createElement("tr");

    const tdDay = document.createElement("td");
    tdDay.className = "col-day";
    tdDay.textContent = d + 1;
    tr.appendChild(tdDay);

    state.activities.forEach((_, aIndex) => {
      const td = document.createElement("td");
      td.className = "activity-cell";

      const field = document.createElement("div");
      field.className = "activity-field";

      const fill = document.createElement("div");
      fill.className = "activity-fill";
      field.appendChild(fill);

      const label = document.createElement("span");
      label.className = "activity-label";
      label.textContent = "Not set";
      field.appendChild(label);

      const select = document.createElement("select");
      select.className = "activity-select";
      select.setAttribute("data-month", currentMonthKey);
      select.setAttribute("data-day", d.toString());
      select.setAttribute("data-activity", aIndex.toString());

      ACTIVITY_OPTIONS.forEach((opt) => {
        const o = document.createElement("option");
        o.value = opt.value;
        o.textContent = opt.label;
        select.appendChild(o);
      });

      select.value = rowData.activities[aIndex] || "none";

      select.addEventListener("change", (e) => {
        const value = e.target.value;
        rowData.activities[aIndex] = value;

        updateActivityCell(currentMonthKey, d, aIndex);
        updateOverviewForDay(currentMonthKey, d);

        saveState(state);
        updateSummaryAndHeader();
        updateComparison();
        renderYearOverview();
      });

      field.appendChild(select);
      td.appendChild(field);
      tr.appendChild(td);
    });

    const tdOverview = document.createElement("td");
    tdOverview.className = "overview-cell";

    const overviewWrap = document.createElement("div");
    overviewWrap.className = "overview-linear stage-0";
    overviewWrap.setAttribute("data-month-overview", currentMonthKey);
    overviewWrap.setAttribute("data-overview-linear", d.toString());

    const track = document.createElement("div");
    track.className = "overview-linear-track";

    const ofill = document.createElement("div");
    ofill.className = "overview-linear-fill";
    track.appendChild(ofill);

    const otext = document.createElement("div");
    otext.className = "overview-linear-text";
    otext.textContent = "-";
    track.appendChild(otext);

    const olabel = document.createElement("div");
    olabel.className = "overview-linear-label";
    olabel.textContent = "Not set";

    overviewWrap.appendChild(track);
    overviewWrap.appendChild(olabel);
    tdOverview.appendChild(overviewWrap);
    tr.appendChild(tdOverview);

    tableBody.appendChild(tr);
  }

  for (let d = 0; d < month.days; d++) {
    for (let aIndex = 0; aIndex < state.activities.length; aIndex++) {
      updateActivityCell(currentMonthKey, d, aIndex);
    }
    updateOverviewForDay(currentMonthKey, d);
  }

  updateSummaryAndHeader();
  saveState(state);
  renderYearOverview();

  if (compareSelect.value) setInputsEnabled(false);
  else setInputsEnabled(true);
}
