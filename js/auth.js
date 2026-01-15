import {
  appRoot,
  accountBtn,
  accountDropdown,
  accountDashboardBtn,
  accountLogoutBtn,
  accountEmail,
  logoutBtn,
  trackerView,
  dashboardView,
  dashboardGoToTracker,
  dashboardAddActivity,
  dashboardCompare,
  authModal,
  authBackdrop,
  authCloseBtn,
  authLoginBtn,
  authSignupBtn,
  authEmail,
  authPassword,
  authMessage,
  authForgotBtn,
  customizeToggle,
  addActivityBtn,
  compareSelect
} from "./dom.js";
import {
  buildTable,
  renderMonthPicker,
  renderCompareSelect,
  renderYearOverview,
  updateComparison,
  updateDashboardStats
} from "./ui.js";
import { getSupabaseClient } from "./supabase.js";
import { fetchRemoteState, saveState } from "./storage.js";
import { getState, setStateFromRemote } from "./state.js";

let isAuthenticated = false;

function updateAccountButton() {
  if (!accountBtn) return;
  accountBtn.textContent = isAuthenticated ? "My account" : "Login";
  if (!isAuthenticated) {
    accountDropdown?.classList.add("is-hidden");
    if (accountEmail) accountEmail.textContent = "Guest";
  }
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

  const { error } = await client.auth.resetPasswordForEmail(email);
  if (error) {
    setAuthMessage(error.message, "error");
    return;
  }
  setAuthMessage("Password reset link sent. Check your email.");
}

async function handleAuth(isSignup) {
  const email = authEmail?.value?.trim();
  const password = authPassword?.value;
  if (!email || !password) {
    setAuthMessage("Please enter email and password.", "error");
    return;
  }

  const client = getSupabaseClient();
  if (!client) {
    setAuthMessage("Supabase client not available.", "error");
    return;
  }

  const { data, error } = isSignup
    ? await client.auth.signUp({ email, password })
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
  setView("dashboard");
  isAuthenticated = true;
  updateAccountButton();
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

export function initAuth() {
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

  authLoginBtn?.addEventListener("click", () => handleAuth(false));
  authSignupBtn?.addEventListener("click", () => handleAuth(true));
  authForgotBtn?.addEventListener("click", handlePasswordReset);

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

  client.auth.getSession().then(({ data }) => {
    isAuthenticated = Boolean(data.session);
    updateAccountButton();
    if (accountEmail) accountEmail.textContent = data.session?.user?.email || "Guest";
    setView(isAuthenticated ? "dashboard" : "tracker");
    if (isAuthenticated) syncAfterAuth();
    else emitSyncStatus("offline");
  });

  client.auth.onAuthStateChange((_event, session) => {
    isAuthenticated = Boolean(session);
    updateAccountButton();
    if (accountEmail) accountEmail.textContent = session?.user?.email || "Guest";
    if (!isAuthenticated) setView("tracker");
  });
}
