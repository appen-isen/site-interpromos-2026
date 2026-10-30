import { state, SPORTS, SIZE, VENUE, EDITION, PROMOS, MASCOT, resetForm, resetMatchForm, resetTeamForm, resetAlbumForm } from './state.js';
import { esc } from './utils.js';
import { toggleTheme } from './theme.js';
import { openLightbox } from './lightbox.js';
import { charterText } from './render-pages.js';
import {
  submitAdminLogin,
  submitAdminLogout,
  submitPasswordRecovery,
  submitNewPassword
} from './auth.js';
import {
  fetchInitialState,
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
  submitRegistration,
  updateRegistrationStatus,
  fetchAdminRegistrations,
  deleteRegistration,
  toggleAlbumVisibility,
  fetchAdminMedia,
  uploadGalleryFiles,
  updateMedia,
  deleteMedia,
  setMediaSlot,
  submitAlbumForm,
  deleteAlbum,
  submitImportCSV,
  openEditionForm,
  saveEdition
} from './api/index.js';

const L = 'var(--line)';

const FUN_TEAM_PATTERNS = [
  (promo, mascot, sport) => `${mascot} United (${promo})`,
  (promo, mascot, sport) => `FC ${mascot} ${promo}`,
  (promo, mascot, sport) => `404 Défaite Not Found · ${promo}`,
  (promo, mascot, sport) => `Les Survoltés d'${promo}`,
  (promo, mascot, sport) => `Sudo Win ${promo} · ${sport}`,
  (promo, mascot, sport) => `${mascot} All-Stars`,
  (promo, mascot, sport) => `La Légion ${promo} (${sport})`,
  (promo, mascot, sport) => `Turbo ${mascot} ${EDITION.year}`
];

function updateLiveInscriptionPreview() {
  const f = state.form;
  const minP = SIZE[f.sport] || 5;
  const maxP = minP + 3;
  const filledPlayers = f.players.map(x => x.trim()).filter(Boolean);
  const filled = filledPlayers.length;
  const sportName = SPORTS[f.sport] || 'Football';

  let readiness = 20;
  if (f.team.trim()) readiness += 20;
  if (f.captain.trim() && /^\S+@\S+\.\S+$/.test(f.email.trim())) readiness += 20;
  if (filled >= minP) readiness += 25;
  else readiness += Math.round((filled / minP) * 20);
  if (f.rules) readiness += 15;
  readiness = Math.min(100, readiness);

  const progBar = document.getElementById('form-progress-bar');
  const progLabel = document.getElementById('form-progress-label');
  if (progBar && progLabel) {
    progBar.style.width = `${readiness}%`;
    progBar.style.background = readiness === 100 ? 'var(--success)' : 'var(--accent)';
    progLabel.textContent = `${readiness}%`;
    progLabel.style.color = readiness === 100 ? 'var(--success)' : 'var(--accent)';
  }

  const hintEl = document.getElementById('form-players-hint');
  if (hintEl) {
    hintEl.textContent = `${filled} / ${minP} titulaires requis (max ${maxP})`;
    hintEl.style.background = filled >= minP ? 'var(--success-bg)' : 'var(--surface-2)';
    hintEl.style.color = filled >= minP ? 'var(--success)' : 'var(--accent)';
    hintEl.style.borderColor = filled >= minP ? 'var(--success)' : 'var(--line)';
  }

  const charter = document.getElementById('form-charter-text');
  if (charter) charter.innerHTML = charterText(f);

  const prevTeam = document.getElementById('preview-team-name');
  if (prevTeam) {
    prevTeam.textContent = f.team.trim() || `${f.promo} ${sportName}`;
  }

  const prevCap = document.getElementById('preview-captain-name');
  if (prevCap) {
    prevCap.textContent = f.captain.trim() || 'À désigner';
  }

  const prevCount = document.getElementById('preview-roster-count');
  if (prevCount) {
    prevCount.textContent = `${filled}/${minP} min.`;
    prevCount.style.color = filled >= minP ? 'var(--success)' : 'var(--accent)';
  }

  const prevList = document.getElementById('preview-roster-list');
  if (prevList) {
    prevList.innerHTML = f.players
      .map((pl, idx) => {
        const name = pl.trim();
        const isSub = idx >= minP;
        return `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 10px;background:var(--bg);border:1px solid ${name ? 'var(--line)' : 'var(--surface-3)'};font-size:12px">
            <span style="color:${name ? 'var(--text)' : 'var(--dim)'}">
              <strong style="color:${isSub ? 'var(--muted)' : 'var(--accent)'};font-family:var(--font-mono);margin-right:6px">#${idx + 1}</strong>
              ${esc(name || (isSub ? 'Remplaçant libre' : 'Titulaire à compléter'))}
            </span>
            <span style="font-size:10px;text-transform:uppercase;color:${isSub ? 'var(--muted)' : 'var(--text-2)'}">${idx === 0 ? '★ CAP' : isSub ? 'REMPL.' : 'TIT.'}</span>
          </div>
        `;
      })
      .join('');
  }
}

let listenersAttached = false;

export function attachEventListeners(render, go) {
  if (listenersAttached) return;
  const root = document.getElementById('root') || document.getElementById('app');
  if (!root) return;
  listenersAttached = true;

  root.addEventListener('click', async e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    e.preventDefault();

    if (action === 'nav') {
      go(btn.dataset.page);
    } else if (action === 'admin-login') {
      const p = submitAdminLogin();
      render();
      await p;
      if (state.isAdminAuthenticated) await Promise.all([fetchInitialState(), fetchAdminMedia()]);
      render();
    } else if (action === 'login-mode') {
      state.loginMode = btn.dataset.mode;
      state.loginError = '';
      state.loginNotice = '';
      state.recoverySent = false;
      render();
    } else if (action === 'send-recovery') {
      const p = submitPasswordRecovery();
      render();
      await p;
      render();
    } else if (action === 'save-new-password') {
      const p = submitNewPassword();
      render();
      await p;
      render();
    } else if (action === 'admin-logout') {
      await submitAdminLogout();
      // Recharge les données publiques (sans e-mails) après la déconnexion
      await fetchInitialState();
      go('home');
    } else if (action === 'admin-tab') {
      state.adminTab = btn.dataset.tab;
      state.teamActionError = '';
      state.teamActionSuccess = '';
      render();
      if (state.adminTab === 'edition') {
        openEditionForm();
        render();
      } else if (state.adminTab === 'galerie') {
        await fetchAdminMedia();
        render();
      } else if (state.adminTab === 'inscriptions') {
        await fetchAdminRegistrations();
        render();
      }
    } else if (action === 'refresh-state') {
      await fetchInitialState();
      render();
    } else if (action === 'admin-day') {
      state.adminDay = Number(btn.dataset.day);
      render();
    } else if (action === 'match-score') {
      const p = changeMatchScore(btn.dataset.id, Number(btn.dataset.team), Number(btn.dataset.delta));
      render();
      await p;
      render();
    } else if (action === 'match-status') {
      if (btn.dataset.confirm && !confirm(btn.dataset.confirm)) return;
      await changeMatchStatus(btn.dataset.id, btn.dataset.status, btn.dataset.reset === 'true');
      render();
    } else if (action === 'save-match') {
      const p = submitMatchForm();
      render();
      await p;
      render();
    } else if (action === 'edit-match') {
      const m = state.matches.find(x => x.id === btn.dataset.id);
      if (m) {
        state.matchForm = {
          editingId: m.id,
          d: m.d,
          t: m.t || '13:30',
          si: m.si,
          a: m.a,
          b: m.b,
          venue: m.venue || VENUE[m.si] || '',
          phase: m.phase || 'Qualification',
          status: m.status || 'up',
          scoreA: m.scores?.[0] ?? 0,
          scoreB: m.scores?.[1] ?? 0,
          error: '',
          success: '',
          loading: false
        };
        window.scrollTo(0, 0);
        render();
      }
    } else if (action === 'cancel-edit-match') {
      resetMatchForm();
      render();
    } else if (action === 'delete-match') {
      await deleteMatchById(btn.dataset.id);
      render();
    } else if (action === 'generate-matches') {
      const p = generateTournamentMatches(false);
      render();
      await p;
      render();
    } else if (action === 'save-team') {
      const p = submitTeamForm();
      render();
      await p;
      render();
    } else if (action === 'edit-team') {
      const t = state.teams.find(x => String(x.id) === btn.dataset.id);
      if (t) {
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
        window.scrollTo(0, 0);
        render();
      }
    } else if (action === 'cancel-edit-team') {
      resetTeamForm();
      render();
    } else if (action === 'team-max-delta') {
      await changeTeamMaxPlayers(btn.dataset.id, Number(btn.dataset.delta));
      render();
    } else if (action === 'add-team-player') {
      await addPlayerToTeam(btn.dataset.id);
      render();
    } else if (action === 'remove-team-player') {
      await removePlayerFromTeam(
        btn.dataset.id,
        btn.dataset.participantId,
        Number(btn.dataset.playerIndex)
      );
      render();
    } else if (action === 'move-team-player') {
      await movePlayerInOrBetweenTeams(btn.dataset.id, {
        participantId: btn.dataset.participantId,
        playerIndex: Number(btn.dataset.playerIndex),
        direction: btn.dataset.dir || null,
        makeCaptain: btn.dataset.makeCaptain === 'true'
      });
      render();
    } else if (action === 'delete-team') {
      await deleteTeamById(btn.dataset.id);
      render();
    } else if (action === 'delete-registration') {
      if (!confirm(`Supprimer définitivement l'inscription « ${btn.dataset.team} » ?`)) return;
      await deleteRegistration(btn.dataset.id);
      render();
    } else if (action === 'reg-status') {
      await updateRegistrationStatus(btn.dataset.id, btn.dataset.status);
      render();
    } else if (action === 'toggle-album') {
      await toggleAlbumVisibility(btn.dataset.name);
      render();
    } else if (action === 'delete-media') {
      if (!confirm('Supprimer définitivement ce média ?')) return;
      await deleteMedia(btn.dataset.id);
      render();
    } else if (action === 'toggle-media-big') {
      await updateMedia(btn.dataset.id, { big: btn.dataset.big !== 'true' });
      render();
    } else if (action === 'set-media-slot') {
      await setMediaSlot(btn.dataset.slot, btn.dataset.id || null);
      render();
    } else if (action === 'submit-album') {
      await submitAlbumForm();
      render();
    } else if (action === 'edit-album') {
      const album = state.albums.find(a => a.id === btn.dataset.id);
      if (album) {
        state.albumForm = {
          editingId: album.id,
          name: album.name,
          start: album.start || '',
          end: album.end || '',
          published: album.published,
          error: ''
        };
        render();
        document.querySelector('[data-field="albumForm-name"]')?.focus();
      }
    } else if (action === 'cancel-album-edit') {
      resetAlbumForm();
      render();
    } else if (action === 'delete-album') {
      if (!confirm(`Supprimer l'album « ${btn.dataset.name} » ?`)) return;
      await deleteAlbum(btn.dataset.id);
      render();
    } else if (action === 'dismiss-media-msg') {
      state.mediaError = '';
      state.mediaSuccess = '';
      render();
    } else if (action === 'import-csv') {
      const p = submitImportCSV();
      render();
      await p;
      render();
    } else if (action === 'hero-sound') {
      const video = document.querySelector('video[data-hero]');
      if (!video) return;
      const sync = () => {
        btn.setAttribute('aria-pressed', String(!video.muted));
        btn.setAttribute('aria-label', video.muted ? 'Activer le son' : 'Couper le son');
        btn.querySelector('.hero-sound-icon').textContent = video.muted ? '🔇' : '🔊';
      };
      video.muted = !video.muted;
      sync();
      // Si le navigateur refuse la lecture avec le son, on repasse en sourdine pour que la vidéo continue
      video.play().catch(() => {
        video.muted = true;
        sync();
        video.play().catch(() => {});
      });
    } else if (action === 'save-edition') {
      const p = saveEdition();
      render();
      await p;
      render();
    } else if (action === 'toggle-theme') {
      toggleTheme();
      render();
    } else if (action === 'scroll-to') {
      document.getElementById(btn.dataset.target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (action === 'res-sport') {
      state.resSport = Number(btn.dataset.si);
      render();
    } else if (action === 'planning-sport') {
      state.sport = btn.dataset.sport;
      render();
    } else if (action === 'teams-filter') {
      state[btn.dataset.key] = btn.dataset.value;
      render();
    } else if (action === 'go-sport-teams') {
      go('equipes', { sportF: btn.dataset.sport, promoF: 'Toutes' });
    } else if (action === 'planning-day' || action === 'go-planning-day') {
      state.day = Number(btn.dataset.day);
      if (action === 'go-planning-day') state.sport = 'Tous';
      go('planning');
    } else if (action === 'gallery-album') {
      state.album = btn.dataset.album;
      render();
    } else if (action === 'submit-registration') {
      const p = submitRegistration(SPORTS, SIZE);
      render();
      await p;
      render();
      if (state.sent) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        document.querySelector('.field-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else if (action === 'reset-form') {
      resetForm();
      render();
    } else if (action === 'open-lb') {
      const photosF = state.photos.filter(p => state.album === 'Tout' || p.album === state.album);
      openLightbox(photosF, Number(btn.dataset.index), btn);
    } else if (action === 'form-promo') {
      if (state.form.promo !== btn.dataset.promo) state.form.rules = false;
      state.form.promo = btn.dataset.promo;
      render();
    } else if (action === 'form-sport') {
      const i = Number(btn.dataset.si);
      const minP = SIZE[i] || 5;
      const pl = [...state.form.players];
      while (pl.length < minP) pl.push('');
      while (pl.length > minP + 3) pl.pop();
      if (state.form.sport !== i) state.form.rules = false;
      state.form.sport = i;
      state.form.players = pl;
      delete state.err.players;
      render();
    } else if (action === 'generate-team-name') {
      const promo = state.form.promo || 'A1';
      const mascot = MASCOT[promo] || 'ISEN';
      const sport = SPORTS[state.form.sport] || 'Sport';
      const fn = FUN_TEAM_PATTERNS[Math.floor(Math.random() * FUN_TEAM_PATTERNS.length)];
      state.form.team = fn(promo, mascot, sport);
      delete state.err.team;
      render();
    } else if (action === 'copy-captain-to-player1') {
      if (state.form.captain.trim()) {
        state.form.players[0] = state.form.captain.trim();
        delete state.err.players;
        render();
      }
    } else if (action === 'add-player-slot') {
      const minP = SIZE[state.form.sport] || 5;
      if (state.form.players.length < minP + 3) {
        state.form.players.push('');
        render();
      }
    } else if (action === 'remove-player-slot') {
      const idx = Number(btn.dataset.index);
      const minP = SIZE[state.form.sport] || 5;
      if (idx >= minP && idx < state.form.players.length) {
        state.form.players.splice(idx, 1);
        render();
      }
    }
  });

  // Vignettes de la galerie accessibles au clavier
  root.addEventListener('keydown', e => {
    const tile = e.target.closest?.('.gallery-tile');
    if (tile && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      tile.click();
    }
  });

  root.addEventListener('change', async e => {
    const target = e.target;
    if (target.dataset.field === 'mediaFiles') {
      const files = Array.from(target.files || []);
      target.value = '';
      if (files.length === 0) return;
      await uploadGalleryFiles(files, render);
      render();
    } else if (target.dataset.field === 'editionForm-year' && state.editionForm) {
      const f = state.editionForm;
      if (/^\d{4}$/.test(f.year) && /^\d{4}-\d{2}-\d{2}$/.test(f.start || '') && f.start.slice(0, 4) !== f.year) {
        f.start = `${f.year}${f.start.slice(4)}`;
        render();
      }
    } else if (target.dataset.field === 'mediaAlbum') {
      state.mediaAlbum = target.value;
    } else if (target.dataset.field === 'mediaCaption') {
      await updateMedia(target.dataset.id, { caption: target.value });
      render();
    } else if (target.dataset.field === 'mediaMoveAlbum') {
      await updateMedia(target.dataset.id, { album: target.value });
      render();
    } else if (target.dataset.field === 'importCsvFile') {
      const file = target.files?.[0];
      if (!file) return;
      state.importFileName = file.name;
      const promoMatch = file.name.toUpperCase().match(/\b(A[1-5])\b/);
      if (promoMatch && PROMOS.includes(promoMatch[1])) {
        state.importPromo = promoMatch[1];
      }
      const reader = new FileReader();
      reader.onload = ev => {
        state.importCsvContent = String(ev.target?.result || '');
        state.importError = '';
        state.importSuccess = '';
        render();
      };
      reader.readAsText(file, 'utf-8');
    } else if (target.dataset.field === 'transferPlayerTeam') {
      const destTeamId = target.value;
      const srcTeamId = target.dataset.teamId;
      const participantId = target.dataset.participantId;
      const playerIndex = Number(target.dataset.playerIndex);
      if (destTeamId && srcTeamId) {
        await movePlayerInOrBetweenTeams(srcTeamId, {
          participantId,
          playerIndex,
          targetTeamId: destTeamId
        });
        render();
      }
    } else if (target.dataset.field === 'form-rules') {
      state.form.rules = Boolean(target.checked);
      delete state.err.rules;
      updateLiveInscriptionPreview();
    }
  });

  root.addEventListener('input', e => {
    const target = e.target;
    const field = target.dataset.field;

    if (field === 'loginEmail') {
      state.loginEmail = target.value;
      if (state.loginError) {
        state.loginError = '';
        target.style.borderColor = L;
      }
    } else if (field === 'newPassword' || field === 'newPasswordConfirm') {
      state[field] = target.value;
      state.loginError = '';
    } else if (field === 'loginPassword') {
      state.loginPassword = target.value;
      if (state.loginError) {
        state.loginError = '';
        target.style.borderColor = L;
      }
    } else if (field && field.startsWith('editionForm-') && state.editionForm) {
      state.editionForm[field.replace('editionForm-', '')] = target.value;
      state.editionForm.error = '';
      state.editionForm.success = '';
    } else if (field && field.startsWith('albumForm-')) {
      const key = field.replace('albumForm-', '');
      state.albumForm[key] = target.type === 'checkbox' ? target.checked : target.value;
      state.albumForm.error = '';
    } else if (field === 'importPromo') {
      state.importPromo = target.value;
    } else if (field === 'importCsvContent') {
      state.importCsvContent = target.value;
      if (state.importError) {
        state.importError = '';
        target.style.borderColor = 'var(--line)';
      }
    } else if (field === 'newTeamPlayer') {
      const teamId = target.dataset.teamId;
      if (teamId) {
        state.newPlayerInputs[teamId] = target.value;
      }
    } else if (field && field.startsWith('team-')) {
      const key = field.replace('team-', '');
      if (key === 'si') {
        const siNum = Number(target.value);
        state.teamForm.si = siNum;
        if (!state.teamForm.editingId) {
          state.teamForm.maxPlayers = (SIZE[siNum] || 5) + 3;
        }
        render();
      } else if (key === 'maxPlayers') {
        state.teamForm.maxPlayers = Number(target.value);
      } else {
        state.teamForm[key] = target.value;
      }
      state.teamForm.error = '';
    } else if (field && field.startsWith('match-')) {
      const key = field.replace('match-', '');
      if (key === 'si') {
        const siNum = Number(target.value);
        state.matchForm.si = siNum;
        state.matchForm.venue = VENUE[siNum] || '';
        render();
      } else if (key === 'd' || key === 'scoreA' || key === 'scoreB') {
        state.matchForm[key] = Number(target.value);
      } else {
        state.matchForm[key] = target.value;
      }
      state.matchForm.error = '';
    } else if (
      field === 'adminMatchDayF' ||
      field === 'adminMatchSportF' ||
      field === 'adminMatchStatusF' ||
      field === 'adminTeamPromoF' ||
      field === 'adminTeamSportF'
    ) {
      state[field] = target.value;
      render();
    } else if (field) {
      if (field === 'form-rules') {
        state.form.rules = Boolean(target.checked);
        delete state.err.rules;
        updateLiveInscriptionPreview();
      } else if (field.startsWith('form-')) {
        const key = field.replace('form-', '');
        state.form[key] = target.value;
        if (state.err[key]) {
          delete state.err[key];
          target.style.borderColor = 'var(--line)';
        }
        updateLiveInscriptionPreview();
      }
    } else if (target.dataset.playerIndex !== undefined) {
      const idx = Number(target.dataset.playerIndex);
      state.form.players[idx] = target.value;
      delete state.err.players;
      updateLiveInscriptionPreview();
    }
  });
}
