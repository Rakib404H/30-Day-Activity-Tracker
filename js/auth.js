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
  authSubmitBtn,
  authSwitchBtn,
  authTitle,
  authSubtitle,
  authLoginForm,
  authResetForm,
  authNameField,
  authName,
  authEmail,
  authPassword,
  authMessage,
  authForgotBtn,
  authSwitchHint,
  authPasswordField,
  authSwitchRow,
  authResetPassword,
  authResetConfirm,
  authResetBtn,
  authResetBackBtn,
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
