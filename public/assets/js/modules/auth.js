import { state } from './state.js';
import { getAuthHeaders } from './utils.js';

export { getAuthHeaders };

// Session BDS  jeton d'accès + jeton de renouvellement, gardés pour l'onglet en cours
const KEYS = { token: 'ip_bds_token', refresh: 'ip_bds_refresh', expires: 'ip_bds_expires' };
let refreshTimer = null;

function storeSession({ token, refreshToken, expiresAt }) {
  state.authToken = token;
  state.isAdminAuthenticated = true;
  try {
    sessionStorage.setItem(KEYS.token, token);
    if (refreshToken) sessionStorage.setItem(KEYS.refresh, refreshToken);
    else sessionStorage.removeItem(KEYS.refresh);
    sessionStorage.setItem(KEYS.expires, String(expiresAt || 0));
  } catch (e) {}
  scheduleRefresh(expiresAt);
}

function clearSession() {
  clearTimeout(refreshTimer);
  state.authToken = null;
  state.isAdminAuthenticated = false;
  try {
    Object.values(KEYS).forEach(k => sessionStorage.removeItem(k));
  } catch (e) {}
}

// Renouvelle le jeton une minute avant son expiration
function scheduleRefresh(expiresAt) {
  clearTimeout(refreshTimer);
  const delay = Number(expiresAt) - Date.now() - 60_000;
  if (!expiresAt || !sessionStorage.getItem(KEYS.refresh)) return;
  refreshTimer = setTimeout(refreshSession, Math.max(delay, 0));
}

async function refreshSession() {
  const refreshToken = sessionStorage.getItem(KEYS.refresh);
  if (!refreshToken) return false;
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    if (!res.ok) {
      handleUnauthorized();
      return false;
    }
    storeSession(await res.json());
    return true;
  } catch (err) {
    return false;
  }
}

export async function verifySession() {
  if (!state.authToken) {
    state.isAdminAuthenticated = false;
    return;
  }
  // Jeton expiré pendant que l'onglet était fermé : on tente un renouvellement
  const expiresAt = Number(sessionStorage.getItem(KEYS.expires)) || 0;
  if (expiresAt && expiresAt - Date.now() < 60_000 && !(await refreshSession())) return;

  try {
    const res = await fetch('/api/auth/me', { headers: getAuthHeaders() });
    if (res.ok) {
      state.isAdminAuthenticated = true;
      scheduleRefresh(Number(sessionStorage.getItem(KEYS.expires)));
    } else {
      clearSession();
    }
  } catch (err) {
    console.error('Erreur vérification session BDS :', err);
  }
}

export async function submitAdminLogin() {
  const email = state.loginEmail.trim();
  const password = state.loginPassword;
  if (!email || !password) {
    state.loginError = 'Saisissez votre adresse e-mail et votre mot de passe.';
    return;
  }

  state.loginLoading = true;
  state.loginError = '';
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.token) {
      storeSession(data);
      state.loginEmail = '';
      state.loginPassword = '';
    } else {
      state.loginError = data.error || 'Connexion refusée.';
    }
  } catch (err) {
    state.loginError = 'Impossible de joindre le serveur.';
  } finally {
    state.loginLoading = false;
    state.loginPassword = '';
  }
}

export async function submitAdminLogout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST', headers: getAuthHeaders() });
  } catch (e) {}
  clearSession();
  state.loginEmail = '';
  state.loginError = '';
}

export function handleUnauthorized() {
  clearSession();
  state.loginError = 'Votre session a expiré. Veuillez vous reconnecter.';
}

// -----------------------------------------------------------------------------
// Mot de passe oublié
// -----------------------------------------------------------------------------

/**
 * Retourne true si un lien de réinitialisation a été détecté (le formulaire « nouveau mot de passe » s'ouvre).
 */
export function detectPasswordRecovery() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  if (params.get('type') !== 'recovery' || !params.get('access_token')) return false;
  state.loginMode = 'reset';
  state.recoveryToken = params.get('access_token');
  // Le jeton ne doit pas rester visible dans l'adresse ni dans l'historique
  history.replaceState(null, '', `${window.location.pathname}#admin`);
  return true;
}

export async function submitPasswordRecovery() {
  const email = state.loginEmail.trim();
  if (!email) {
    state.loginError = 'Saisissez votre adresse e-mail.';
    return;
  }
  state.loginLoading = true;
  state.loginError = '';
  try {
    const res = await fetch('/api/auth/recover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) state.recoverySent = true;
    else state.loginError = data.error || "L'e-mail n'a pas pu être envoyé.";
  } catch (err) {
    state.loginError = 'Impossible de joindre le serveur.';
  } finally {
    state.loginLoading = false;
  }
}

export async function submitNewPassword() {
  const { newPassword, newPasswordConfirm } = state;
  if (newPassword.length < 10) {
    state.loginError = 'Le mot de passe doit contenir au moins 10 caractères.';
    return;
  }
  if (newPassword !== newPasswordConfirm) {
    state.loginError = 'Les deux mots de passe ne sont pas identiques.';
    return;
  }
  state.loginLoading = true;
  state.loginError = '';
  try {
    const res = await fetch('/api/auth/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${state.recoveryToken}` },
      body: JSON.stringify({ password: newPassword })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      state.loginMode = 'login';
      state.recoveryToken = null;
      state.loginNotice = 'Mot de passe modifié. Vous pouvez vous connecter.';
    } else {
      state.loginError = data.error || 'Le mot de passe n’a pas pu être modifié.';
    }
  } catch (err) {
    state.loginError = 'Impossible de joindre le serveur.';
  } finally {
    state.loginLoading = false;
    state.newPassword = '';
    state.newPasswordConfirm = '';
  }
}
