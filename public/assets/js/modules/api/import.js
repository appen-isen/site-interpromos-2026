import { state, syncTeamsAndRegistrations } from '../state.js';
import { getAuthHeaders } from '../utils.js';
import { handleUnauthorized } from '../auth.js';
import { safeJson } from './base.js';

export async function submitImportCSV() {
  state.importLoading = true;
  state.importError = '';
  state.importSuccess = '';

  const csvContent = state.importCsvContent.trim();
  if (!csvContent) {
    state.importError = 'Veuillez coller le contenu du fichier CSV ou charger un fichier.';
    state.importLoading = false;
    return;
  }

  const payload = {
    promo: state.importPromo,
    csvContent
  };

  try {
    const res = await fetch('/api/import/csv', {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload)
    });

    if (res.status === 401) return handleUnauthorized();
    const data = await safeJson(res);

    if (res.ok && !data._nonJson) {
      if (data.teams) state.teams = data.teams;
      if (data.lastImportedTeams) state.lastImportedTeams = data.lastImportedTeams;
      syncTeamsAndRegistrations();
      state.importSuccess = `${data.importedCount || 0} équipe(s) importée(s) avec succès.`;
      state.importCsvContent = '';
    } else {
      state.importError = data.error || 'Erreur lors de l\'import CSV.';
    }
  } catch (err) {
    state.importError = 'Erreur de connexion au serveur.';
  } finally {
    state.importLoading = false;
  }
}
