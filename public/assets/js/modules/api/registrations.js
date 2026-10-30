import { state, resetForm, syncTeamsAndRegistrations } from '../state.js';
import { getAuthHeaders } from '../utils.js';
import { handleUnauthorized } from '../auth.js';
import { safeJson } from './base.js';

export async function submitRegistration(SPORTS, SIZE) {
  if (state.formLoading) return;
  const f = state.form;
  const err = {};

  const sportIdx = f.sport ?? 0;
  const minP = SIZE[sportIdx] || 5;
  const maxP = minP + 3;
  const clean = v => String(v || '').trim().replace(/\s+/g, ' ');
  const filledPlayers = f.players.map(clean).filter(Boolean);
  const playerCount = filledPlayers.length;
  const lower = filledPlayers.map(p => p.toLowerCase());
  const duplicates = [...new Set(filledPlayers.filter((p, i) => lower.indexOf(p.toLowerCase()) !== i))];
  const incomplete = filledPlayers.filter(p => p.split(' ').length < 2);

  if (!clean(f.team)) err.team = "Donnez un nom à votre équipe.";
  if (!clean(f.captain)) err.captain = 'Indiquez le nom du capitaine.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) err.email = 'Adresse e-mail invalide.';
  if (incomplete.length > 0) err.players = `Indiquez le prénom et le nom de chaque joueur (${incomplete.slice(0, 3).join(', ')}).`;
  else if (duplicates.length > 0) err.players = `Joueur saisi deux fois : ${duplicates.join(', ')}.`;
  else if (playerCount < minP) err.players = `Il faut au moins ${minP} joueurs (${playerCount} renseigné${playerCount > 1 ? 's' : ''}).`;
  else if (playerCount > maxP) err.players = `${maxP} joueurs maximum.`;
  if (!f.rules) err.rules = 'Acceptez le règlement pour continuer.';

  state.err = err;
  if (Object.keys(err).length > 0) return;

  const payload = {
    sportIndex: sportIdx,
    sport: SPORTS[sportIdx] || '',
    promo: f.promo,
    team: clean(f.team),
    captain: clean(f.captain),
    email: f.email.trim(),
    players: filledPlayers,
    rules: f.rules
  };

  state.formLoading = true;
  try {
    const res = await fetch('/api/registrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await safeJson(res);

    if (res.ok && !data._nonJson && data.reg) {
      resetForm();
      state.sent = data.reg;
    } else if (data.errors) {
      state.err = data.errors;
    } else {
      state.err = { general: data.error || "L'inscription n'a pas pu être enregistrée. Réessayez dans un instant." };
    }
  } catch (e) {
    state.err = { general: 'Impossible de joindre le serveur. Vérifiez votre connexion puis réessayez.' };
  } finally {
    state.formLoading = false;
  }
}

/**
 * Liste complète des inscriptions (admin : avec les e-mails et les dossiers en attente / refusés)
 */
export async function fetchAdminRegistrations() {
  try {
    const res = await fetch('/api/registrations', { headers: getAuthHeaders() });
    if (res.status === 401) return handleUnauthorized();
    const data = await safeJson(res);
    if (res.ok && Array.isArray(data.regs)) state.regs = data.regs;
  } catch (err) {
    console.error('Erreur chargement inscriptions :', err);
  }
}

function applyRegistrationResult(data) {
  if (Array.isArray(data.regs)) state.regs = data.regs;
  if (Array.isArray(data.teams)) {
    state.teams = data.teams;
    syncTeamsAndRegistrations();
  }
}

export async function deleteRegistration(id) {
  state.regActionError = '';
  try {
    const res = await fetch(`/api/registrations/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (res.status === 401) return handleUnauthorized();
    const data = await safeJson(res);
    if (res.ok && !data._nonJson) applyRegistrationResult(data);
    else state.regActionError = data.error || 'Suppression impossible.';
  } catch (err) {
    state.regActionError = 'Impossible de joindre le serveur.';
  }
}

export async function updateRegistrationStatus(id, status) {
  state.regActionError = '';
  try {
    const res = await fetch(`/api/registrations/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ status })
    });
    if (res.status === 401) return handleUnauthorized();
    const data = await safeJson(res);
    if (res.ok && !data._nonJson) applyRegistrationResult(data);
    else state.regActionError = data.error || 'Mise à jour impossible.';
  } catch (err) {
    console.error('Erreur mise à jour inscription :', err);
    state.regActionError = 'Impossible de joindre le serveur.';
  }
}
