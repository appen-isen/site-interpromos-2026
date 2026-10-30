import { esc, albumPeriod, formatAlbumDates, groupAlbumsByPeriod, PERIOD_LABELS } from './utils.js';
import { state, DAYS, ALBUMS, SPORTS, PROMOS, VENUE, EDITION } from './state.js';
import { renderThemeToggle } from './theme.js';

const R = 'var(--accent)';
const T = 'var(--text)';
const M = 'var(--muted)';
const L = 'var(--line)';

function loginField({ id, label, type, field, value, placeholder, autocomplete, error }) {
  return `
    <label style="display:flex;flex-direction:column;gap:8px">
      <span style="font-size:13px;font-weight:600">${label}</span>
      <input
        id="${id}"
        type="${type}"
        data-field="${field}"
        value="${esc(value)}"
        placeholder="${placeholder}"
        autocomplete="${autocomplete}"
        class="input-focus"
        style="background:var(--bg);border:1px solid ${error ? R : L};color:var(--text);padding:14px 16px;font:15px var(--font-body);outline:none"
      >
    </label>
  `;
}

function loginButton(action, label, loading) {
  return `
    <button type="button" data-action="${action}" ${loading ? 'disabled' : ''} class="hover-accent ${loading ? 'is-loading' : ''}"
      style="background:${loading ? 'var(--line-strong)' : 'var(--accent)'};color:var(--on-accent);border:0;padding:15px 20px;font:700 15px var(--font-body);cursor:pointer;text-align:left">
      ${loading ? 'Patientez…' : label}
    </button>
  `;
}

const linkButton = (attrs, label) => `
  <button type="button" ${attrs} style="background:none;border:0;padding:0;color:var(--muted);font:600 13px var(--font-body);cursor:pointer;text-align:left">${label}</button>
`;

export function renderLogin() {
  const s = state;
  const error = s.loginError ? `<span role="alert" style="font-size:13px;color:var(--error)">${esc(s.loginError)}</span>` : '';
  let body;

  if (s.loginMode === 'reset') {
    body = `
      <p style="font-size:14px;color:var(--text-2);line-height:1.6;margin:0">Choisissez un nouveau mot de passe pour votre compte BDS (10 caractères minimum).</p>
      ${loginField({ id: 'admin-new-password', label: 'Nouveau mot de passe', type: 'password', field: 'newPassword', value: s.newPassword, placeholder: '10 caractères minimum', autocomplete: 'new-password', error: s.loginError })}
      ${loginField({ id: 'admin-new-password-2', label: 'Confirmation', type: 'password', field: 'newPasswordConfirm', value: s.newPasswordConfirm, placeholder: 'Saisissez-le à nouveau', autocomplete: 'new-password', error: s.loginError })}
      ${error}
      ${loginButton('save-new-password', 'Enregistrer le mot de passe →', s.loginLoading)}
    `;
  } else if (s.loginMode === 'recover') {
    body = s.recoverySent ? `
      <p style="font-size:14px;color:var(--success-text);line-height:1.6;margin:0;padding:12px 14px;border:1px solid var(--success-line);background:var(--success-bg)">
        Si un compte BDS correspond à cette adresse, un e-mail avec un lien de réinitialisation vient d'être envoyé.
      </p>
      ${linkButton('data-action="login-mode" data-mode="login"', '← Retour à la connexion')}
    ` : `
      <p style="font-size:14px;color:var(--text-2);line-height:1.6;margin:0">Saisissez l'adresse de votre compte BDS : vous recevrez un lien pour choisir un nouveau mot de passe.</p>
      ${loginField({ id: 'admin-login-email', label: 'Adresse e-mail', type: 'email', field: 'loginEmail', value: s.loginEmail, placeholder: 'prenom.nom@…', autocomplete: 'email', error: s.loginError })}
      ${error}
      ${loginButton('send-recovery', 'Envoyer le lien →', s.loginLoading)}
      ${linkButton('data-action="login-mode" data-mode="login"', '← Retour à la connexion')}
    `;
  } else {
    body = `
      <p style="font-size:14px;color:var(--text-2);line-height:1.6;margin:0">
        Connectez-vous avec votre compte BDS pour gérer les scores en direct, les matchs, les équipes et les inscriptions.
      </p>
      ${s.loginNotice ? `<p style="font-size:14px;color:var(--success-text);margin:0;padding:12px 14px;border:1px solid var(--success-line);background:var(--success-bg)">${esc(s.loginNotice)}</p>` : ''}
      ${loginField({ id: 'admin-login-email', label: 'Adresse e-mail', type: 'email', field: 'loginEmail', value: s.loginEmail, placeholder: 'Votre adresse e-mail', autocomplete: 'email', error: s.loginError })}
      ${loginField({ id: 'admin-login-password', label: 'Mot de passe', type: 'password', field: 'loginPassword', value: s.loginPassword, placeholder: 'Votre mot de passe', autocomplete: 'current-password', error: s.loginError })}
      ${error}
      ${loginButton('admin-login', "Se connecter à l'Espace BDS →", s.loginLoading)}
      ${linkButton('data-action="login-mode" data-mode="recover"', 'Mot de passe oublié ?')}
    `;
  }

  return `
    <div style="min-height:100vh;display:grid;place-items:center;padding:20px;background:var(--bg-deep)">
      <div style="background:var(--surface);border:1px solid var(--line);padding:48px;max-width:440px;width:100%;display:flex;flex-direction:column;gap:18px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
          <span style="width:48px;height:48px;background:var(--logo-bg);display:grid;place-items:center">
            <img src="/assets/logo_bds.svg" alt="BDS" style="width:36px;height:36px">
          </span>
          <div>
            <div style="font:italic 800 28px/1 'Barlow Condensed',sans-serif;text-transform:uppercase">Espace BDS</div>
            <div style="font-size:13px;color:var(--muted);margin-top:2px">Administration Interpromos ${esc(EDITION.year)}</div>
          </div>
          ${renderThemeToggle('margin-left:auto')}
        </div>
        ${body}
        <div style="margin-top:4px">${linkButton('data-action="nav" data-page="home"', '← Retour au site public')}</div>
      </div>
    </div>
  `;
}

export function renderAdmin(d) {
  const { s, liveList, ms, byTime } = d;
  const pending = s.regs.filter(r => r.status === 'En attente').length;
  const totalPlayers = s.teams.reduce((acc, t) => acc + (Array.isArray(t.playersList) && t.playersList.length > 0 ? t.playersList.length : (t.players || 0)), 0);

  const tabs = [
    ['live', 'Scores en direct', liveList.length],
    ['matchs', 'Matchs', ms.length],
    ['equipes', 'Équipes & Joueurs', s.teams.length],
    ['inscriptions', 'Inscriptions', pending],
    ['import', 'Import CSV', 0],
    ['edition', 'Édition', 0],
    ['galerie', 'Galerie', s.adminPhotos.length]
  ];

  const regTone = {
    'En attente': [T, 'var(--bg)', T],
    'Validée': [L, T, L],
    'Refusée': ['transparent', M, 'var(--line-strong)']
  };

  const adminMatches = ms.filter(m => m.d === s.adminDay).sort(byTime);

  return `
    <div class="admin-layout" style="display:grid;grid-template-columns:240px minmax(0,1fr);min-height:100vh">
      <aside style="background:var(--surface);border-right:1px solid var(--line);padding:24px 0;display:flex;flex-direction:column;gap:4px">
        <div style="display:flex;align-items:center;gap:10px;padding:0 24px 24px;margin-bottom:8px;border-bottom:1px solid var(--line)">
          <span style="width:32px;height:32px;background:var(--logo-bg);display:grid;place-items:center">
            <img src="/assets/logo_bds.svg" alt="BDS" style="width:24px;height:24px">
          </span>
          <div>
            <div style="font:italic 800 20px/1 'Barlow Condensed',sans-serif;text-transform:uppercase">Admin BDS</div>
            <div style="font-size:11px;color:var(--success);margin-top:2px">● Connecté · Bureau BDS</div>
          </div>
        </div>

        ${tabs.map(([t, label, count]) => {
          const on = s.adminTab === t;
          return `
            <button data-action="admin-tab" data-tab="${t}" class="hover-surface" style="display:flex;align-items:center;justify-content:space-between;gap:8px;white-space:nowrap;padding:12px 20px;border:0;border-left:3px solid ${on ? R : 'transparent'};background:${on ? 'var(--surface-2)' : 'transparent'};color:${on ? T : M};font:600 14px var(--font-body);cursor:pointer;text-align:left">
              <span>${esc(label)}</span>
              ${count ? `<span style="min-width:22px;padding:2px 6px;background:${on || t === 'live' || t === 'inscriptions' ? 'var(--accent)' : 'var(--line)'};color:${on || t === 'live' || t === 'inscriptions' ? 'var(--on-accent)' : 'var(--text)'};font-size:11px;font-weight:700;text-align:center">${count}</span>` : ''}
            </button>
          `;
        }).join('')}

        <div style="margin-top:auto;display:flex;flex-direction:column;gap:4px;border-top:1px solid var(--line);padding-top:12px">
          <div style="padding:6px 24px">${renderThemeToggle()}</div>
          <button data-action="refresh-state" class="hover-text-light" style="padding:10px 24px;border:0;background:none;color:var(--text-2);font:600 13px var(--font-body);cursor:pointer;text-align:left">
            ↻ Actualiser les données
          </button>
          <a href="/docs/" class="hover-text-light" style="padding:10px 24px;color:var(--text-2);font:600 13px var(--font-body);text-decoration:none">
            ⌘ Documentation API
          </a>
          <button data-action="nav" data-page="home" class="hover-text-light" style="padding:10px 24px;border:0;background:none;color:var(--muted);font:600 13px var(--font-body);cursor:pointer;text-align:left">
            ← Voir le site public
          </button>
          <button data-action="admin-logout" class="hover-text-light" style="padding:10px 24px;border:0;background:none;color:var(--error);font:600 13px var(--font-body);cursor:pointer;text-align:left">
            Se déconnecter
          </button>
        </div>
      </aside>

      <main style="padding:40px 32px 64px;min-width:0;overflow-x:auto">
        <!-- Bandeau récapitulatif des données en base (masqué sur le live pour garder l'écran de saisie épuré) -->
        ${s.adminTab === 'live' ? '' : `<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border:1px solid var(--line);background:var(--surface);margin-bottom:32px">
          <div data-action="admin-tab" data-tab="matchs" style="padding:16px 20px;border-right:1px solid var(--line);cursor:pointer">
            <div style="font-size:12px;color:var(--muted);margin-bottom:4px">Matchs programmés</div>
            <div style="font:italic 800 28px/1 'Barlow Condensed',sans-serif;color:var(--text)">${ms.length} <span style="font-size:14px;color:var(--accent);font-style:normal">(${liveList.length} live)</span></div>
          </div>
          <div data-action="admin-tab" data-tab="equipes" style="padding:16px 20px;border-right:1px solid var(--line);cursor:pointer">
            <div style="font-size:12px;color:var(--muted);margin-bottom:4px">Équipes enregistrées</div>
            <div style="font:italic 800 28px/1 'Barlow Condensed',sans-serif;color:var(--text)">${s.teams.length}</div>
          </div>
          <div data-action="admin-tab" data-tab="equipes" style="padding:16px 20px;border-right:1px solid var(--line);cursor:pointer">
            <div style="font-size:12px;color:var(--muted);margin-bottom:4px">Participants inscrits</div>
            <div style="font:italic 800 28px/1 'Barlow Condensed',sans-serif;color:var(--text)">${totalPlayers}</div>
          </div>
          <div data-action="admin-tab" data-tab="inscriptions" style="padding:16px 20px;cursor:pointer">
            <div style="font-size:12px;color:var(--muted);margin-bottom:4px">Inscriptions web</div>
            <div style="font:italic 800 28px/1 'Barlow Condensed',sans-serif;color:${pending > 0 ? 'var(--accent)' : 'var(--text)'}">${s.regs.length} <span style="font-size:14px;color:var(--muted);font-style:normal">(${pending} en attente)</span></div>
          </div>
        </div>`}

        ${s.adminTab === 'live' ? renderAdminLive(s, adminMatches, DAYS, liveList) : ''}
        ${s.adminTab === 'matchs' ? renderAdminMatches(d) : ''}
        ${s.adminTab === 'equipes' ? renderAdminTeams(s) : ''}
        ${s.adminTab === 'inscriptions' ? renderAdminInscriptions(s, regTone) : ''}
        ${s.adminTab === 'galerie' ? renderAdminGallery(s, ALBUMS) : ''}
        ${s.adminTab === 'import' ? renderAdminImport(s) : ''}
        ${s.adminTab === 'edition' ? renderAdminEdition(s) : ''}
      </main>
    </div>
  `;
}

function renderLiveTeam(m, team) {
  const name = team === 0 ? m.a : m.b;
  const score = team === 0 ? m.sa : m.sb;
  return `
    <div style="padding:20px;display:flex;flex-direction:column;align-items:center;gap:12px">
      <span style="font:italic 800 24px/1 'Barlow Condensed',sans-serif">${esc(name)}</span>
      <span class="live-score-big" style="font:italic 900 72px/1 'Barlow Condensed',sans-serif;font-variant-numeric:tabular-nums">${score}</span>
      <div style="display:flex;gap:6px">
        <button data-action="match-score" data-id="${esc(m.id)}" data-team="${team}" data-delta="-1" aria-label="Retirer un point à ${esc(name)}" ${score <= 0 ? 'disabled' : ''} class="score-btn-minus" style="width:48px;height:48px;background:var(--bg);border:1px solid ${L};color:${T};font-size:22px;cursor:pointer">−</button>
        <button data-action="match-score" data-id="${esc(m.id)}" data-team="${team}" data-delta="1" aria-label="Ajouter un point à ${esc(name)}" class="hover-accent score-btn-plus" style="width:72px;height:48px;background:${R};border:0;color:var(--on-accent);font-size:22px;font-weight:700;cursor:pointer">+1</button>
      </div>
    </div>
  `;
}

function renderAdminLive(s, adminMatches, DAYS, liveList) {
  const toStart = adminMatches.filter(m => m.status === 'up');

  return `
    <h1 style="font:italic 900 56px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;margin:0">Scores en direct</h1>
    <p style="font-size:14px;color:${M};margin:8px 0 28px">Chaque point saisi s'affiche aussitôt sur le site (bandeau live, planning, classement).</p>

    ${liveList.length === 0 ? `
      <div style="background:var(--surface-2);padding:32px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap">
        <span style="font-size:15px">Aucun match en cours.</span>
        <button data-action="scroll-to" data-target="a-lancer" class="hover-accent" style="background:${R};color:var(--on-accent);border:0;padding:12px 18px;font:700 14px var(--font-body);cursor:pointer">Démarrer un match ↓</button>
      </div>
    ` : `
      <div class="admin-live-grid" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">
        ${liveList.map(m => `
          <div style="background:var(--surface-2)">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 20px;border-bottom:1px solid ${L}">
              <span style="font-size:13px"><strong>${esc(m.sport)}</strong> <span style="color:${M}">· ${esc(m.venue || '')} · ${esc(m.t)}</span></span>
              <button data-action="match-status" data-id="${esc(m.id)}" data-status="done" data-confirm="Terminer ${esc(m.sport)} ${esc(m.a)} ${m.sa} – ${m.sb} ${esc(m.b)} ? Le score sera compté au classement." class="hover-border-white" style="background:none;border:1px solid var(--line-strong);color:${T};padding:6px 12px;font:600 12px var(--font-body);cursor:pointer;white-space:nowrap">Terminer le match</button>
            </div>
            <div style="display:grid;grid-template-columns:minmax(0,1fr) 1px minmax(0,1fr)">
              ${renderLiveTeam(m, 0)}
              <div style="background:${L}"></div>
              ${renderLiveTeam(m, 1)}
            </div>
          </div>
        `).join('')}
      </div>
    `}

    <div id="a-lancer" style="display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin:48px 0 16px;flex-wrap:wrap">
      <h2 style="font:italic 800 32px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;margin:0">À lancer</h2>
      <div style="display:flex;border:1px solid ${L}">
        ${DAYS.map((day, i) => `
          <button data-action="admin-day" data-day="${i}" style="padding:9px 16px;border:0;background:${s.adminDay === i ? R : 'transparent'};color:${s.adminDay === i ? 'var(--on-accent)' : M};font:600 13px var(--font-body);cursor:pointer">${esc(day[0])}</button>
        `).join('')}
      </div>
    </div>

    ${toStart.length === 0 ? `
      <div style="padding:20px;background:var(--surface);border:1px solid ${L};font-size:14px;color:${M};display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap">
        <span>Aucun match à venir sur ${esc(DAYS[s.adminDay]?.[0] || 'ce jour')}.</span>
        <button data-action="admin-tab" data-tab="matchs" style="background:transparent;border:1px solid var(--line-strong);color:${T};padding:9px 14px;font:600 13px var(--font-body);cursor:pointer">Programmer des matchs →</button>
      </div>
    ` : toStart.map(m => `
      <div style="display:grid;grid-template-columns:70px 130px minmax(0,1fr) 170px 120px;gap:16px;align-items:center;padding:14px 0;border-top:1px solid ${L}">
        <span style="font:italic 800 22px/1 'Barlow Condensed',sans-serif">${esc(m.t)}</span>
        <div>
          <div style="font-size:14px;font-weight:700">${esc(m.sport)}</div>
          <div style="font-size:12px;color:${M}">${esc(m.phase || 'Qualification')}</div>
        </div>
        <span style="font:italic 800 22px/1 'Barlow Condensed',sans-serif">${esc(m.a)} <span style="color:var(--dim);font:400 14px var(--font-body);margin:0 6px">vs</span> ${esc(m.b)}</span>
        <span style="font-size:13px;color:${M}">${esc(m.venue || '')}</span>
        <button data-action="match-status" data-id="${esc(m.id)}" data-status="live" data-reset="true" class="hover-accent" style="justify-self:end;background:${R};color:var(--on-accent);border:0;padding:9px 14px;font:700 13px var(--font-body);cursor:pointer">Démarrer ▶</button>
      </div>
    `).join('')}
  `;
}

function renderAdminMatches(d) {
  const { s, ms, byTime } = d;
  const mf = s.matchForm;

  const filteredMatches = ms
    .filter(m => {
      if (s.adminMatchDayF !== 'Tous' && m.d !== Number(s.adminMatchDayF)) return false;
      if (s.adminMatchSportF !== 'Tous' && m.sport !== s.adminMatchSportF) return false;
      if (s.adminMatchStatusF !== 'Tous' && m.status !== s.adminMatchStatusF) return false;
      return true;
    })
    .sort(byTime);

  return `
    <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:24px;flex-wrap:wrap">
      <div>
        <h1 style="font:italic 900 52px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;margin:0">Gestion des matchs</h1>
        <p style="font-size:14px;color:var(--muted);margin:8px 0 0">Programmez, modifiez ou supprimez les rencontres du tournoi Interpromos.</p>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button data-action="generate-matches" ${mf.loading ? 'disabled' : ''} style="background:var(--surface-2);border:1px solid var(--line-strong);color:var(--text);padding:11px 16px;font:600 13px var(--font-body);cursor:pointer">
          ⚡ Générer le planning type (${SPORTS.length} sports)
        </button>
      </div>
    </div>

    <!-- Formulaire de création / édition de match -->
    <div style="background:var(--surface);border:1px solid ${mf.editingId ? 'var(--accent)' : 'var(--line)'};padding:24px;margin-bottom:32px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px">
        <div style="font:italic 800 24px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;color:${mf.editingId ? 'var(--accent)' : 'var(--text)'}">
          ${mf.editingId ? `Modifier le match (${esc(mf.editingId)})` : 'Programmer un nouveau match'}
        </div>
        ${mf.editingId ? `
          <button data-action="cancel-edit-match" style="background:none;border:1px solid var(--line-strong);color:var(--muted);padding:6px 12px;font:600 12px var(--font-body);cursor:pointer">
            Annuler la modification
          </button>
        ` : ''}
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;margin-bottom:16px">
        <label style="display:flex;flex-direction:column;gap:6px">
          <span style="font-size:12px;color:var(--muted);font-weight:600">Jour</span>
          <select data-field="match-d" style="background:var(--bg);border:1px solid var(--line);color:var(--text);padding:10px 12px;font:14px var(--font-body)">
            ${DAYS.map((day, idx) => `<option value="${idx}" ${Number(mf.d) === idx ? 'selected' : ''}>${esc(day[2])} · ${esc(day[0])}</option>`).join('')}
          </select>
        </label>

        <label style="display:flex;flex-direction:column;gap:6px">
          <span style="font-size:12px;color:var(--muted);font-weight:600">Heure</span>
          <input type="time" data-field="match-t" value="${esc(mf.t)}" style="background:var(--bg);border:1px solid var(--line);color:var(--text);padding:10px 12px;font:14px var(--font-body)">
        </label>

        <label style="display:flex;flex-direction:column;gap:6px">
          <span style="font-size:12px;color:var(--muted);font-weight:600">Sport</span>
          <select data-field="match-si" style="background:var(--bg);border:1px solid var(--line);color:var(--text);padding:10px 12px;font:14px var(--font-body)">
            ${SPORTS.map((sp, idx) => `<option value="${idx}" ${Number(mf.si) === idx ? 'selected' : ''}>${esc(sp)}</option>`).join('')}
          </select>
        </label>

        <label style="display:flex;flex-direction:column;gap:6px">
          <span style="font-size:12px;color:var(--muted);font-weight:600">Promo A</span>
          <select data-field="match-a" style="background:var(--bg);border:1px solid var(--line);color:var(--text);padding:10px 12px;font:14px var(--font-body)">
            ${PROMOS.map(p => `<option value="${esc(p)}" ${mf.a === p ? 'selected' : ''}>${esc(p)}</option>`).join('')}
          </select>
        </label>

        <label style="display:flex;flex-direction:column;gap:6px">
          <span style="font-size:12px;color:var(--muted);font-weight:600">Promo B</span>
          <select data-field="match-b" style="background:var(--bg);border:1px solid var(--line);color:var(--text);padding:10px 12px;font:14px var(--font-body)">
            ${PROMOS.map(p => `<option value="${esc(p)}" ${mf.b === p ? 'selected' : ''}>${esc(p)}</option>`).join('')}
          </select>
        </label>

        <label style="display:flex;flex-direction:column;gap:6px">
          <span style="font-size:12px;color:var(--muted);font-weight:600">Phase</span>
          <select data-field="match-phase" style="background:var(--bg);border:1px solid var(--line);color:var(--text);padding:10px 12px;font:14px var(--font-body)">
            ${['Qualification', 'Petite finale', 'Finale'].map(ph => `<option value="${ph}" ${mf.phase === ph ? 'selected' : ''}>${ph}</option>`).join('')}
          </select>
        </label>

        <label style="display:flex;flex-direction:column;gap:6px">
          <span style="font-size:12px;color:var(--muted);font-weight:600">Lieu / Terrain</span>
          <input type="text" data-field="match-venue" value="${esc(mf.venue)}" placeholder="${esc(VENUE[mf.si] || 'Gymnase')}" style="background:var(--bg);border:1px solid var(--line);color:var(--text);padding:10px 12px;font:14px var(--font-body)">
        </label>

        <label style="display:flex;flex-direction:column;gap:6px">
          <span style="font-size:12px;color:var(--muted);font-weight:600">Statut</span>
          <select data-field="match-status" style="background:var(--bg);border:1px solid var(--line);color:var(--text);padding:10px 12px;font:14px var(--font-body)">
            <option value="up" ${mf.status === 'up' ? 'selected' : ''}>À venir</option>
            <option value="live" ${mf.status === 'live' ? 'selected' : ''}>En direct</option>
            <option value="done" ${mf.status === 'done' ? 'selected' : ''}>Terminé</option>
          </select>
        </label>

        <label style="display:flex;flex-direction:column;gap:6px">
          <span style="font-size:12px;color:var(--muted);font-weight:600">Score (${esc(mf.a)} - ${esc(mf.b)})</span>
          <div style="display:flex;gap:6px;align-items:center">
            <input type="number" min="0" data-field="match-scoreA" value="${mf.scoreA}" style="width:100%;background:var(--bg);border:1px solid var(--line);color:var(--text);padding:10px;font:14px var(--font-body)">
            <span style="color:var(--muted)">-</span>
            <input type="number" min="0" data-field="match-scoreB" value="${mf.scoreB}" style="width:100%;background:var(--bg);border:1px solid var(--line);color:var(--text);padding:10px;font:14px var(--font-body)">
          </div>
        </label>
      </div>

      ${mf.error ? `<div style="margin-bottom:12px;font-size:13px;color:var(--error)">${esc(mf.error)}</div>` : ''}
      ${mf.success ? `<div style="margin-bottom:12px;font-size:13px;color:var(--success)">${esc(mf.success)}</div>` : ''}

      <button data-action="save-match" ${mf.loading ? 'disabled' : ''} class="hover-accent" style="background:var(--accent);color:var(--on-accent);border:0;padding:12px 22px;font:700 14px var(--font-body);cursor:pointer">
        ${mf.loading ? 'Enregistrement...' : mf.editingId ? 'Enregistrer les modifications' : '+ Programmer ce match'}
      </button>
    </div>

    <!-- Filtres de la liste des matchs -->
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px;flex-wrap:wrap">
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <select data-field="adminMatchDayF" style="padding:8px 14px;background:var(--bg);border:1px solid var(--line);color:var(--text);font:13px var(--font-body)">
          <option value="Tous" ${s.adminMatchDayF === 'Tous' ? 'selected' : ''}>Tous les jours</option>
          ${DAYS.map((day, idx) => `<option value="${idx}" ${String(s.adminMatchDayF) === String(idx) ? 'selected' : ''}>${esc(day[2])} · ${esc(day[0])}</option>`).join('')}
        </select>

        <select data-field="adminMatchSportF" style="padding:8px 14px;background:var(--bg);border:1px solid var(--line);color:var(--text);font:13px var(--font-body)">
          <option value="Tous" ${s.adminMatchSportF === 'Tous' ? 'selected' : ''}>Tous les sports</option>
          ${SPORTS.map(sp => `<option value="${esc(sp)}" ${s.adminMatchSportF === sp ? 'selected' : ''}>${esc(sp)}</option>`).join('')}
        </select>

        <select data-field="adminMatchStatusF" style="padding:8px 14px;background:var(--bg);border:1px solid var(--line);color:var(--text);font:13px var(--font-body)">
          <option value="Tous" ${s.adminMatchStatusF === 'Tous' ? 'selected' : ''}>Tous les statuts</option>
          <option value="up" ${s.adminMatchStatusF === 'up' ? 'selected' : ''}>À venir</option>
          <option value="live" ${s.adminMatchStatusF === 'live' ? 'selected' : ''}>En direct</option>
          <option value="done" ${s.adminMatchStatusF === 'done' ? 'selected' : ''}>Terminé</option>
        </select>
      </div>
      <div style="font-size:13px;color:var(--muted)">${filteredMatches.length} match(s) affiché(s)</div>
    </div>

    ${filteredMatches.length === 0 ? `
      <div style="padding:36px;background:var(--surface);border:1px solid var(--line);text-align:center;color:var(--muted)">
        Aucun match ne correspond aux filtres sélectionnés. Utilisez le formulaire ci-dessus ou cliquez sur « Générer le planning type ».
      </div>
    ` : `
      <div style="display:grid;gap:8px">
        ${filteredMatches.map(m => `
          <div style="display:grid;grid-template-columns:85px 140px minmax(0,1fr) 110px 100px 210px;gap:14px;align-items:center;padding:14px 18px;background:var(--surface);border:1px solid var(--line)">
            <div>
              <div style="font-size:14px;font-weight:700;color:var(--text)">${esc(m.dayShort)} · ${esc(m.t)}</div>
              <div style="font-size:11px;color:var(--muted)">${esc(m.phase || 'Qualification')}</div>
            </div>
            <div>
              <div style="font-size:14px;font-weight:600;color:var(--text)">${esc(m.sport)}</div>
              <div style="font-size:11px;color:var(--muted)">${esc(m.venue || '')}</div>
            </div>
            <div style="font-size:15px;font-weight:700;color:var(--text)">
              ${esc(m.a)} <span style="color:var(--muted);font-weight:400">vs</span> ${esc(m.b)}
            </div>
            <div style="font:italic 800 22px/1 'Barlow Condensed',sans-serif;color:${m.scCol}">
              ${m.sa} – ${m.sb}
            </div>
            <div>
              <span style="display:inline-block;padding:4px 8px;font-size:11px;font-weight:700;text-transform:uppercase;background:${m.tagBg};color:${m.tagFg};border:1px solid ${m.tagBd}">
                ${esc(m.tag)}
              </span>
            </div>
            <div style="display:flex;gap:6px;justify-content:flex-end">
              <button data-action="edit-match" data-id="${esc(m.id)}" style="padding:6px 10px;background:var(--surface-2);border:1px solid var(--line-strong);color:var(--text);font:600 12px var(--font-body);cursor:pointer">
                Modifier
              </button>
              <button data-action="match-status" data-id="${esc(m.id)}" data-status="${m.status === 'live' ? 'done' : 'live'}" style="padding:6px 10px;background:${m.status === 'live' ? 'var(--line)' : 'var(--accent)'};border:0;color:${m.status === 'live' ? 'var(--text)' : 'var(--on-accent)'};font:600 12px var(--font-body);cursor:pointer">
                ${m.status === 'live' ? 'Terminer' : 'Live'}
              </button>
              <button data-action="delete-match" data-id="${esc(m.id)}" style="padding:6px 10px;background:transparent;border:1px solid var(--line-strong);color:var(--error);font:600 12px var(--font-body);cursor:pointer">
                Suppr.
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `}
  `;
}

function renderAdminTeams(s) {
  const tf = s.teamForm;
  const filteredTeams = s.teams.filter(t => {
    if (s.adminTeamPromoF !== 'Toutes' && t.p !== s.adminTeamPromoF) return false;
    if (s.adminTeamSportF !== 'Tous' && t.sport !== s.adminTeamSportF) return false;
    return true;
  });

  return `
    <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:24px;flex-wrap:wrap">
      <div>
        <h1 style="font:italic 900 52px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;margin:0">Équipes &amp; Joueurs</h1>
        <p style="font-size:14px;color:var(--muted);margin:8px 0 0">Créez et éditez les équipes, augmentez la capacité max de joueurs, et ajoutez, déplacez ou supprimez des joueurs.</p>
      </div>
      <button data-action="admin-tab" data-tab="import" style="background:var(--surface-2);border:1px solid var(--line-strong);color:var(--text);padding:11px 18px;font:600 13px var(--font-body);cursor:pointer">
        Importer des équipes via CSV →
      </button>
    </div>

    <!-- Formulaire de création / édition d'équipe -->
    <div style="background:var(--surface);border:1px solid ${tf.editingId ? 'var(--accent)' : 'var(--line)'};padding:24px;margin-bottom:28px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px">
        <div style="font:italic 800 24px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;color:${tf.editingId ? 'var(--accent)' : 'var(--text)'}">
          ${tf.editingId ? `Modifier l'équipe #${tf.editingId}` : 'Créer une nouvelle équipe'}
        </div>
        ${tf.editingId ? `
          <button data-action="cancel-edit-team" style="background:none;border:1px solid var(--line-strong);color:var(--muted);padding:6px 12px;font:600 12px var(--font-body);cursor:pointer">
            Annuler la modification
          </button>
        ` : ''}
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:14px">
        <label style="display:flex;flex-direction:column;gap:6px">
          <span style="font-size:12px;color:var(--muted);font-weight:600">Promo</span>
          <select data-field="team-promo" style="background:var(--bg);border:1px solid var(--line);color:var(--text);padding:10px 12px;font:14px var(--font-body)">
            ${PROMOS.map(p => `<option value="${esc(p)}" ${tf.promo === p ? 'selected' : ''}>${esc(p)}</option>`).join('')}
          </select>
        </label>

        <label style="display:flex;flex-direction:column;gap:6px">
          <span style="font-size:12px;color:var(--muted);font-weight:600">Sport</span>
          <select data-field="team-si" style="background:var(--bg);border:1px solid var(--line);color:var(--text);padding:10px 12px;font:14px var(--font-body)">
            ${SPORTS.map((sp, idx) => `<option value="${idx}" ${Number(tf.si) === idx ? 'selected' : ''}>${esc(sp)}</option>`).join('')}
          </select>
        </label>

        <label style="display:flex;flex-direction:column;gap:6px">
          <span style="font-size:12px;color:var(--muted);font-weight:600">Nom de l'équipe</span>
          <input type="text" data-field="team-name" value="${esc(tf.name)}" placeholder="Ex: ${esc(tf.promo)} ${esc(SPORTS[tf.si] || 'Football')}" style="background:var(--bg);border:1px solid var(--line);color:var(--text);padding:10px 12px;font:14px var(--font-body)">
        </label>

        <label style="display:flex;flex-direction:column;gap:6px">
          <span style="font-size:12px;color:var(--muted);font-weight:600">Capitaine</span>
          <input type="text" data-field="team-captain" value="${esc(tf.captain)}" placeholder="Nom du capitaine" style="background:var(--bg);border:1px solid var(--line);color:var(--text);padding:10px 12px;font:14px var(--font-body)">
        </label>

        <label style="display:flex;flex-direction:column;gap:6px">
          <span style="font-size:12px;color:var(--muted);font-weight:600">Joueurs Max autorisés</span>
          <input type="number" min="1" max="50" data-field="team-maxPlayers" value="${tf.maxPlayers}" style="background:var(--bg);border:1px solid var(--line);color:var(--text);padding:10px 12px;font:700 14px var(--font-mono)">
        </label>
      </div>

      <label style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px">
        <span style="font-size:12px;color:var(--muted);font-weight:600">Joueurs (séparés par une virgule ou un retour à la ligne)</span>
        <textarea data-field="team-playersText" rows="2" placeholder="Prénom Nom, Prénom Nom, ..." style="background:var(--bg);border:1px solid var(--line);color:var(--text);padding:10px 12px;font:13px var(--font-body);resize:vertical">${esc(tf.playersText)}</textarea>
      </label>

      ${tf.error ? `<div style="margin-bottom:12px;font-size:13px;color:var(--error)">${esc(tf.error)}</div>` : ''}
      ${tf.success ? `<div style="margin-bottom:12px;font-size:13px;color:var(--success)">${esc(tf.success)}</div>` : ''}

      <button data-action="save-team" ${tf.loading ? 'disabled' : ''} class="hover-accent" style="background:var(--accent);color:var(--on-accent);border:0;padding:12px 22px;font:700 14px var(--font-body);cursor:pointer">
        ${tf.loading ? 'Enregistrement...' : tf.editingId ? "Enregistrer les modifications de l'équipe" : '+ Créer cette équipe'}
      </button>
    </div>

    ${s.teamActionError ? `<div style="margin-bottom:16px;padding:12px 16px;background:var(--error-bg);border:1px solid var(--accent);color:var(--error);font-size:13px">${esc(s.teamActionError)}</div>` : ''}
    ${s.teamActionSuccess ? `<div style="margin-bottom:16px;padding:12px 16px;background:var(--success-bg);border:1px solid var(--success);color:var(--success);font-size:13px">${esc(s.teamActionSuccess)}</div>` : ''}

    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px;flex-wrap:wrap">
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <select data-field="adminTeamPromoF" style="padding:8px 16px;background:var(--bg);border:1px solid var(--line);color:var(--text);font:14px var(--font-body)">
          ${['Toutes', ...PROMOS].map(p => `<option value="${esc(p)}" ${s.adminTeamPromoF === p ? 'selected' : ''}>Promo : ${esc(p)}</option>`).join('')}
        </select>
        <select data-field="adminTeamSportF" style="padding:8px 16px;background:var(--bg);border:1px solid var(--line);color:var(--text);font:14px var(--font-body)">
          ${['Tous', ...SPORTS].map(sp => `<option value="${esc(sp)}" ${s.adminTeamSportF === sp ? 'selected' : ''}>Sport : ${esc(sp)}</option>`).join('')}
        </select>
      </div>
      <div style="font-size:13px;color:var(--muted)">${filteredTeams.length} équipe(s) affichée(s)</div>
    </div>

    ${filteredTeams.length === 0 ? `
      <div style="padding:40px;background:var(--surface);border:1px solid var(--line);text-align:center">
        <div style="font:italic 800 26px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;margin-bottom:8px">Aucune équipe enregistrée</div>
        <p style="font-size:14px;color:var(--muted);margin:0">Utilisez le formulaire ci-dessus pour créer une équipe ou importez un fichier CSV.</p>
      </div>
    ` : `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));gap:18px">
        ${filteredTeams.map(t => {
          const pDetails = Array.isArray(t.playersDetails) && t.playersDetails.length > 0
            ? t.playersDetails
            : (t.playersList || []).map((name, idx) => ({ id: null, fullName: name, ordre: idx }));
          const maxP = t.maxPlayers || 10;
          const curP = pDetails.length;
          const otherTeams = s.teams.filter(ot => ot.id !== t.id);

          return `
            <div style="background:var(--surface);border:1px solid var(--line);padding:20px;display:flex;flex-direction:column;gap:14px">
              <!-- En-tête de la carte équipe -->
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">
                <div>
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                    <span style="padding:2px 8px;background:var(--accent);color:var(--on-accent);font-size:12px;font-weight:700">${esc(t.p)}</span>
                    <span style="font-size:13px;color:var(--muted);font-weight:600">${esc(t.sport)}</span>
                    <span style="font-size:12px;color:var(--dim)">· ${esc(t.rec || '0V 0N 0D')}</span>
                  </div>
                  <div style="font:italic 800 24px/1.1 'Barlow Condensed',sans-serif;color:var(--text);text-transform:uppercase">${esc(t.name || `${t.p} ${t.sport}`)}</div>
                </div>
                <div style="display:flex;gap:6px">
                  <button data-action="edit-team" data-id="${t.id}" style="background:var(--surface-2);border:1px solid var(--line-strong);color:var(--text);padding:5px 10px;font-size:12px;font-weight:600;cursor:pointer">
                    Éditer
                  </button>
                  <button data-action="delete-team" data-id="${t.id}" style="background:none;border:1px solid var(--line-strong);color:var(--error);padding:5px 10px;font-size:12px;font-weight:600;cursor:pointer">
                    Suppr.
                  </button>
                </div>
              </div>

              <!-- Capitaine & Contrôle du nombre de joueurs max -->
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:13px;color:var(--text-2);border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:10px 0;flex-wrap:wrap">
                <span>★ Cap. : <strong style="color:var(--text)">${esc(t.captain || 'Non renseigné')}</strong></span>

                <div style="display:flex;align-items:center;gap:6px">
                  <span style="font-size:12px;color:var(--muted)">Joueurs : <strong style="color:${curP >= maxP ? 'var(--accent)' : 'var(--success)'};font-family:var(--font-mono)">${curP} / ${maxP} max</strong></span>
                  <button data-action="team-max-delta" data-id="${t.id}" data-delta="-1" title="Réduire le max de joueurs" style="width:24px;height:24px;background:var(--bg);border:1px solid var(--line-strong);color:var(--text);font-weight:700;cursor:pointer">−</button>
                  <button data-action="team-max-delta" data-id="${t.id}" data-delta="1" title="Augmenter le max de joueurs" style="width:24px;height:24px;background:var(--accent);border:0;color:var(--on-accent);font-weight:700;cursor:pointer">+</button>
                </div>
              </div>

              <!-- Ajout rapide d'un joueur -->
              <div style="display:flex;gap:8px">
                <input
                  type="text"
                  data-field="newTeamPlayer"
                  data-team-id="${t.id}"
                  value="${esc(s.newPlayerInputs[t.id] || '')}"
                  placeholder="Prénom Nom d'un joueur à ajouter..."
                  style="flex:1;min-width:0;background:var(--bg);border:1px solid var(--line);color:var(--text);padding:8px 12px;font-size:13px;outline:none"
                >
                <button
                  type="button"
                  data-action="add-team-player"
                  data-id="${t.id}"
                  class="hover-accent"
                  style="background:var(--accent);color:var(--on-accent);border:0;padding:8px 14px;font:700 12px var(--font-body);cursor:pointer;white-space:nowrap"
                >
                  + Ajouter
                </button>
              </div>

              <!-- Liste des joueurs avec actions : Capitaine, Monter/Descendre, Déplacer vers une autre équipe, Supprimer -->
              <div style="display:flex;flex-direction:column;gap:6px">
                ${pDetails.length === 0 ? `
                  <div style="font-size:12px;color:var(--dim);font-style:italic;padding:8px 0">Aucun joueur inscrit dans cette équipe.</div>
                ` : pDetails.map((pl, idx) => {
                  const isCap = t.captain && pl.fullName.toLowerCase() === t.captain.toLowerCase();
                  return `
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 10px;background:var(--bg);border:1px solid ${isCap ? 'var(--accent)' : 'var(--line)'}">
                      <div style="display:flex;align-items:center;gap:8px;min-width:0;flex:1">
                        <span style="font:700 11px var(--font-mono);color:var(--accent)">#${idx + 1}</span>
                        <span style="font-size:13px;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(pl.fullName)}</span>
                        ${isCap ? `<span style="font-size:10px;background:var(--accent);color:var(--on-accent);padding:1px 5px;font-weight:700">CAP</span>` : ''}
                      </div>

                        <div style="display:flex;align-items:center;gap:4px;flex:none">
                          <button
                            type="button"
                            data-action="move-team-player"
                            data-id="${t.id}"
                            data-participant-id="${pl.id || idx + 1}"
                            data-player-index="${idx}"
                            data-make-captain="true"
                            title="Nommer Capitaine et placer en #1"
                            style="background:var(--surface);border:1px solid var(--line);color:${isCap ? 'var(--accent)' : 'var(--muted)'};padding:3px 6px;font-size:11px;cursor:pointer"
                          >★</button>
                          <button
                            type="button"
                            data-action="move-team-player"
                            data-id="${t.id}"
                            data-participant-id="${pl.id || idx + 1}"
                            data-player-index="${idx}"
                            data-dir="up"
                            ${idx === 0 ? 'disabled' : ''}
                            title="Monter dans la liste"
                            style="background:var(--surface);border:1px solid var(--line);color:var(--text-2);padding:3px 6px;font-size:11px;cursor:pointer;opacity:${idx === 0 ? 0.35 : 1}"
                          >↑</button>
                          <button
                            type="button"
                            data-action="move-team-player"
                            data-id="${t.id}"
                            data-participant-id="${pl.id || idx + 1}"
                            data-player-index="${idx}"
                            data-dir="down"
                            ${idx === pDetails.length - 1 ? 'disabled' : ''}
                            title="Descendre dans la liste"
                            style="background:var(--surface);border:1px solid var(--line);color:var(--text-2);padding:3px 6px;font-size:11px;cursor:pointer;opacity:${idx === pDetails.length - 1 ? 0.35 : 1}"
                          >↓</button>
                          ${otherTeams.length > 0 ? `
                            <select
                              data-field="transferPlayerTeam"
                              data-team-id="${t.id}"
                              data-participant-id="${pl.id || idx + 1}"
                              data-player-index="${idx}"
                              title="Déplacer ce joueur vers une autre équipe"
                              style="background:var(--surface);border:1px solid var(--line);color:var(--muted);padding:2px 4px;font-size:11px;max-width:92px;cursor:pointer"
                            >
                              <option value="">⇄ Déplacer</option>
                              ${otherTeams.map(ot => `<option value="${ot.id}">→ ${esc(ot.name || `${ot.p} ${ot.sport}`)}</option>`).join('')}
                            </select>
                          ` : ''}
                          <button
                            type="button"
                            data-action="remove-team-player"
                            data-id="${t.id}"
                            data-participant-id="${pl.id || idx + 1}"
                            data-player-index="${idx}"
                            title="Retirer ce joueur de l'équipe"
                            style="background:var(--surface);border:1px solid var(--line);color:var(--error);padding:3px 7px;font-size:12px;font-weight:700;cursor:pointer"
                          >×</button>
                        </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `}
  `;
}

function renderAdminInscriptions(s, regTone) {
  const pending = s.regs.filter(r => r.status === 'En attente').length;

  return `
    <h1 style="font:italic 900 52px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;margin:0 0 24px">Inscriptions reçues</h1>
    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border:1px solid var(--line);margin-bottom:28px;background:var(--surface)">
      <div style="padding:20px 24px;border-right:1px solid var(--line)">
        <div style="font-size:12px;color:var(--muted);margin-bottom:4px">En attente</div>
        <div style="font:italic 800 32px/1 'Barlow Condensed',sans-serif;color:var(--accent)">${pending}</div>
      </div>
      <div style="padding:20px 24px;border-right:1px solid var(--line)">
        <div style="font-size:12px;color:var(--muted);margin-bottom:4px">Validées</div>
        <div style="font:italic 800 32px/1 'Barlow Condensed',sans-serif">${s.regs.filter(r => r.status === 'Validée').length}</div>
      </div>
      <div style="padding:20px 24px">
        <div style="font-size:12px;color:var(--muted);margin-bottom:4px">Refusées</div>
        <div style="font:italic 800 32px/1 'Barlow Condensed',sans-serif">${s.regs.filter(r => r.status === 'Refusée').length}</div>
      </div>
    </div>

    ${s.regActionError ? `
      <div role="alert" style="padding:12px 16px;margin-bottom:16px;border:1px solid ${R};background:var(--error-bg);color:var(--error-text);font-size:14px">${esc(s.regActionError)}</div>
    ` : ''}

    ${s.regs.length === 0 ? `
      <div style="padding:36px;background:var(--surface);border:1px solid var(--line);text-align:center;color:var(--muted)">
        Aucune inscription soumise via le formulaire public pour le moment.
      </div>
    ` : `
      <div style="display:grid;grid-template-columns:70px minmax(0,1.4fr) 110px minmax(0,1.6fr) 90px 110px 160px;gap:14px;padding:10px 16px;font-size:12px;color:var(--muted);border-bottom:2px solid var(--line)">
        <span>Promo</span><span>Équipe &amp; Capitaine</span><span>Sport</span><span>Joueurs inscrits</span><span>Date</span><span>Statut</span><span>Actions</span>
      </div>

      ${s.regs.map(r => {
        const [bg, fg, bd] = regTone[r.status] || [T, 'var(--bg)', T];
        const pList = Array.isArray(r.playersList) ? r.playersList : [];
        return `
          <div style="display:grid;grid-template-columns:70px minmax(0,1.4fr) 110px minmax(0,1.6fr) 90px 110px 160px;gap:14px;align-items:center;padding:14px 16px;border-bottom:1px solid var(--line);background:var(--surface)">
            <span style="font-weight:700;color:var(--accent)">${esc(r.promo)}</span>
            <div>
              <div style="font-weight:700;color:var(--text)">${esc(r.team)}</div>
              <div style="font-size:12px;color:var(--muted)">${esc(r.captain)}${r.email ? ` · ${esc(r.email)}` : ''}</div>
            </div>
            <span style="color:var(--text)">${esc(r.sport)}</span>
            <div style="font-size:12px;color:var(--text-2)">
              <strong>${r.players} j.</strong> : ${pList.length > 0 ? esc(pList.join(', ')) : '—'}
            </div>
            <span style="font-size:12px;color:var(--muted)">${esc(r.date || '')}</span>
            <span style="justify-self:start;padding:3px 9px;font-size:12px;font-weight:700;background:${bg};color:${fg};border:1px solid ${bd}">${esc(r.status)}</span>
            <div style="display:flex;gap:6px">
              ${r.status !== 'Validée' ? `
                <button data-action="reg-status" data-id="${r.id}" data-status="Validée" class="hover-accent" style="background:var(--accent);border:0;color:var(--on-accent);padding:7px 12px;font:700 12px var(--font-body);cursor:pointer">Valider</button>
              ` : ''}
              ${r.status !== 'Refusée' ? `
                <button data-action="reg-status" data-id="${r.id}" data-status="Refusée" style="background:none;border:1px solid var(--line-strong);color:var(--text);padding:6px 12px;font:600 12px var(--font-body);cursor:pointer">Refuser</button>
              ` : ''}
              ${r.status === 'Refusée' ? `
                <button data-action="delete-registration" data-id="${r.id}" data-team="${esc(r.team)}" title="Supprimer l'inscription" style="background:none;border:1px solid ${R};color:${R};padding:6px 10px;font:600 12px var(--font-body);cursor:pointer">Suppr.</button>
              ` : ''}
            </div>
          </div>
        `;
      }).join('')}
    `}
  `;
}

function renderMediaThumb(p, height) {
  return p.type === 'video'
    ? `<video src="${esc(p.url)}#t=0.1" muted playsinline preload="metadata" style="width:100%;height:${height};object-fit:cover;display:block;background:#000"></video>`
    : `<img src="${esc(p.url)}" alt="${esc(p.caption)}" loading="lazy" style="width:100%;height:${height};object-fit:cover;display:block;background:var(--surface-3)">`;
}

function renderAlbumForm(f) {
  const input = `background:var(--bg);border:1px solid ${L};color:${T};padding:10px 12px;font:14px var(--font-body)`;
  return `
    <div style="background:var(--surface);border:1px solid ${f.editingId ? R : L};padding:20px 24px;margin-top:24px">
      <div style="font:italic 800 22px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;margin-bottom:6px">
        ${f.editingId ? 'Modifier l’album' : 'Nouvel album / événement'}
      </div>
      <div style="font-size:13px;color:${M};margin-bottom:16px">
        Datez l'album pour qu'il soit classé automatiquement dans la galerie : à venir, en cours ou passé. Sans date, il apparaît dans « Autres ».
      </div>
      <div style="display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr) minmax(0,1fr) auto;gap:12px;align-items:end">
        <label style="display:flex;flex-direction:column;gap:6px;font-size:12px;color:${M}">
          Nom
          <input data-field="albumForm-name" value="${esc(f.name)}" maxlength="80" placeholder="Nom de l'événement" style="${input}">
        </label>
        <label style="display:flex;flex-direction:column;gap:6px;font-size:12px;color:${M}">
          Date de début
          <input type="date" data-field="albumForm-start" value="${esc(f.start)}" style="${input};color-scheme:var(--scheme)">
        </label>
        <label style="display:flex;flex-direction:column;gap:6px;font-size:12px;color:${M}">
          Date de fin (optionnelle)
          <input type="date" data-field="albumForm-end" value="${esc(f.end)}" style="${input};color-scheme:var(--scheme)">
        </label>
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:${T};padding-bottom:10px">
          <input type="checkbox" data-field="albumForm-published" ${f.published ? 'checked' : ''}> Publié
        </label>
      </div>
      ${f.error ? `<div style="color:var(--error-text);font-size:13px;margin-top:12px">${esc(f.error)}</div>` : ''}
      <div style="display:flex;gap:10px;margin-top:16px">
        <button data-action="submit-album" class="hover-accent" style="background:${R};color:var(--on-accent);border:0;padding:11px 18px;font:700 14px var(--font-body);cursor:pointer">
          ${f.editingId ? 'Enregistrer' : '+ Créer l’album'}
        </button>
        ${f.editingId ? `<button data-action="cancel-album-edit" style="background:transparent;color:${T};border:1px solid var(--line-strong);padding:11px 18px;font:600 14px var(--font-body);cursor:pointer">Annuler</button>` : ''}
      </div>
    </div>
  `;
}

function renderAdminGallery(s, ALBUMS) {
  const targetAlbum = ALBUMS.includes(s.mediaAlbum) ? s.mediaAlbum : ALBUMS[0];
  const up = s.mediaUploading;
  const locked = Boolean(up) || s.albums.length === 0;
  const heroId = s.adminSlots?.hero?.id;

  return `
    <h1 style="font:italic 900 52px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;margin:0 0 24px">Galerie</h1>
    <div style="border:2px dashed var(--line-strong);padding:32px 40px;display:flex;align-items:center;justify-content:space-between;gap:24px;margin-bottom:16px;flex-wrap:wrap">
      <div>
        <div style="font:italic 800 28px/1 'Barlow Condensed',sans-serif;text-transform:uppercase">Déposer des photos ou vidéos</div>
        <div style="font-size:13px;color:${M};margin-top:6px">Photos (JPG, PNG, WEBP, GIF) et vidéos (MP4, WEBM, MOV) · ${Math.round((s.uploadConfig?.maxBytes || 209715200) / 1048576)} Mo max par fichier · sélection multiple possible</div>
      </div>
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <label style="display:flex;flex-direction:column;gap:6px;font-size:12px;color:${M}">
          Album de destination
          <select data-field="mediaAlbum" ${up ? 'disabled' : ''} style="background:var(--bg);border:1px solid ${L};color:${T};padding:10px 12px;font:14px var(--font-body)">
            ${groupAlbumsByPeriod(s.albums).map(g => `
              <optgroup label="${esc(g.label)}">
                ${g.albums.map(a => `<option value="${esc(a.name)}" ${a.name === targetAlbum ? 'selected' : ''}>${esc(a.name)}${a.start ? ` · ${esc(formatAlbumDates(a))}` : ''}</option>`).join('')}
              </optgroup>
            `).join('')}
          </select>
        </label>
        <label class="hover-accent" title="${s.albums.length === 0 ? 'Créez d’abord un album' : ''}" style="align-self:flex-end;background:${locked ? 'var(--line-strong)' : R};color:var(--on-accent);padding:13px 20px;font:700 14px var(--font-body);cursor:${up ? 'wait' : locked ? 'not-allowed' : 'pointer'}">
          ${up ? `Envoi ${Math.min(up.done + 1, up.total)}/${up.total}${up.percent ? ` · ${up.percent} %` : ''}…` : '+ Ajouter des médias'}
          <input type="file" data-field="mediaFiles" multiple accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" ${locked ? 'disabled' : ''} style="display:none">
        </label>
      </div>
    </div>

    ${s.mediaError || s.mediaSuccess ? `
      <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;padding:12px 16px;margin-bottom:16px;font-size:14px;border:1px solid ${s.mediaError ? R : 'var(--success-line)'};background:${s.mediaError ? 'var(--error-bg)' : 'var(--success-bg)'};color:${s.mediaError ? 'var(--error-text)' : 'var(--success-text)'}">
        <span>${esc(s.mediaSuccess)} ${esc(s.mediaError)}</span>
        <button data-action="dismiss-media-msg" style="background:none;border:0;color:inherit;cursor:pointer;font-size:16px">×</button>
      </div>
    ` : ''}

    ${renderAlbumForm(s.albumForm)}

    <div style="display:grid;grid-template-columns:80px minmax(0,1fr) 110px 100px 120px 170px;gap:16px;padding:10px 16px;font-size:12px;color:${M};border-bottom:2px solid ${L};margin-top:24px">
      <span></span><span>Album / événement</span><span>Période</span><span>Médias</span><span>Visibilité</span><span></span>
    </div>

    ${s.albums.length === 0 ? `
      <div style="padding:16px;color:${M};font-size:14px;border-bottom:1px solid ${L}">Aucun album. Créez-en un ci-dessus avant d'ajouter des médias.</div>
    ` : groupAlbumsByPeriod(s.albums).flatMap(g => g.albums).map(a => {
      const on = Boolean(a.published);
      const items = s.adminPhotos.filter(p => p.album === a.name);
      const period = albumPeriod(a);
      const periodColor = { present: R, future: 'var(--info)', past: M, none: 'var(--dim)' }[period];
      const editing = s.albumForm.editingId === a.id;
      return `
        <div style="display:grid;grid-template-columns:80px minmax(0,1fr) 110px 100px 120px 170px;gap:16px;align-items:center;padding:12px 16px;border-bottom:1px solid ${L};background:${editing ? 'var(--surface-2)' : 'transparent'}">
          <div style="height:52px;overflow:hidden;background:repeating-linear-gradient(135deg,var(--surface-3) 0 6px,var(--surface-4) 6px 12px)">${items[0] ? renderMediaThumb(items[0], '52px') : ''}</div>
          <div>
            <strong style="font-size:15px">${esc(a.name)}</strong>
            <div style="font-size:12px;color:${M};margin-top:3px">${a.start ? esc(formatAlbumDates(a)) : 'Sans date'}</div>
          </div>
          <span style="justify-self:start;font:700 11px var(--font-body);text-transform:uppercase;letter-spacing:.06em;color:${periodColor};border:1px solid ${periodColor};padding:4px 8px">${period === 'past' ? 'Passé' : esc(PERIOD_LABELS[period])}</span>
          <span style="font-size:14px;color:${M}">${items.length} média(s)</span>
          <button data-action="toggle-album" data-name="${esc(a.name)}" style="justify-self:start;padding:7px 12px;font:700 12px var(--font-body);cursor:pointer;background:${on ? R : 'transparent'};color:${on ? 'var(--on-accent)' : M};border:1px solid ${on ? R : 'var(--line-strong)'}">
            ${on ? 'Publié' : 'Brouillon'}
          </button>
          <div style="display:flex;gap:6px;justify-content:flex-end">
            <button data-action="edit-album" data-id="${a.id}" style="padding:6px 10px;font:600 12px var(--font-body);cursor:pointer;background:transparent;color:${T};border:1px solid var(--line-strong)">Modifier</button>
            <button data-action="delete-album" data-id="${a.id}" data-name="${esc(a.name)}" ${items.length > 0 ? 'disabled title="Déplacez ou supprimez d’abord ses médias"' : ''} style="padding:6px 10px;font:600 12px var(--font-body);cursor:${items.length > 0 ? 'not-allowed' : 'pointer'};background:transparent;color:${items.length > 0 ? 'var(--dim)' : R};border:1px solid ${items.length > 0 ? 'var(--line-strong)' : R}">Supprimer</button>
          </div>
        </div>
      `;
    }).join('')}

    <h2 style="font:italic 800 32px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;margin:40px 0 16px">Médias (${s.adminPhotos.length})</h2>
    ${s.adminPhotos.length === 0 ? `
      <div style="padding:20px;background:var(--surface);border:1px solid ${L};color:${M};font-size:14px">Aucun média pour le moment. Utilisez « Ajouter des médias » ci-dessus.</div>
    ` : `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px">
        ${s.adminPhotos.map(p => `
          <div style="background:var(--surface);border:1px solid ${p.id === heroId ? R : L};display:flex;flex-direction:column">
            <a href="${esc(p.url)}" target="_blank" rel="noopener" style="display:block;position:relative">
              ${renderMediaThumb(p, '150px')}
              ${p.type === 'video' ? `<span style="position:absolute;top:8px;left:8px;background:rgba(0,0,0,.7);color:var(--on-accent);font:600 11px var(--font-body);padding:3px 6px">VIDÉO</span>` : ''}
              ${p.id === heroId ? `<span style="position:absolute;top:8px;right:8px;background:${R};color:var(--on-accent);font:600 11px var(--font-body);padding:3px 6px" title="Affiché en tête de l'accueil, donc masqué dans la galerie publique">ACCUEIL · hors galerie</span>` : ''}
            </a>
            <div style="padding:10px;display:flex;flex-direction:column;gap:8px">
              <input data-field="mediaCaption" data-id="${p.id}" value="${esc(p.caption)}" maxlength="200" placeholder="Légende" style="background:var(--bg);border:1px solid ${L};color:${T};padding:7px 9px;font:13px var(--font-body)">
              <select data-field="mediaMoveAlbum" data-id="${p.id}" style="background:var(--bg);border:1px solid ${L};color:${T};padding:7px 9px;font:13px var(--font-body)">
                ${ALBUMS.map(name => `<option value="${esc(name)}" ${name === p.album ? 'selected' : ''}>${esc(name)}</option>`).join('')}
              </select>
              <div style="display:flex;gap:6px;flex-wrap:wrap">
                <button data-action="set-media-slot" data-slot="hero" data-id="${p.id === heroId ? '' : p.id}" style="flex:1;padding:6px 8px;font:600 12px var(--font-body);cursor:pointer;background:transparent;color:${T};border:1px solid var(--line-strong)">
                  ${p.id === heroId ? 'Retirer de l’accueil' : 'Mettre en accueil'}
                </button>
                <button data-action="toggle-media-big" data-id="${p.id}" data-big="${p.big ? 'true' : 'false'}" title="Afficher en grand format dans la galerie" style="padding:6px 8px;font:600 12px var(--font-body);cursor:pointer;background:${p.big ? 'var(--line)' : 'transparent'};color:${T};border:1px solid var(--line-strong)">
                  ${p.big ? 'Grand ✓' : 'Grand'}
                </button>
                <button data-action="delete-media" data-id="${p.id}" style="padding:6px 8px;font:600 12px var(--font-body);cursor:pointer;background:transparent;color:${R};border:1px solid ${R}">
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `}
  `;
}

function renderAdminEdition(s) {
  const f = s.editionForm || { year: String(EDITION.year), start: EDITION.start, time: EDITION.time, venue: EDITION.venue, contact: EDITION.contact || '' };
  const input = `background:var(--bg);border:1px solid ${L};color:${T};padding:11px 12px;font:15px var(--font-body);color-scheme:var(--scheme)`;
  return `
    <h1 style="font:italic 900 56px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;margin:0">Édition du tournoi</h1>
    <p style="font-size:14px;color:${M};margin:8px 0 28px;max-width:720px">
      L'année et les dates s'affichent partout sur le site : en-tête, compte à rebours, jours du planning, inscription et numéros de dossier.
      Le tournoi dure ${DAYS.length} jours à partir de la date du premier jour.
    </p>

    <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:28px;align-items:start;max-width:1100px">
      <div style="background:var(--surface);border:1px solid ${L};padding:24px;display:flex;flex-direction:column;gap:16px">
        <div style="display:grid;grid-template-columns:140px minmax(0,1fr) 120px;gap:12px">
          <label style="display:flex;flex-direction:column;gap:6px;font-size:12px;color:${M}">
            Année
            <input data-field="editionForm-year" type="number" min="2000" max="2100" value="${esc(f.year)}" style="${input}">
          </label>
          <label style="display:flex;flex-direction:column;gap:6px;font-size:12px;color:${M}">
            Premier jour
            <input data-field="editionForm-start" type="date" value="${esc(f.start)}" style="${input}">
          </label>
          <label style="display:flex;flex-direction:column;gap:6px;font-size:12px;color:${M}">
            Coup d'envoi
            <input data-field="editionForm-time" type="time" value="${esc(f.time)}" style="${input}">
          </label>
        </div>
        <label style="display:flex;flex-direction:column;gap:6px;font-size:12px;color:${M}">
          Lieu
          <input data-field="editionForm-venue" maxlength="80" value="${esc(f.venue)}" style="${input}">
        </label>
        <label style="display:flex;flex-direction:column;gap:6px;font-size:12px;color:${M}">
          E-mail de contact affiché sur le site (facultatif)
          <input data-field="editionForm-contact" type="email" maxlength="120" value="${esc(f.contact)}" placeholder="Laisser vide pour ne rien afficher" style="${input}">
        </label>
        <p style="font-size:12px;color:${M};margin:0">Changer l'année décale automatiquement la date du premier jour sur la même date de la nouvelle année.</p>
        ${f.error ? `<div role="alert" style="padding:10px 12px;border:1px solid ${R};background:var(--error-bg);color:var(--error-text);font-size:13px">${esc(f.error)}</div>` : ''}
        ${f.success ? `<div style="padding:10px 12px;border:1px solid var(--success-line);background:var(--success-bg);color:var(--success-text);font-size:13px">${esc(f.success)}</div>` : ''}
        <button data-action="save-edition" class="hover-accent ${f.loading ? 'is-loading' : ''}" ${f.loading ? 'disabled' : ''} style="align-self:flex-start;background:${f.loading ? 'var(--line-strong)' : R};color:var(--on-accent);border:0;padding:13px 20px;font:700 14px var(--font-body);cursor:pointer">
          ${f.loading ? 'Enregistrement…' : "Enregistrer l'édition"}
        </button>
      </div>

      <div style="background:var(--surface);border:1px solid ${L};padding:24px">
        <div style="font-size:12px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:${R};margin-bottom:8px">Édition en ligne</div>
        <div style="font:italic 900 44px/1 'Barlow Condensed',sans-serif;text-transform:uppercase">Interpromos ${esc(EDITION.year)}</div>
        <div style="font-size:15px;color:var(--text-2);margin:8px 0 18px">${esc(EDITION.range)} · ${esc(EDITION.venue)} · coup d'envoi ${esc(EDITION.time)}${EDITION.contact ? ` · ${esc(EDITION.contact)}` : ''}</div>
        ${DAYS.map(day => `
          <div style="display:flex;justify-content:space-between;padding:10px 0;border-top:1px solid ${L};font-size:14px">
            <span>${esc(day[0])}</span><span style="color:${M}">${esc(day[1])} · ${esc(day[2])}</span>
          </div>
        `).join('')}
        <p style="font-size:12px;color:${M};margin:16px 0 0">Les matchs, équipes, inscriptions et albums existants ne sont pas modifiés : les matchs restent rattachés à leur jour (J1, J2, J3).</p>
      </div>
    </div>
  `;
}

function renderAdminImport(s) {
  return `
    <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:24px;flex-wrap:wrap">
      <div>
        <h1 style="font:italic 900 52px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;margin:0">Import CSV des équipes</h1>
        <p style="font-size:14px;color:var(--muted);margin:8px 0 0">Importez un fichier CSV de fiche d'équipe par promo (colonnes par sport ou lignes) pour créer automatiquement les équipes et les participants.</p>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,0.9fr);gap:28px;align-items:start">
      <div style="background:var(--surface);border:1px solid var(--line);padding:24px;display:flex;flex-direction:column;gap:20px">
        <div style="display:grid;grid-template-columns:160px minmax(0,1fr);gap:16px">
          <label style="display:flex;flex-direction:column;gap:8px">
            <span style="font-size:13px;font-weight:600">Promotion cible</span>
            <select
              data-field="importPromo"
              class="input-focus"
              style="background:var(--bg);border:1px solid var(--line);color:var(--text);padding:12px 16px;font:15px var(--font-body);outline:none"
            >
              ${PROMOS.map(p => `<option value="${esc(p)}" ${s.importPromo === p ? 'selected' : ''}>${esc(p)}</option>`).join('')}
            </select>
          </label>

          <label style="display:flex;flex-direction:column;gap:8px">
            <span style="font-size:13px;font-weight:600">Charger un fichier .csv depuis votre ordinateur</span>
            <input
              type="file"
              accept=".csv,.txt"
              data-field="importCsvFile"
              style="background:var(--bg);border:1px solid var(--line);color:var(--text-2);padding:9px 12px;font:13px var(--font-body);cursor:pointer"
            >
          </label>
        </div>

        <label style="display:flex;flex-direction:column;gap:8px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:13px;font-weight:600">Contenu CSV ${s.importFileName ? `(${esc(s.importFileName)})` : ''}</span>
            <span style="font-size:12px;color:var(--muted)">Séparateur <code>;</code> ou <code>,</code> supporté</span>
          </div>
          <textarea
            data-field="importCsvContent"
            placeholder="Collez ici le contenu du fichier CSV ou sélectionnez un fichier ci-dessus..."
            rows="11"
            class="input-focus"
            style="background:var(--bg);border:1px solid ${s.importError ? R : 'var(--line)'};color:var(--text);padding:12px 16px;font:13px var(--font-mono);outline:none;resize:vertical;min-height:220px"
          >${esc(s.importCsvContent)}</textarea>
          ${s.importError ? `<span style="font-size:13px;color:var(--error)">${esc(s.importError)}</span>` : ''}
          ${s.importSuccess ? `<span style="font-size:13px;color:var(--success)">${esc(s.importSuccess)}</span>` : ''}
        </label>

        <div style="display:flex;gap:12px;align-items:center">
          <button
            type="button"
            data-action="import-csv"
            ${s.importLoading ? 'disabled' : ''}
            class="hover-accent"
            style="background:var(--accent);color:var(--on-accent);border:0;padding:14px 22px;font:700 15px var(--font-body);cursor:pointer"
          >
            ${s.importLoading ? 'Importation en cours...' : `Importer les équipes (${esc(s.importPromo)}) →`}
          </button>

          <button
            type="button"
            data-action="admin-tab"
            data-tab="equipes"
            style="background:transparent;border:1px solid var(--line-strong);color:var(--text);padding:13px 18px;font:600 14px var(--font-body);cursor:pointer"
          >
            Voir les ${s.teams.length} équipe(s) en base
          </button>
        </div>
      </div>

      <div style="background:var(--surface);border:1px solid var(--line);padding:24px;display:flex;flex-direction:column;gap:16px">
        <div style="font:italic 800 22px/1 'Barlow Condensed',sans-serif;text-transform:uppercase">
          ${s.lastImportedTeams.length > 0 ? 'Dernier import effectué' : 'Formats CSV reconnus'}
        </div>

        ${s.lastImportedTeams.length > 0 ? `
          <div style="display:grid;gap:10px">
            ${s.lastImportedTeams.map(t => `
              <div style="padding:12px 14px;background:var(--bg);border:1px solid var(--line)">
                <div style="display:flex;justify-content:space-between;font-weight:700;font-size:14px;color:var(--text)">
                  <span>${esc(t.name)}</span>
                  <span style="color:var(--success)">${t.players} joueurs</span>
                </div>
                <div style="font-size:12px;color:var(--muted);margin-top:4px">
                  ${esc((t.playersList || []).join(', '))}
                </div>
              </div>
            `).join('')}
          </div>
        ` : `
          <div style="font-size:13px;color:var(--text-2);line-height:1.6">
            <p style="margin:0 0 10px"><strong>1. Format Fiche d'équipe (colonnes par sport) :</strong></p>
            <pre style="background:var(--bg);border:1px solid var(--line);padding:12px;font:12px var(--font-mono);color:var(--muted);overflow-x:auto;margin:0 0 14px">Volleyball 1 (6);Basketball 1 (5);Futsal 1 (7)
Prénom Nom;Prénom Nom;Prénom Nom
Prénom Nom;Prénom Nom;Prénom Nom</pre>
            <p style="margin:0 0 10px"><strong>2. Format Lignes (Sport ; Équipe ; Capitaine ; Joueurs) :</strong></p>
            <pre style="background:var(--bg);border:1px solid var(--line);padding:12px;font:12px var(--font-mono);color:var(--muted);overflow-x:auto;margin:0">Sport;Nom de l'équipe;Prénom Nom du capitaine;Prénom Nom, Prénom Nom, ...</pre>
          </div>
        `}
      </div>
    </div>
  `;
}
