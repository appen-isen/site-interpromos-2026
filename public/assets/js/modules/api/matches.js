import { state, VENUE, resetMatchForm } from '../state.js';
import { getAuthHeaders } from '../utils.js';
import { handleUnauthorized } from '../auth.js';
import { safeJson } from './base.js';

export async function changeMatchScore(id, teamIndex, delta) {
  // Affichage immédiat du point (corrigé par la réponse du serveur, annulé en cas d'échec)
  const idx = state.matches.findIndex(x => x.id === id);
  const previous = idx >= 0 ? state.matches[idx] : null;
  if (previous) {
    const scores = [...(previous.scores || [0, 0])];
    scores[teamIndex] = Math.max(0, (scores[teamIndex] || 0) + delta);
    state.matches[idx] = { ...previous, scores };
  }
  const revert = () => {
    const i = state.matches.findIndex(x => x.id === id);
    if (i >= 0 && previous) state.matches[i] = previous;
  };
  try {
    const res = await fetch(`/api/matches/${encodeURIComponent(id)}/score`, {
      method: 'PATCH',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ teamIndex, delta })
    });
    if (res.status === 401) {
      revert();
      return handleUnauthorized();
    }
    const data = await safeJson(res);
    const i = state.matches.findIndex(x => x.id === id);
    if (res.ok && i >= 0 && data.match) state.matches[i] = data.match;
    else if (!res.ok) revert();
    if (data.standings?.general) state.standings = data.standings;
  } catch (err) {
    revert();
    console.error('Erreur mise à jour score :', err);
  }
}

export async function changeMatchStatus(id, status, resetScores = false) {
  try {
    const res = await fetch(`/api/matches/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ status, resetScores })
    });
    if (res.status === 401) return handleUnauthorized();
    if (res.ok) {
      const data = await safeJson(res);
      const idx = state.matches.findIndex(x => x.id === id);
      if (idx >= 0 && data.match) state.matches[idx] = data.match;
      if (data.standings?.general) state.standings = data.standings;
    }
  } catch (err) {
    console.error('Erreur mise à jour statut :', err);
  }
}

export async function submitMatchForm() {
  const mf = state.matchForm;
  if (mf.a === mf.b) {
    mf.error = 'Veuillez sélectionner deux promotions différentes (Promo A ≠ Promo B).';
    mf.success = '';
    return;
  }

  mf.loading = true;
  mf.error = '';
  mf.success = '';

  const payload = {
    d: Number(mf.d),
    t: String(mf.t || '13:30').trim(),
    si: Number(mf.si),
    a: mf.a,
    b: mf.b,
    venue: String(mf.venue || VENUE[mf.si] || '').trim(),
    phase: mf.phase || 'Qualification',
    status: mf.status || 'up',
    scoreA: Number(mf.scoreA) || 0,
    scoreB: Number(mf.scoreB) || 0
  };

  const isEdit = Boolean(mf.editingId);

  try {
    const url = isEdit ? `/api/matches/${encodeURIComponent(mf.editingId)}` : '/api/matches';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload)
    });

    if (res.status === 401) return handleUnauthorized();
    const data = await safeJson(res);

    if (res.ok && !data._nonJson) {
      if (Array.isArray(data.matches)) state.matches = data.matches;
      resetMatchForm();
      state.matchForm.success = isEdit ? 'Match mis à jour avec succès.' : 'Match ajouté au planning.';
    } else {
      mf.error = data.error || "Erreur lors de l'enregistrement du match.";
    }
  } catch (err) {
    mf.error = "Erreur lors de l'enregistrement du match.";
  } finally {
    state.matchForm.loading = false;
  }
}

export async function deleteMatchById(id) {
  try {
    const res = await fetch(`/api/matches/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (res.status === 401) return handleUnauthorized();
    const data = await safeJson(res);
    if (res.ok && !data._nonJson && Array.isArray(data.matches)) {
      state.matches = data.matches;
    }
    if (state.matchForm.editingId === id) {
      resetMatchForm();
    }
  } catch (err) {
    console.error('Erreur suppression match :', err);
  }
}

export async function generateTournamentMatches(clearExisting = false) {
  state.matchForm.loading = true;
  state.matchForm.error = '';
  state.matchForm.success = '';
  try {
    const res = await fetch('/api/matches/generate', {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ clearExisting })
    });
    if (res.status === 401) return handleUnauthorized();
    const data = await safeJson(res);
    if (res.ok && !data._nonJson) {
      if (Array.isArray(data.matches)) state.matches = data.matches;
      await fetchInitialState();
      state.matchForm.success = `${data.createdCount || 0} match(s) généré(s) automatiquement dans le planning.`;
    } else {
      state.matchForm.error = data.error || 'Erreur lors de la génération du planning.';
    }
  } catch (err) {
    state.matchForm.error = 'Erreur lors de la génération du planning.';
  } finally {
    state.matchForm.loading = false;
  }
}
