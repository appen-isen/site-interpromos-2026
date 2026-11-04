import { state, EDITION } from '../state.js';
import { getAuthHeaders } from '../utils.js';
import { handleUnauthorized } from '../auth.js';
import { safeJson } from './base.js';
import { fetchInitialState } from './state.js';

// Formulaire pré-rempli avec l'édition en cours
export function openEditionForm() {
  state.editionForm = {
    year: String(EDITION.year),
    start: EDITION.start,
    time: EDITION.time,
    venue: EDITION.venue,
    contact: EDITION.contact || '',
    instagram: EDITION.instagram || '',
    error: '',
    success: '',
    loading: false
  };
}

export async function saveEdition() {
  const f = state.editionForm;
  if (!f) return;
  f.error = '';
  f.success = '';
  if (!/^\d{4}$/.test(f.year)) {
    f.error = 'Indiquez une année sur 4 chiffres.';
    return;
  }
  if (!f.start || f.start.slice(0, 4) !== f.year) {
    f.error = "La date du premier jour doit tomber pendant l'année de l'édition.";
    return;
  }

  f.loading = true;
  try {
    const res = await fetch('/api/edition', {
      method: 'PUT',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ year: Number(f.year), start: f.start, time: f.time, venue: f.venue, contact: f.contact, instagram: f.instagram })
    });
    if (res.status === 401) return handleUnauthorized();
    const data = await safeJson(res);
    if (!res.ok || data._nonJson) {
      f.error = data.error || "L'édition n'a pas pu être enregistrée.";
      return;
    }
    // Recharge toute la configuration (jours du planning, compte à rebours, titres…)
    await fetchInitialState();
    openEditionForm();
    state.editionForm.success = `Édition ${data.year} enregistrée : ${data.range} · ${data.venue}.`;
  } catch (err) {
    f.error = 'Impossible de joindre le serveur.';
  } finally {
    if (state.editionForm) state.editionForm.loading = false;
  }
}

/**
 * Ouvre / ferme les inscriptions ou règle l'échéance : { open } et/ou { deadline } (« AAAA-MM-JJTHH:MM », '' = coup d'envoi)
 */
export async function saveRegistrationSettings(changes, successMessage) {
  const f = state.regSettings;
  if (f.loading) return;
  f.error = '';
  f.success = '';
  f.loading = true;
  try {
    const res = await fetch('/api/edition/registrations', {
      method: 'PUT',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(changes)
    });
    if (res.status === 401) return handleUnauthorized();
    const data = await safeJson(res);
    if (!res.ok || data._nonJson) {
      f.error = data.error || "Le statut des inscriptions n'a pas pu être enregistré.";
      return;
    }
    EDITION.registrations = data;
    if ('deadline' in changes) f.deadline = null;
    f.success = successMessage;
  } catch (err) {
    f.error = 'Impossible de joindre le serveur.';
  } finally {
    f.loading = false;
  }
}

/**
 * Réglages de l'écran TV : sport affiché (indice ou '' = tous) et message défilant ('' = aucun)
 */
export async function saveTvSettings() {
  const f = state.tvForm;
  if (f.loading) return;
  const current = EDITION.tv || {};
  const sport = f.sport ?? (current.sport ?? '');
  const message = f.message ?? (current.message || '');
  f.error = '';
  f.success = '';
  if (message.length > 200) {
    f.error = 'Message trop long (200 caractères max).';
    return;
  }
  f.loading = true;
  try {
    const res = await fetch('/api/edition/tv', {
      method: 'PUT',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ sport: sport === '' ? null : Number(sport), message })
    });
    if (res.status === 401) return handleUnauthorized();
    const data = await safeJson(res);
    if (!res.ok || data._nonJson) {
      f.error = data.error || "Les réglages du mode TV n'ont pas pu être enregistrés.";
      return;
    }
    EDITION.tv = data;
    f.sport = null;
    f.message = null;
    f.success = "Écran TV mis à jour (les écrans ouverts s'actualisent sous 15 secondes).";
  } catch (err) {
    f.error = 'Impossible de joindre le serveur.';
  } finally {
    f.loading = false;
  }
}
