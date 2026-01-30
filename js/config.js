export const STORAGE_KEY = "daily_activity_tracker_v3_0";

export const ACTIVITY_OPTIONS = [
  { value: "none",   label: "⚪ Not set",             pct: 0 },
  { value: "unable", label: "⛔ Couldn't do today",   pct: 0 },
  { value: "25",     label: "🟡 25% done",           pct: 25 },
  { value: "50",     label: "🟡 50% done",           pct: 50 },
  { value: "75",     label: "🟢 75% done",           pct: 75 },
  { value: "100",    label: "✅ 100% completed",     pct: 100 },
];
