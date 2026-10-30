import { state, SPORTS, SIZE, resetTeamForm, syncTeamsAndRegistrations } from '../state.js';
import { getAuthHeaders } from '../utils.js';
import { handleUnauthorized } from '../auth.js';
import { safeJson } from './base.js';

export async function submitTeamForm() {
  const tf = state.teamForm;
  tf.loading = true;
  tf.error = '';
  tf.success = '';

  const playersList = String(tf.playersText || '')
    .split(/[\n,;]+/)
    .map(s => s.trim())
    .filter(Boolean);

  const siNum = Number(tf.si) || 0;
  const sportName = SPORTS[siNum] || 'Football';
  const promoCode = tf.promo || 'A1';
  const teamName = String(tf.name || '').trim() || `${promoCode} ${sportName}`;
  const captainName = String(tf.captain || '').trim() || playersList[0] || `Capitaine ${promoCode}`;
  const maxP = Math.max(1, Number(tf.maxPlayers) || (SIZE[siNum] || 5) + 3, playersList.length);

  const payload = {
    promo: promoCode,
    si: siNum,
    name: teamName,
    captain: captainName,
    email: String(tf.email || '').trim(),
    maxPlayers: maxP,
    playersList
  };

  const isEdit = Boolean(tf.editingId);

  try {
    const url = isEdit ? `/api/teams/${encodeURIComponent(tf.editingId)}` : '/api/teams';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload)
    });

    if (res.status === 401) return handleUnauthorized();
    const data = await safeJson(res);

    if (res.ok && !data._nonJson) {
      if (Array.isArray(data.teams)) state.teams = data.teams;
      syncTeamsAndRegistrations();
      resetTeamForm();
      state.teamForm.success = isEdit ? "L'équipe a été modifiée avec succès." : 'Nouvelle équipe créée avec succès.';
    } else {
      tf.error = data.error || "Erreur lors de l'enregistrement de l'équipe.";
    }
  } catch (err) {
    tf.error = "Erreur lors de l'enregistrement de l'équipe.";
  } finally {
    state.teamForm.loading = false;
  }
}

export async function changeTeamMaxPlayers(teamId, delta) {
  state.teamActionError = '';
  state.teamActionSuccess = '';
  const idNum = String(teamId);
  const team = state.teams.find(t => String(t.id) === idNum);
  if (!team) return;

  const curPlayers = (team.playersList || []).length;
  const nextMax = Math.max(1, curPlayers, (team.maxPlayers || 10) + Number(delta));

  try {
    const res = await fetch(`/api/teams/${encodeURIComponent(idNum)}/max-players`, {
      method: 'PATCH',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ delta: Number(delta), maxPlayers: nextMax })
    });
    if (res.status === 401) return handleUnauthorized();
    const data = await safeJson(res);
    if (res.ok && !data._nonJson && Array.isArray(data.teams)) {
      state.teams = data.teams;
      syncTeamsAndRegistrations();
      state.teamActionSuccess = 'Capacité de l\'équipe mise à jour.';
    } else {
      state.teamActionError = data.error || 'Erreur lors de la mise à jour.';
    }
  } catch (err) {
    state.teamActionError = 'Erreur de connexion au serveur.';
  }
}

export async function addPlayerToTeam(teamId) {
  const idNum = String(teamId);
  const fullName = String(state.newPlayerInputs[idNum] || '').trim();
  if (!fullName) {
    state.teamActionError = 'Veuillez saisir le prénom et le nom du joueur à ajouter.';
    return;
  }
  state.teamActionError = '';
  state.teamActionSuccess = '';

  const team = state.teams.find(t => String(t.id) === idNum);
  if (!team) return;

  const curList = Array.isArray(team.playersList) ? [...team.playersList] : [];
  const maxP = team.maxPlayers || 10;

  if (curList.length >= maxP) {
    state.teamActionError = `Capacité maximale atteinte (${curList.length}/${maxP} joueurs).`;
    return;
  }

  try {
    const res = await fetch(`/api/teams/${encodeURIComponent(idNum)}/players`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ fullName })
    });
    if (res.status === 401) return handleUnauthorized();
    const data = await safeJson(res);

    if (res.ok && !data._nonJson && Array.isArray(data.teams)) {
      state.newPlayerInputs[idNum] = '';
      state.teams = data.teams;
      syncTeamsAndRegistrations();
      state.teamActionSuccess = `Joueur « ${fullName} » ajouté à l'équipe.`;
    } else {
      state.teamActionError = data.error || 'Erreur lors de l\'ajout du joueur.';
    }
  } catch (err) {
    state.teamActionError = 'Erreur de connexion au serveur.';
  }
}

export async function removePlayerFromTeam(teamId, participantId, playerIndex) {
  state.teamActionError = '';
  state.teamActionSuccess = '';
  const idNum = String(teamId);
  const team = state.teams.find(t => String(t.id) === idNum);
  if (!team) return;

  const pDetails = Array.isArray(team.playersDetails) ? [...team.playersDetails] : [];
  let removeIdx = typeof playerIndex === 'number' && !Number.isNaN(playerIndex)
    ? playerIndex
    : pDetails.findIndex(p => String(p.id) === String(participantId));

  if (removeIdx < 0) return;
  const removedName = pDetails[removeIdx]?.fullName || '';

  try {
    const res = await fetch(`/api/teams/${encodeURIComponent(idNum)}/players/${encodeURIComponent(participantId)}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (res.status === 401) return handleUnauthorized();
    const data = await safeJson(res);
    if (res.ok && !data._nonJson && Array.isArray(data.teams)) {
      state.teams = data.teams;
      syncTeamsAndRegistrations();
      state.teamActionSuccess = `Joueur « ${removedName} » retiré de l'équipe.`;
    } else {
      state.teamActionError = data.error || 'Erreur lors de la suppression du joueur.';
    }
  } catch (err) {
    state.teamActionError = 'Erreur de connexion au serveur.';
  }
}

// Une seule route serveur pour réordonner, transférer ou nommer capitaine : POST /api/teams/:id/players/move
function movePlayerRequest(teamId, body) {
  return fetch(`/api/teams/${encodeURIComponent(teamId)}/players/move`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body)
  });
}

export async function movePlayerInOrBetweenTeams(teamId, { participantId, playerIndex, direction, targetTeamId, makeCaptain }) {
  state.teamActionError = '';
  state.teamActionSuccess = '';
  const idNum = String(teamId);
  const team = state.teams.find(t => String(t.id) === idNum);
  if (!team) return;

  const curList = [...(team.playersList || [])];
  const pDetails = Array.isArray(team.playersDetails) ? [...team.playersDetails] : [];
  const idx = typeof playerIndex === 'number' && !Number.isNaN(playerIndex)
    ? playerIndex
    : pDetails.findIndex(p => String(p.id) === String(participantId));

  if (idx < 0 || idx >= curList.length) return;
  const playerName = curList[idx];

  if (targetTeamId && String(targetTeamId) !== idNum) {
    const destId = String(targetTeamId);
    const destTeam = state.teams.find(t => String(t.id) === destId);
    if (!destTeam) return;

    const destList = [...(destTeam.playersList || [])];
    const destMax = destTeam.maxPlayers || 10;

    if (destList.length >= destMax) {
      state.teamActionError = `Capacité maximale atteinte dans l'équipe de destination (${destList.length}/${destMax}).`;
      return;
    }

    try {
      const res = await movePlayerRequest(idNum, { participantId, targetTeamId: destId });
      if (res.status === 401) return handleUnauthorized();
      const data = await safeJson(res);
      if (res.ok && !data._nonJson && Array.isArray(data.teams)) {
        state.teams = data.teams;
        syncTeamsAndRegistrations();
        state.teamActionSuccess = `Joueur « ${playerName} » transféré vers l'équipe ${destTeam.name}.`;
      } else {
        state.teamActionError = data.error || 'Erreur lors du transfert.';
      }
    } catch (err) {
      state.teamActionError = 'Erreur de connexion au serveur.';
    }
    return;
  }

  if (makeCaptain) {
    try {
      const res = await movePlayerRequest(idNum, { participantId, makeCaptain: true });
      if (res.status === 401) return handleUnauthorized();
      const data = await safeJson(res);
      if (res.ok && !data._nonJson && Array.isArray(data.teams)) {
        state.teams = data.teams;
        syncTeamsAndRegistrations();
        state.teamActionSuccess = `Joueur « ${playerName} » désigné comme capitaine.`;
      } else {
        state.teamActionError = data.error || 'Erreur lors de la désignation du capitaine.';
      }
    } catch (err) {
      state.teamActionError = 'Erreur de connexion au serveur.';
    }
    return;
  }

  if (direction === 'up' && idx > 0) {
    [curList[idx - 1], curList[idx]] = [curList[idx], curList[idx - 1]];
  } else if (direction === 'down' && idx < curList.length - 1) {
    [curList[idx], curList[idx + 1]] = [curList[idx + 1], curList[idx]];
  } else {
    return;
  }

  try {
    const res = await movePlayerRequest(idNum, { participantId, direction });
    if (res.status === 401) return handleUnauthorized();
    const data = await safeJson(res);
    if (res.ok && !data._nonJson && Array.isArray(data.teams)) {
      state.teams = data.teams;
      syncTeamsAndRegistrations();
      state.teamActionSuccess = `Joueur « ${playerName} » déplacé.`;
    } else {
      state.teamActionError = data.error || 'Erreur lors du déplacement.';
    }
  } catch (err) {
    state.teamActionError = 'Erreur de connexion au serveur.';
  }
}

export async function deleteTeamById(teamId) {
  const idNum = String(teamId);

  try {
    const res = await fetch(`/api/teams/${encodeURIComponent(idNum)}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (res.status === 401) return handleUnauthorized();
    const data = await safeJson(res);
    if (res.ok && !data._nonJson && Array.isArray(data.teams)) {
      state.teams = data.teams;
      syncTeamsAndRegistrations();
    } else {
      state.teamActionError = data.error || 'Erreur lors de la suppression de l\'équipe.';
    }
  } catch (err) {
    state.teamActionError = 'Erreur de connexion au serveur.';
  }
}
