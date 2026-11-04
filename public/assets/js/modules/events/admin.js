// Espace BDS : connexion, onglets, scores en direct, matchs, équipes, inscriptions, réglages
import { state, VENUE, SIZE, EDITION, registrationStatus, resetMatchForm, resetTeamForm } from '../state.js';
import { submitAdminLogin, submitAdminLogout, submitPasswordRecovery, submitNewPassword } from '../auth.js';
import {
  fetchInitialState,
  fetchAdminMedia,
  changeMatchScore,
  changeMatchStatus,
  submitMatchForm,
  deleteMatchById,
  generateTournamentMatches,
  submitTeamForm,
  changeTeamMaxPlayers,
  addPlayerToTeam,
  removePlayerFromTeam,
  movePlayerInOrBetweenTeams,
  deleteTeamById,
  updateRegistrationStatus,
  fetchAdminRegistrations,
  deleteRegistration,
  openEditionForm,
  saveEdition,
  saveRegistrationSettings,
  saveTvSettings
} from '../api/index.js';
import { track } from './helpers.js';

const L = 'var(--line)';

// Messages et formulaires propres à un onglet, effacés quand on en change
function resetTabMessages() {
  state.sideOpen = false;
  state.teamActionError = '';
  state.teamActionSuccess = '';
  state.igForm.error = '';
  state.igForm.success = '';
  state.regSettings = { deadline: null, error: '', success: '', loading: false };
  state.tvForm = { sport: null, message: null, error: '', success: '', loading: false };
}

// Données à recharger à l'ouverture de certains onglets
const TAB_LOADERS = {
  edition: async () => openEditionForm(),
  galerie: fetchAdminMedia,
  inscriptions: fetchAdminRegistrations
};

function editMatch(m) {
  state.matchForm = {
    editingId: m.id,
    d: m.d,
    t: m.t || '13:30',
    si: m.si,
    teamA: m.teamAId || '',
    teamB: m.teamBId || '',
    venue: m.venue || VENUE[m.si] || '',
    phase: m.phase || 'Qualification',
    status: m.status || 'up',
    scoreA: m.scores?.[0] ?? 0,
    scoreB: m.scores?.[1] ?? 0,
    error: '',
    success: '',
    loading: false
  };
}

function editTeam(t) {
  state.teamForm = {
    editingId: t.id,
    promo: t.p,
    si: t.si,
    name: t.name || `${t.p} ${t.sport}`,
    captain: t.captain || '',
    email: t.email || '',
    maxPlayers: t.maxPlayers || 10,
    playersText: (t.playersList || []).join(', '),
    error: '',
    success: '',
    loading: false
  };
}

async function saveDeadline({ action, render }) {
  const clear = action === 'reg-clear-deadline';
  const deadline = clear ? '' : (state.regSettings.deadline ?? EDITION.registrations?.deadlineLocal ?? '');
  if (!clear && !deadline) {
    state.regSettings.error = 'Choisissez une date et une heure de clôture.';
    render();
    return;
  }
  const message = clear ? "Échéance retirée : clôture automatique au coup d'envoi." : 'Échéance de clôture enregistrée.';
  await track(saveRegistrationSettings({ deadline }, message), render);
}

export const clickActions = {
  // Connexion
  'admin-login': async ({ render }) => {
    const p = submitAdminLogin();
    render();
    await p;
    if (state.isAdminAuthenticated) await Promise.all([fetchInitialState(), fetchAdminMedia()]);
    render();
  },
  'login-mode': ({ btn, render }) => {
    state.loginMode = btn.dataset.mode;
    state.loginError = '';
    state.loginNotice = '';
    state.recoverySent = false;
    render();
  },
  'send-recovery': ({ render }) => track(submitPasswordRecovery(), render),
  'save-new-password': ({ render }) => track(submitNewPassword(), render),
  'admin-logout': async ({ go }) => {
    await submitAdminLogout();
    // Recharge les données publiques (sans e-mails) après la déconnexion
    await fetchInitialState();
    go('home');
  },

  // Navigation dans l'Espace BDS
  'toggle-side': ({ render }) => {
    // Téléphone : le menu s'ouvre par-dessus la page ; ordinateur : il se réduit aux icônes
    if (window.matchMedia('(max-width: 720px)').matches) state.sideOpen = !state.sideOpen;
    else state.sideCollapsed = !state.sideCollapsed;
    render();
  },
  'admin-tab': async ({ btn, render }) => {
    state.adminTab = btn.dataset.tab;
    resetTabMessages();
    render();
    const load = TAB_LOADERS[state.adminTab];
    if (load) {
      await load();
      render();
    }
  },
  'refresh-state': async ({ render }) => {
    await fetchInitialState();
    render();
  },
  'admin-day': ({ btn, render }) => {
    state.adminDay = Number(btn.dataset.day);
    render();
  },

  // Scores en direct
  'match-score': ({ btn, render }) =>
    track(changeMatchScore(btn.dataset.id, Number(btn.dataset.team), Number(btn.dataset.delta)), render),
  'match-status': async ({ btn, render }) => {
    if (btn.dataset.confirm && !confirm(btn.dataset.confirm)) return;
    await changeMatchStatus(btn.dataset.id, btn.dataset.status, btn.dataset.reset === 'true');
    render();
  },

  // Matchs
  'save-match': ({ render }) => track(submitMatchForm(), render),
  'edit-match': ({ btn, render }) => {
    const m = state.matches.find(x => x.id === btn.dataset.id);
    if (!m) return;
    editMatch(m);
    window.scrollTo(0, 0);
    render();
  },
  'cancel-edit-match': ({ render }) => {
    resetMatchForm();
    render();
  },
  'delete-match': async ({ btn, render }) => {
    await deleteMatchById(btn.dataset.id);
    render();
  },
  'generate-matches': ({ render }) => {
    if (!confirm("Générer les matchs de qualification ? Dans chaque sport, chaque équipe rencontre une fois chaque équipe d'une autre promo (J1 et J2). Les rencontres déjà programmées ne sont pas recréées.")) return;
    return track(generateTournamentMatches(false), render);
  },

  // Équipes
  'save-team': ({ render }) => track(submitTeamForm(), render),
  'edit-team': ({ btn, render }) => {
    const t = state.teams.find(x => String(x.id) === btn.dataset.id);
    if (!t) return;
    editTeam(t);
    window.scrollTo(0, 0);
    render();
  },
  'cancel-edit-team': ({ render }) => {
    resetTeamForm();
    render();
  },
  'team-max-delta': async ({ btn, render }) => {
    await changeTeamMaxPlayers(btn.dataset.id, Number(btn.dataset.delta));
    render();
  },
  'add-team-player': async ({ btn, render }) => {
    await addPlayerToTeam(btn.dataset.id);
    render();
  },
  'remove-team-player': async ({ btn, render }) => {
    await removePlayerFromTeam(btn.dataset.id, btn.dataset.participantId, Number(btn.dataset.playerIndex));
    render();
  },
  'move-team-player': async ({ btn, render }) => {
    await movePlayerInOrBetweenTeams(btn.dataset.id, {
      participantId: btn.dataset.participantId,
      playerIndex: Number(btn.dataset.playerIndex),
      direction: btn.dataset.dir || null,
      makeCaptain: btn.dataset.makeCaptain === 'true'
    });
    render();
  },
  'delete-team': async ({ btn, render }) => {
    await deleteTeamById(btn.dataset.id);
    render();
  },

  // Inscriptions
  'delete-registration': async ({ btn, render }) => {
    if (!confirm(`Supprimer définitivement l'inscription « ${btn.dataset.team} » ?`)) return;
    await deleteRegistration(btn.dataset.id);
    render();
  },
  'reg-status': async ({ btn, render }) => {
    await updateRegistrationStatus(btn.dataset.id, btn.dataset.status);
    render();
  },
  'reg-toggle-open': ({ render }) => {
    const open = !registrationStatus().manualOpen;
    if (!open && !confirm('Fermer les inscriptions ? Le formulaire public ne pourra plus être envoyé.')) return;
    return track(saveRegistrationSettings({ open }, open ? 'Inscriptions rouvertes.' : 'Inscriptions fermées.'), render);
  },
  'reg-save-deadline': saveDeadline,
  'reg-clear-deadline': saveDeadline,

  // Écran TV et édition
  'save-tv': ({ render }) => track(saveTvSettings(), render),
  'clear-tv-message': ({ render }) => {
    state.tvForm.message = '';
    return track(saveTvSettings(), render);
  },
  'save-edition': ({ render }) => track(saveEdition(), render)
};

export const changeFields = {
  'editionForm-year': ({ render }) => {
    const f = state.editionForm;
    if (!f) return;
    // Changer l'année décale le premier jour sur la même date de la nouvelle année
    if (/^\d{4}$/.test(f.year) && /^\d{4}-\d{2}-\d{2}$/.test(f.start || '') && f.start.slice(0, 4) !== f.year) {
      f.start = `${f.year}${f.start.slice(4)}`;
      render();
    }
  },
  transferPlayerTeam: async ({ target, render }) => {
    const destTeamId = target.value;
    const srcTeamId = target.dataset.teamId;
    if (!destTeamId || !srcTeamId) return;
    await movePlayerInOrBetweenTeams(srcTeamId, {
      participantId: target.dataset.participantId,
      playerIndex: Number(target.dataset.playerIndex),
      targetTeamId: destTeamId
    });
    render();
  }
};

const clearLoginError = target => {
  if (!state.loginError) return;
  state.loginError = '';
  target.style.borderColor = L;
};

const setFilter = ({ target, field, render }) => {
  state[field] = target.value;
  render();
};

// Formulaire de réglages : met la valeur à jour et efface les messages
const formField = (formKey, prefix) => ({ target, field }) => {
  const form = state[formKey];
  if (!form) return;
  form[field.replace(prefix, '')] = target.value;
  form.error = '';
  form.success = '';
};

export const inputFields = {
  loginEmail: ({ target }) => {
    state.loginEmail = target.value;
    clearLoginError(target);
  },
  loginPassword: ({ target }) => {
    state.loginPassword = target.value;
    clearLoginError(target);
  },
  newPassword: ({ target, field }) => {
    state[field] = target.value;
    state.loginError = '';
  },
  newPasswordConfirm: ({ target, field }) => {
    state[field] = target.value;
    state.loginError = '';
  },
  'tvForm-sport': formField('tvForm', 'tvForm-'),
  'tvForm-message': formField('tvForm', 'tvForm-'),
  'regSettings-deadline': formField('regSettings', 'regSettings-'),
  newTeamPlayer: ({ target }) => {
    const teamId = target.dataset.teamId;
    if (teamId) state.newPlayerInputs[teamId] = target.value;
  },
  adminMatchDayF: setFilter,
  adminMatchSportF: setFilter,
  adminMatchStatusF: setFilter,
  adminTeamPromoF: setFilter,
  adminTeamSportF: setFilter
};

export const inputPrefixes = [
  ['editionForm-', formField('editionForm', 'editionForm-')],
  ['team-', ({ target, field, render }) => {
    const key = field.replace('team-', '');
    if (key === 'si') {
      const siNum = Number(target.value);
      state.teamForm.si = siNum;
      if (!state.teamForm.editingId) state.teamForm.maxPlayers = (SIZE[siNum] || 5) + 3;
      render();
    } else if (key === 'maxPlayers') {
      state.teamForm.maxPlayers = Number(target.value);
    } else {
      state.teamForm[key] = target.value;
    }
    state.teamForm.error = '';
  }],
  ['match-', ({ target, field, render }) => {
    const key = field.replace('match-', '');
    state.matchForm.error = '';
    if (key === 'si') {
      const siNum = Number(target.value);
      state.matchForm.si = siNum;
      state.matchForm.venue = VENUE[siNum] || '';
      // Les équipes dépendent du sport : on les choisit à nouveau
      state.matchForm.teamA = '';
      state.matchForm.teamB = '';
      render();
    } else if (key === 'd' || key === 'scoreA' || key === 'scoreB') {
      state.matchForm[key] = Number(target.value);
    } else if (key === 'teamA' || key === 'teamB') {
      // Réaffichage : l'équipe choisie n'est plus proposée dans l'autre liste
      state.matchForm[key] = target.value;
      render();
    } else {
      state.matchForm[key] = target.value;
    }
  }]
];
