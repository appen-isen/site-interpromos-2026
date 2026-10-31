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
