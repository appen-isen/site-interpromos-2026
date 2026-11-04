// Formulaire public d'inscription d'une équipe
import { state, SPORTS, SIZE, MASCOT, EDITION, resetForm } from '../state.js';
import { charterText, readiness, filledPlayers, renderPreviewRoster } from '../pages/inscription-shared.js';
import { submitRegistration } from '../api/index.js';
import { track } from './helpers.js';

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

/**
 * Met à jour la progression et l'aperçu de la feuille de match pendant la saisie, sans tout réafficher
 * (le champ en cours de saisie garde ainsi le focus).
 */
export function updateLiveInscriptionPreview() {
  const f = state.form;
  const minP = SIZE[f.sport] || 5;
  const maxP = minP + 3;
  const filled = filledPlayers(f).length;
  const sportName = SPORTS[f.sport] || 'Football';
  const progress = readiness(f);
  const ready = progress === 100;

  const progBar = document.getElementById('form-progress-bar');
  const progLabel = document.getElementById('form-progress-label');
  if (progBar && progLabel) {
    progBar.style.width = `${progress}%`;
    progBar.style.background = ready ? 'var(--success)' : 'var(--accent)';
    progLabel.textContent = `${progress}%`;
    progLabel.style.color = ready ? 'var(--success)' : 'var(--accent)';
  }

  const enough = filled >= minP;
  const hintEl = document.getElementById('form-players-hint');
  if (hintEl) {
    hintEl.textContent = `${filled} / ${minP} titulaires requis (max ${maxP})`;
    hintEl.style.background = enough ? 'var(--success-bg)' : 'var(--surface-2)';
    hintEl.style.color = enough ? 'var(--success)' : 'var(--accent)';
    hintEl.style.borderColor = enough ? 'var(--success)' : 'var(--line)';
  }

  const charter = document.getElementById('form-charter-text');
  if (charter) charter.innerHTML = charterText(f);

  const prevTeam = document.getElementById('preview-team-name');
  if (prevTeam) prevTeam.textContent = f.team.trim() || `${f.promo} ${sportName}`;

  const prevCap = document.getElementById('preview-captain-name');
  if (prevCap) prevCap.textContent = f.captain.trim() || 'À désigner';

  const prevCount = document.getElementById('preview-roster-count');
  if (prevCount) {
    prevCount.textContent = `${filled}/${minP} min.`;
    prevCount.style.color = enough ? 'var(--success)' : 'var(--accent)';
  }

  const prevList = document.getElementById('preview-roster-list');
  if (prevList) prevList.innerHTML = renderPreviewRoster(f.players, minP);
}

function setRules(target) {
  state.form.rules = Boolean(target.checked);
  delete state.err.rules;
  updateLiveInscriptionPreview();
}

export const clickActions = {
  'submit-registration': async ({ render }) => {
    await track(submitRegistration(SPORTS, SIZE), render);
    if (state.sent) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      document.querySelector('.field-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  },
  'reset-form': ({ render }) => {
    resetForm();
    render();
  },
  'form-promo': ({ btn, render }) => {
    if (state.form.promo !== btn.dataset.promo) state.form.rules = false;
    state.form.promo = btn.dataset.promo;
    render();
  },
  'form-sport': ({ btn, render }) => {
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
  },
  'generate-team-name': ({ render }) => {
    const promo = state.form.promo || 'A1';
    const mascot = MASCOT[promo] || 'ISEN';
    const sport = SPORTS[state.form.sport] || 'Sport';
    const fn = FUN_TEAM_PATTERNS[Math.floor(Math.random() * FUN_TEAM_PATTERNS.length)];
    state.form.team = fn(promo, mascot, sport);
    delete state.err.team;
    render();
  },
  'copy-captain-to-player1': ({ render }) => {
    if (!state.form.captain.trim()) return;
    state.form.players[0] = state.form.captain.trim();
    delete state.err.players;
    render();
  },
  'add-player-slot': ({ render }) => {
    const minP = SIZE[state.form.sport] || 5;
    if (state.form.players.length < minP + 3) {
      state.form.players.push('');
      render();
    }
  },
  'remove-player-slot': ({ btn, render }) => {
    const idx = Number(btn.dataset.index);
    const minP = SIZE[state.form.sport] || 5;
    if (idx >= minP && idx < state.form.players.length) {
      state.form.players.splice(idx, 1);
      render();
    }
  }
};

export const changeFields = {
  'form-rules': ({ target }) => setRules(target)
};

export const inputFields = {
  'form-rules': ({ target }) => setRules(target)
};

export const inputPrefixes = [
  ['form-', ({ target, field }) => {
    const key = field.replace('form-', '');
    state.form[key] = target.value;
    if (state.err[key]) {
      delete state.err[key];
      target.style.borderColor = 'var(--line)';
    }
    updateLiveInscriptionPreview();
  }]
];

// Champs « joueur n » du formulaire (data-player-index, sans data-field)
export function onPlayerInput(target) {
  const idx = Number(target.dataset.playerIndex);
  state.form.players[idx] = target.value;
  delete state.err.players;
  updateLiveInscriptionPreview();
}
