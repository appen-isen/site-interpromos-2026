import { updateConfig } from '../state.js';
import { safeJson } from './base.js';
import { getAuthHeaders } from '../utils.js';

export async function fetchInitialState() {
  try {
    // Le jeton BDS (s'il existe) permet de recevoir aussi les données réservées à l'admin
    const res = await fetch('/api/state', { headers: getAuthHeaders() });
    if (!res.ok) return;
    const data = await safeJson(res);
    if (!data._nonJson) {
      updateConfig(data);
    }
  } catch (err) {
    console.error("Erreur de connexion à l'API :", err);
  }
}
