// Bundled script for file:// usage (generated from modules)

// --- js/config.js ---
const STORAGE_KEY = "daily_activity_tracker_v3_0";

const ACTIVITY_OPTIONS = [
  { value: "none",   label: "⚪ Not set",             pct: 0 },
  { value: "unable", label: "⛔ Couldn't do today",   pct: 0 },
  { value: "25",     label: "🟡 25% done",           pct: 25 },
  { value: "50",     label: "🟡 50% done",           pct: 50 },
  { value: "75",     label: "🟢 75% done",           pct: 75 },
  { value: "100",    label: "✅ 100% completed",     pct: 100 },
];

// --- js/date-utils.js ---
function getMonthKey(year, monthIndex) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

function getDaysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function monthName(index) {
  return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][index] || "";
}

// --- js/activity-utils.js ---
function getPctFromValue(value) {
  const opt = ACTIVITY_OPTIONS.find((o) => o.value === value);
  return opt ? opt.pct : 0;
}

function stageFromActivityValue(value) {
  switch (value) {
    case "25":
      return { stage: 1, label: "25% done" };
    case "50":
      return { stage: 2, label: "50% done" };
    case "75":
      return { stage: 3, label: "75% done" };
    case "100":
      return { stage: 4, label: "Completed" };
    case "unable":
      return { stage: 0, label: "Couldn't do today" };
    default:
      return { stage: 0, label: "Not set" };
  }
}

function stageFromOverview(overview) {
  if (overview === null || isNaN(overview)) return { stage: 0, label: "Not set", danger: false };
  if (overview === 0) return { stage: 0, label: "No progress", danger: true };
  if (overview < 40) return { stage: 1, label: "Light progress", danger: false };
  if (overview < 70) return { stage: 2, label: "Moderate progress", danger: false };
  if (overview < 100) return { stage: 3, label: "Strong progress", danger: false };
  return { stage: 4, label: "Perfect day", danger: false };
}

// Key logic: "none" counts as 0% and is included in the average.
function computeOverviewValueFromActivities(activitiesArray) {
  const total = Array.isArray(activitiesArray) ? activitiesArray.length : 0;
  if (total === 0) return null;

  let sum = 0;
  activitiesArray.forEach((val) => {
    sum += getPctFromValue(val);
  });

  return Math.round(sum / total);
}

// --- js/supabase.js ---
const SUPABASE_URL = "https://ycedxxubodzefetscxvi.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_yhoc20Sko8NC2k3XfWeW0Q_xUrZDyNi";

let client = null;

function getSupabaseClient() {
  if (client) return client;
  if (!window.supabase?.createClient) return null;
  client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}

// --- js/storage.js ---
const REMOTE_TABLE = "tracker_states";

let pendingState = null;
let pendingTimer = null;

function emitSyncStatus(status) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("sync-status", { detail: { status } }));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  scheduleRemoteBackup(state);
}

async function fetchRemoteState() {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data: sessionData } = await client.auth.getSession();
  const user = sessionData?.session?.user;
  if (!user) return null;

  emitSyncStatus("syncing");
  const { data, error } = await client
    .from(REMOTE_TABLE)
    .select("state")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    emitSyncStatus("error");
    return null;
  }
  emitSyncStatus("synced");
  return data?.state || null;
}

async function pushRemoteState(state) {
  const client = getSupabaseClient();
  if (!client) return;

  const { data: sessionData } = await client.auth.getSession();
  const user = sessionData?.session?.user;
  if (!user) return;

  const { error } = await client.from(REMOTE_TABLE).upsert({
    user_id: user.id,
    state,
    updated_at: new Date().toISOString()
  });
  if (error) emitSyncStatus("error");
  else emitSyncStatus("synced");
}

function scheduleRemoteBackup(state) {
  pendingState = state;
  if (pendingTimer) clearTimeout(pendingTimer);
  emitSyncStatus("pending");
  pendingTimer = setTimeout(() => {
    const snapshot = pendingState;
    pendingState = null;
    pushRemoteState(snapshot);
  }, 800);
}

// --- js/state.js ---
let state = null;
let currentMonthKey = null;
let customizeMode = false;

function getState() {
  return state;
}

function getCurrentMonthKey() {
  return currentMonthKey;
}

function setCurrentMonthKey(key) {
  currentMonthKey = key;
}

function isCustomizeMode() {
  return customizeMode;
}

function setCustomizeMode(value) {
  customizeMode = value;
}

function toggleCustomizeMode() {
  customizeMode = !customizeMode;
  return customizeMode;
}

function normalizeRowToActivityCount(row) {
  if (!row) return;
  if (!Array.isArray(row.activities)) row.activities = state.activities.map(() => "none");

  if (row.activities.length < state.activities.length) {
    while (row.activities.length < state.activities.length) row.activities.push("none");
  } else if (row.activities.length > state.activities.length) {
    row.activities = row.activities.slice(0, state.activities.length);
  }
}

function recomputeAllOverviews() {
  Object.values(state.months).forEach((month) => {
    if (!month?.data) return;
    month.data.forEach((row) => {
      normalizeRowToActivityCount(row);
      row.overview = computeOverviewValueFromActivities(row.activities);
    });
  });
}

function resolveCurrentMonthKey(nextState) {
  const today = new Date();
  const todayKey = getMonthKey(today.getFullYear(), today.getMonth());
  if (nextState.months[todayKey]) return todayKey;
  const keys = Object.keys(nextState.months || {});
  if (keys.length) return keys.sort()[0];
  return todayKey;
}

function setStateFromRemote(remoteState) {
  if (!remoteState || !Array.isArray(remoteState.activities) || !remoteState.months) return false;
  state = remoteState;
  currentMonthKey = resolveCurrentMonthKey(state);

  if (!state.months[currentMonthKey]) {
    const [y, m] = currentMonthKey.split("-").map(Number);
    const year = y;
    const monthIndex = m - 1;
    const days = getDaysInMonth(year, monthIndex);
    state.months[currentMonthKey] = {
      year,
      monthIndex,
      days,
      data: Array.from({ length: days }, () => ({
        activities: state.activities.map(() => "none"),
        overview: null
      }))
    };
  }

  recomputeAllOverviews();
  saveState(state);
  return true;
}

function initState() {
  const existing = loadState();
  if (existing && Array.isArray(existing.activities) && existing.months) {
    state = existing;
  } else {
    const today = new Date();
    const year = today.getFullYear();
    const monthIndex = today.getMonth();
    const key = getMonthKey(year, monthIndex);
    const days = getDaysInMonth(year, monthIndex);

    state = {
      activities: ["Trading", "Coding", "Automation", "Self-Care", "Prayer"],
      months: {}
    };

    state.months[key] = {
      year,
      monthIndex,
      days,
      data: Array.from({ length: days }, () => ({
        activities: state.activities.map(() => "none"),
        overview: null
      }))
    };
  }

  const today = new Date();
  const todayKey = getMonthKey(today.getFullYear(), today.getMonth());
  if (state.months[todayKey]) {
    currentMonthKey = todayKey;
  } else {
    const keys = Object.keys(state.months);
    currentMonthKey = keys.length ? keys[0] : todayKey;
    if (!state.months[currentMonthKey]) {
      const [y, m] = currentMonthKey.split("-").map(Number);
      const year = y;
      const monthIndex = m - 1;
      const days = getDaysInMonth(year, monthIndex);
      state.months[currentMonthKey] = {
        year,
        monthIndex,
        days,
        data: Array.from({ length: days }, () => ({
          activities: state.activities.map(() => "none"),
          overview: null
        }))
      };
    }
  }

  recomputeAllOverviews();
  saveState(state);
}

function ensureMonth(year, monthIndex) {
  const key = getMonthKey(year, monthIndex);
  const days = getDaysInMonth(year, monthIndex);

  if (!state.months[key]) {
    state.months[key] = {
      year,
      monthIndex,
      days,
      data: Array.from({ length: days }, () => ({
        activities: state.activities.map(() => "none"),
        overview: null
      }))
    };
  } else {
    const m = state.months[key];
    m.days = days;

    if (m.data.length !== days) {
      const newData = Array.from({ length: days }, (_, idx) => {
        if (m.data[idx]) return m.data[idx];
        return { activities: state.activities.map(() => "none"), overview: null };
      });
      m.data = newData;
    }

    m.data.forEach((row) => normalizeRowToActivityCount(row));
  }

  state.months[key].data.forEach((row) => {
    row.overview = computeOverviewValueFromActivities(row.activities);
  });

  return state.months[key];
}

// --- js/dom.js ---
const monthPicker = document.getElementById("monthPicker");
const compareSelect = document.getElementById("compareSelect");
const tableHead = document.getElementById("tableHead");
const tableBody = document.getElementById("tableBody");
const addActivityBtn = document.getElementById("addActivityBtn");
const summaryText = document.getElementById("summaryText");
const compareSummary = document.getElementById("compareSummary");
const resetCurrentMonthBtn = document.getElementById("resetCurrentMonth");
const yearGrid = document.getElementById("yearGrid");
const yearProgressLabel = document.getElementById("yearProgressLabel");
const yearProgressFill = document.getElementById("yearProgressFill");
const customizeToggle = document.getElementById("customizeToggle");
const appRoot = document.getElementById("appRoot");
const headerAvg = document.getElementById("headerAvg");
const headerStreakMeta = document.getElementById("headerStreakMeta");
const trackerView = document.getElementById("trackerView");
const dashboardView = document.getElementById("dashboardView");
const logoutBtn = document.getElementById("logoutBtn");
const dashboardGoToTracker = document.getElementById("dashboardGoToTracker");
const dashboardAddActivity = document.getElementById("dashboardAddActivity");
const dashboardCompare = document.getElementById("dashboardCompare");
const dashAvg = document.getElementById("dashAvg");
const dashStreak = document.getElementById("dashStreak");
const dashDays = document.getElementById("dashDays");
const dashPerfect = document.getElementById("dashPerfect");
const authModal = document.getElementById("authModal");
const authBackdrop = document.getElementById("authBackdrop");
const authCloseBtn = document.getElementById("authCloseBtn");
const authSubmitBtn = document.getElementById("authSubmitBtn");
const authSwitchBtn = document.getElementById("authSwitchBtn");
const authTitle = document.getElementById("authTitle");
const authSubtitle = document.getElementById("authSubtitle");
const authLoginForm = document.getElementById("authLoginForm");
const authResetForm = document.getElementById("authResetForm");
const authNameField = document.getElementById("authNameField");
const authName = document.getElementById("authName");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const authMessage = document.getElementById("authMessage");
const authForgotBtn = document.getElementById("authForgotBtn");
const authSwitchHint = document.getElementById("authSwitchHint");
const authPasswordField = document.getElementById("authPasswordField");
const authSwitchRow = document.getElementById("authSwitchRow");
const authResetPassword = document.getElementById("authResetPassword");
const authResetConfirm = document.getElementById("authResetConfirm");
const authResetBtn = document.getElementById("authResetBtn");
const authResetBackBtn = document.getElementById("authResetBackBtn");
const accountBtn = document.getElementById("accountBtn");
const accountDropdown = document.getElementById("accountDropdown");
const accountDashboardBtn = document.getElementById("accountDashboardBtn");
const accountLogoutBtn = document.getElementById("accountLogoutBtn");
const accountEmail = document.getElementById("accountEmail");
const accountLastSync = document.getElementById("accountLastSync");
const dashboardSync = document.getElementById("dashboardSync");
const authNotice = document.getElementById("authNotice");
const authNoticeText = document.getElementById("authNoticeText");

// --- js/ui.js ---
function updateActivityCell(monthKey, dayIndex, activityIndex) {
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

function updateOverviewForDay(monthKey, dayIndex) {
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

function computeMonthStats(monthKey) {
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

function updateSummaryAndHeader() {
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
    `Average completion this month: ${stats.avg}% - Perfect days (100%): ${stats.perfectDays} - Longest streak: ${stats.longestStreak} days`;
  headerAvg.textContent = `${stats.avg}%`;
  headerStreakMeta.textContent = `Longest streak: ${stats.longestStreak} days`;
  updateDashboardStats();
}

function updateDashboardStats() {
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

function updateSyncStatus(status) {
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

function updateComparison() {
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
    if (diff > 0) insight = `<span class="compare-highlight">You are up by ${diff} points compared to this month.</span>`;
    else if (diff < 0) insight = `<span class="compare-negative">You are down by ${Math.abs(diff)} points vs this month.</span>`;
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

function renderMonthPicker() {
  const state = getState();
  const currentMonthKey = getCurrentMonthKey();
  const m = state.months[currentMonthKey];
  if (!m) return;
  monthPicker.value = `${m.year}-${String(m.monthIndex + 1).padStart(2, "0")}`;
}

function renderCompareSelect() {
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

function renderYearOverview() {
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
      `Yearly average completion: ${globalAvg}% - Longest streak across months: ${globalLongestStreak} days`;
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
      `Days tracked: ${stats.daysTracked} - Perfect days: ${stats.perfectDays} - Longest streak: ${stats.longestStreak} days`;

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

function buildTable() {
  const state = getState();
  const currentMonthKey = getCurrentMonthKey();
  const month = state.months[currentMonthKey];
  if (!month) return;

  const editIcon =
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M4 20h4l10-10-4-4L4 16v4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M14 6l4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
    '</svg>';
  const trashIcon =
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M4 7h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
    '<path d="M9 7V5h6v2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
    '<path d="M7 7l1 12h8l1-12" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' +
    '</svg>';

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
    renameBtn.innerHTML = editIcon;
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
    deleteBtn.innerHTML = trashIcon;
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

// --- js/auth.js ---
let isAuthenticated = false;
let authMode = "login";
const PROFILE_TABLE = "profiles";
const DEFAULT_AUTH_TITLE = "Welcome back";
const DEFAULT_AUTH_SUBTITLE = "Sign in to access your dashboard.";
const SIGNUP_AUTH_TITLE = "Create your account";
const SIGNUP_AUTH_SUBTITLE = "Add your name, email, and password to get started.";

function updateAccountButton() {
  if (!accountBtn) return;
  accountBtn.textContent = isAuthenticated ? "My account" : "Login";
  if (!isAuthenticated) {
    accountDropdown?.classList.add("is-hidden");
    if (accountEmail) accountEmail.textContent = "Guest";
  }
  if (appRoot) appRoot.dataset.auth = isAuthenticated ? "in" : "out";
}

function setView(view) {
  if (!trackerView || !dashboardView) return;
  if (view === "dashboard") {
    trackerView.classList.add("is-hidden");
    dashboardView.classList.remove("is-hidden");
    updateDashboardStats();
  } else {
    dashboardView.classList.add("is-hidden");
    trackerView.classList.remove("is-hidden");
  }
}

function openModal() {
  if (!authModal) return;
  authModal.classList.remove("is-hidden");
  authModal.setAttribute("aria-hidden", "false");
  setAuthMode("login");
  setAuthMessage("");
}

function closeModal() {
  if (!authModal) return;
  authModal.classList.add("is-hidden");
  authModal.setAttribute("aria-hidden", "true");
  setAuthMessage("");
}

function toggleAccountMenu() {
  if (!accountDropdown) return;
  accountDropdown.classList.toggle("is-hidden");
}

function closeAccountMenu() {
  accountDropdown?.classList.add("is-hidden");
}

function emitSyncStatus(status) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("sync-status", { detail: { status } }));
}

async function syncAfterAuth() {
  const remoteState = await fetchRemoteState();
  if (remoteState) {
    const updated = setStateFromRemote(remoteState);
    if (updated) {
      renderMonthPicker();
      buildTable();
      renderCompareSelect();
      updateComparison();
      renderYearOverview();
    }
  } else {
    saveState(getState());
  }
  updateDashboardStats();
}

async function upsertProfileFromSession(session) {
  if (!session?.user) return;
  const client = getSupabaseClient();
  if (!client) return;

  const fullName = session.user.user_metadata?.full_name || authName?.value?.trim();
  const email = session.user.email || authEmail?.value?.trim();
  if (!fullName && !email) return;

  await client.from(PROFILE_TABLE).upsert(
    {
      user_id: session.user.id,
      full_name: fullName || null,
      email: email || null,
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id" }
  );
}

function setAuthMessage(message, type = "info") {
  if (!authMessage) return;
  if (!message) {
    authMessage.textContent = "";
    authMessage.classList.remove("is-visible", "is-error");
    return;
  }
  authMessage.textContent = message;
  authMessage.classList.add("is-visible");
  if (type === "error") authMessage.classList.add("is-error");
  else authMessage.classList.remove("is-error");
}

function setAuthMode(mode) {
  const isReset = mode === "reset";
  const isSignup = mode === "signup";
  const isForgot = mode === "forgot";
  authMode = mode;
  setAuthMessage("");
  if (authModal) {
    authModal.classList.remove("auth-mode-login", "auth-mode-signup", "auth-mode-forgot", "auth-mode-reset");
    authModal.classList.add(`auth-mode-${mode}`);
  }
  authLoginForm?.classList.toggle("is-hidden", isReset);
  authResetForm?.classList.toggle("is-hidden", !isReset);
  authNameField?.classList.toggle("is-hidden", !isSignup);
  authForgotBtn?.classList.toggle("is-hidden", isSignup || isForgot);
  authPasswordField?.classList.toggle("is-hidden", isForgot);
  if (authTitle) authTitle.textContent = isReset ? "Reset your password" : DEFAULT_AUTH_TITLE;
  if (authSubtitle) {
    authSubtitle.textContent = isReset
      ? "Enter a new password to finish resetting your account."
      : DEFAULT_AUTH_SUBTITLE;
  }
  if (isForgot) {
    if (authTitle) authTitle.textContent = "Reset your password";
    if (authSubtitle) authSubtitle.textContent = "We'll send a reset link to your email.";
  }
  if (isSignup) {
    if (authTitle) authTitle.textContent = SIGNUP_AUTH_TITLE;
    if (authSubtitle) authSubtitle.textContent = SIGNUP_AUTH_SUBTITLE;
  }
  if (!isSignup && authName) authName.value = "";
  if (authPassword) {
    if (isSignup) authPassword.autocomplete = "new-password";
    else authPassword.autocomplete = "current-password";
  }
  if (authSubmitBtn) {
    if (isSignup) authSubmitBtn.textContent = "Sign up";
    else if (isForgot) authSubmitBtn.textContent = "Reset your password";
    else authSubmitBtn.textContent = "Login";
  }
  if (authSwitchBtn) {
    if (isSignup || isForgot) authSwitchBtn.textContent = "Back to login";
    else authSwitchBtn.textContent = "Create account";
  }
  if (authSwitchHint) {
    if (isSignup) authSwitchHint.textContent = "Already have an account?";
    else if (isForgot) authSwitchHint.textContent = "Remembered your password?";
    else authSwitchHint.textContent = "New here?";
  }
}

function getResetRedirectUrl() {
  const url = new URL(window.location.href);
  url.hash = "";
  url.searchParams.delete("code");
  url.searchParams.delete("type");
  url.searchParams.set("reset", "1");
  return url.toString();
}

function clearRecoveryUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete("code");
  url.searchParams.delete("type");
  url.searchParams.delete("reset");
  url.hash = "";
  window.history.replaceState({}, document.title, url.toString());
}

function openResetModal(message) {
  openModal();
  setAuthMode("reset");
  setAuthMessage(message || "Set a new password to finish the reset.");
}

async function handlePasswordReset() {
  const email = authEmail?.value?.trim();
  if (!email) {
    setAuthMessage("Enter your email first so we can send a reset link.", "error");
    return;
  }

  const client = getSupabaseClient();
  if (!client) {
    setAuthMessage("Supabase client not available.", "error");
    return;
  }

  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: getResetRedirectUrl()
  });
  if (error) {
    setAuthMessage(error.message, "error");
    return;
  }
  setAuthMessage("Password reset link sent. Check your email.");
}

async function handleUpdatePassword() {
  const newPassword = authResetPassword?.value || "";
  const confirmPassword = authResetConfirm?.value || "";
  if (!newPassword || !confirmPassword) {
    setAuthMessage("Enter and confirm your new password.", "error");
    return;
  }
  if (newPassword.length < 6) {
    setAuthMessage("Password should be at least 6 characters.", "error");
    return;
  }
  if (newPassword !== confirmPassword) {
    setAuthMessage("Passwords do not match.", "error");
    return;
  }

  const client = getSupabaseClient();
  if (!client) {
    setAuthMessage("Supabase client not available.", "error");
    return;
  }

  const { error } = await client.auth.updateUser({ password: newPassword });
  if (error) {
    setAuthMessage(error.message, "error");
    return;
  }

  setAuthMessage("Password updated. You're signed in.");
  if (authResetPassword) authResetPassword.value = "";
  if (authResetConfirm) authResetConfirm.value = "";
  closeModal();
  setView("tracker");
  isAuthenticated = true;
  updateAccountButton();
  await syncAfterAuth();
}

async function handleRecoveryRedirect(client) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const wantsReset = url.searchParams.get("reset") === "1";
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const hashType = hashParams.get("type");

  if (code) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (error) {
      setAuthMode("login");
      setAuthMessage(error.message, "error");
      openModal();
      return;
    }
    clearRecoveryUrl();
    openResetModal();
    return;
  }

  if (hashType === "recovery" || wantsReset) {
    openResetModal();
  }
}

async function handleAuth(isSignup) {
  if (authMode === "forgot") {
    await handlePasswordReset();
    return;
  }
  if (isSignup && authMode !== "signup") {
    setAuthMode("signup");
    return;
  }
  if (!isSignup && authMode !== "login") {
    setAuthMode("login");
    return;
  }
  const email = authEmail?.value?.trim();
  const password = authPassword?.value;
  const name = authName?.value?.trim();
  if (!email || !password) {
    setAuthMessage("Please enter email and password.", "error");
    return;
  }
  if (isSignup && !name) {
    setAuthMessage("Please enter your name.", "error");
    return;
  }

  const client = getSupabaseClient();
  if (!client) {
    setAuthMessage("Supabase client not available.", "error");
    return;
  }

  const { data, error } = isSignup
    ? await client.auth.signUp({ email, password, options: { data: { full_name: name } } })
    : await client.auth.signInWithPassword({ email, password });

  if (error) {
    setAuthMessage(error.message, "error");
    return;
  }

  if (isSignup && !data?.session) {
    setAuthMessage("");
    isAuthenticated = false;
    updateAccountButton();
    setAuthMessage("Check your email to confirm your account, then log in.");
    return;
  }

  closeModal();
  setView("tracker");
  isAuthenticated = true;
  updateAccountButton();
  if (data?.session) await upsertProfileFromSession(data.session);
  if (isSignup && authName) authName.value = "";
  await syncAfterAuth();
}

function handleAddActivity() {
  setView("tracker");
  if (appRoot?.classList.contains("customize-off")) {
    customizeToggle?.click();
  }
  addActivityBtn?.click();
}

function handleCompare() {
  setView("tracker");
  compareSelect?.focus();
  compareSelect?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function handleAuthSwitch() {
  if (authMode === "signup" || authMode === "forgot") setAuthMode("login");
  else setAuthMode("signup");
}

function initAuth() {
  if (!authModal) return;

  accountBtn?.addEventListener("click", () => {
    if (isAuthenticated) {
      toggleAccountMenu();
    } else {
      openModal();
    }
  });
  authCloseBtn?.addEventListener("click", closeModal);
  authBackdrop?.addEventListener("click", closeModal);

  authSubmitBtn?.addEventListener("click", () => handleAuth(authMode === "signup"));
  authSwitchBtn?.addEventListener("click", handleAuthSwitch);
  authForgotBtn?.addEventListener("click", () => setAuthMode("forgot"));
  authResetBtn?.addEventListener("click", handleUpdatePassword);
  authResetBackBtn?.addEventListener("click", () => {
    setAuthMode("login");
    setAuthMessage("");
  });

  dashboardGoToTracker?.addEventListener("click", () => setView("tracker"));
  accountDashboardBtn?.addEventListener("click", () => {
    closeAccountMenu();
    setView("dashboard");
  });
  logoutBtn?.addEventListener("click", async () => {
    const client = getSupabaseClient();
    if (client) await client.auth.signOut();
    isAuthenticated = false;
    updateAccountButton();
    setView("tracker");
    emitSyncStatus("offline");
  });
  accountLogoutBtn?.addEventListener("click", async () => {
    closeAccountMenu();
    const client = getSupabaseClient();
    if (client) await client.auth.signOut();
    isAuthenticated = false;
    updateAccountButton();
    setView("tracker");
    emitSyncStatus("offline");
  });

  dashboardAddActivity?.addEventListener("click", handleAddActivity);
  dashboardCompare?.addEventListener("click", handleCompare);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !authModal.classList.contains("is-hidden")) {
      closeModal();
    }
  });
  document.addEventListener("click", (event) => {
    if (!accountDropdown || !accountBtn) return;
    if (accountDropdown.classList.contains("is-hidden")) return;
    if (accountDropdown.contains(event.target) || accountBtn.contains(event.target)) return;
    closeAccountMenu();
  });

  const client = getSupabaseClient();
  if (!client) {
    setView("tracker");
    emitSyncStatus("offline");
    return;
  }

  handleRecoveryRedirect(client);
  client.auth.getSession().then(({ data }) => {
    isAuthenticated = Boolean(data.session);
    updateAccountButton();
    if (accountEmail) accountEmail.textContent = data.session?.user?.email || "Guest";
    setView("tracker");
    if (isAuthenticated) {
      upsertProfileFromSession(data.session);
      syncAfterAuth();
    }
    else emitSyncStatus("offline");
  });

  client.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      isAuthenticated = Boolean(session);
      updateAccountButton();
      if (accountEmail) accountEmail.textContent = session?.user?.email || "Guest";
      clearRecoveryUrl();
      openResetModal();
      return;
    }

    isAuthenticated = Boolean(session);
    updateAccountButton();
    if (accountEmail) accountEmail.textContent = session?.user?.email || "Guest";
    if (isAuthenticated) upsertProfileFromSession(session);
    else setView("tracker");
  });
}

// --- js/app.js ---
// Daily Activity Tracker v2.0 (module split)

let noticeTimer = null;
function showLoginNotice(message) {
  if (!authNotice || !authNoticeText) return;
  authNoticeText.textContent = message;
  authNotice.classList.remove("is-hidden");
  authNotice.setAttribute("aria-hidden", "false");
  if (noticeTimer) clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => {
    authNotice.classList.add("is-hidden");
    authNotice.setAttribute("aria-hidden", "true");
  }, 1500);
}

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
  if (appRoot.dataset.auth !== "in") {
    showLoginNotice("Please login to customize the columns.");
    return;
  }
  const isOn = toggleCustomizeMode();
  if (isOn) {
    appRoot.classList.remove("customize-off");
    appRoot.classList.add("customize-on");
    customizeToggle.textContent = "Done customizing";
  } else {
    appRoot.classList.remove("customize-on");
    appRoot.classList.add("customize-off");
    customizeToggle.textContent = "Customize";
  }
});

initState();
renderMonthPicker();
buildTable();
renderCompareSelect();
updateComparison();
initAuth();

window.addEventListener("sync-status", (event) => {
  updateSyncStatus(event.detail?.status);
});


