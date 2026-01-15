import { loadState, saveState } from "./storage.js";
import { getMonthKey, getDaysInMonth } from "./date-utils.js";
import { computeOverviewValueFromActivities } from "./activity-utils.js";

let state = null;
let currentMonthKey = null;
let customizeMode = false;

export function getState() {
  return state;
}

export function getCurrentMonthKey() {
  return currentMonthKey;
}

export function setCurrentMonthKey(key) {
  currentMonthKey = key;
}

export function isCustomizeMode() {
  return customizeMode;
}

export function setCustomizeMode(value) {
  customizeMode = value;
}

export function toggleCustomizeMode() {
  customizeMode = !customizeMode;
  return customizeMode;
}

export function normalizeRowToActivityCount(row) {
  if (!row) return;
  if (!Array.isArray(row.activities)) row.activities = state.activities.map(() => "none");

  if (row.activities.length < state.activities.length) {
    while (row.activities.length < state.activities.length) row.activities.push("none");
  } else if (row.activities.length > state.activities.length) {
    row.activities = row.activities.slice(0, state.activities.length);
  }
}

export function recomputeAllOverviews() {
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

export function setStateFromRemote(remoteState) {
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

export function initState() {
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

export function ensureMonth(year, monthIndex) {
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
