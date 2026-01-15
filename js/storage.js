import { STORAGE_KEY } from "./config.js";
import { getSupabaseClient } from "./supabase.js";

const REMOTE_TABLE = "tracker_states";

let pendingState = null;
let pendingTimer = null;

function emitSyncStatus(status) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("sync-status", { detail: { status } }));
}

export function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  scheduleRemoteBackup(state);
}

export async function fetchRemoteState() {
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
