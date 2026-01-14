import { ACTIVITY_OPTIONS } from "./config.js";

export function getPctFromValue(value) {
  const opt = ACTIVITY_OPTIONS.find((o) => o.value === value);
  return opt ? opt.pct : 0;
}

export function stageFromActivityValue(value) {
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

export function stageFromOverview(overview) {
  if (overview === null || isNaN(overview)) return { stage: 0, label: "Not set", danger: false };
  if (overview === 0) return { stage: 0, label: "No progress", danger: true };
  if (overview < 40) return { stage: 1, label: "Light progress", danger: false };
  if (overview < 70) return { stage: 2, label: "Moderate progress", danger: false };
  if (overview < 100) return { stage: 3, label: "Strong progress", danger: false };
  return { stage: 4, label: "Perfect day", danger: false };
}

// Key logic: "none" counts as 0% and is included in the average.
export function computeOverviewValueFromActivities(activitiesArray) {
  const total = Array.isArray(activitiesArray) ? activitiesArray.length : 0;
  if (total === 0) return null;

  let sum = 0;
  activitiesArray.forEach((val) => {
    sum += getPctFromValue(val);
  });

  return Math.round(sum / total);
}
