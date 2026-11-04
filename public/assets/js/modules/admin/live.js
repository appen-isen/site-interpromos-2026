// Onglet « Scores en direct » et réglages de l'écran TV.
import { DAYS, SPORTS, EDITION } from '../state.js';
import { esc, teamTag } from '../utils.js';
import { R, T, M, L } from './ui.js';

function renderLiveTeam(m, team) {
  const name = (team === 0 ? m.teamAName : m.teamBName) || (team === 0 ? m.a : m.b);
  const promo = team === 0 ? m.a : m.b;
  const score = team === 0 ? m.sa : m.sb;
  return `
    <div style="padding:20px;display:flex;flex-direction:column;align-items:center;gap:12px">
      <span style="font:italic 800 24px/1 'Barlow Condensed',sans-serif;text-align:center">${teamTag(name, promo)}</span>
      <span class="live-score-big" style="font:italic 900 72px/1 'Barlow Condensed',sans-serif;font-variant-numeric:tabular-nums">${score}</span>
      <div style="display:flex;gap:6px">
        <button data-action="match-score" data-id="${esc(m.id)}" data-team="${team}" data-delta="-1" aria-label="Retirer un point à ${esc(name)}" ${score <= 0 ? 'disabled' : ''} class="score-btn-minus" style="width:48px;height:48px;background:var(--bg);border:1px solid ${L};color:${T};font-size:22px;cursor:pointer">−</button>
        <button data-action="match-score" data-id="${esc(m.id)}" data-team="${team}" data-delta="1" aria-label="Ajouter un point à ${esc(name)}" class="hover-accent score-btn-plus" style="width:72px;height:48px;background:${R};border:0;color:var(--on-accent);font-size:22px;font-weight:700;cursor:pointer">+1</button>
      </div>
    </div>
  `;
}

// Écran TV (/tv) : lien à ouvrir sur le téléviseur, sport affiché et message défilant
function renderTvControl(s) {
  const f = s.tvForm;
  const current = EDITION.tv || {};
  const sport = String(f.sport ?? (current.sport ?? ''));
  const message = f.message ?? (current.message || '');
  const input = `background:var(--bg);border:1px solid ${L};color:${T};padding:10px 12px;font:14px var(--font-body);color-scheme:var(--scheme)`;
  const tvUrl = `${window.location.origin}/tv`;

  return `
    <section style="background:var(--surface);border:1px solid ${L};padding:20px 24px;margin:0 0 28px;display:flex;flex-direction:column;gap:14px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap">
        <div>
          <div style="font-weight:700;font-size:16px">Mode TV</div>
          <div style="font-size:13px;color:${M};margin-top:2px">Scores en direct, classement et prochains matchs en plein écran, à ouvrir sur un téléviseur : <span style="font-family:var(--font-mono);color:${T}">${esc(tvUrl)}</span></div>
        </div>
        <a href="/tv" target="_blank" rel="noopener" class="hover-accent" style="background:${R};color:var(--on-accent);padding:11px 16px;font:700 13px var(--font-body);text-decoration:none">Ouvrir le mode TV ↗</a>
      </div>
      <div style="display:grid;grid-template-columns:200px minmax(0,1fr) auto;gap:10px;align-items:end;border-top:1px solid ${L};padding-top:14px">
        <label style="display:flex;flex-direction:column;gap:6px;font-size:12px;color:${M}">
          Sport affiché
          <select data-field="tvForm-sport" style="${input}">
            <option value="" ${sport === '' ? 'selected' : ''}>Tous les sports</option>
            ${SPORTS.map((name, i) => `<option value="${i}" ${sport === String(i) ? 'selected' : ''}>${esc(name)}</option>`).join('')}
          </select>
        </label>
        <label style="display:flex;flex-direction:column;gap:6px;font-size:12px;color:${M}">
          Message défilant (facultatif)
          <input data-field="tvForm-message" maxlength="200" value="${esc(message)}" placeholder="Ex : Finale de foot à 16h sur le terrain synthétique !" style="${input}">
        </label>
        <div style="display:flex;gap:8px">
          <button data-action="save-tv" ${f.loading ? 'disabled' : ''} class="hover-accent ${f.loading ? 'is-loading' : ''}" style="background:${R};color:var(--on-accent);border:0;padding:11px 16px;font:700 13px var(--font-body);cursor:pointer">Mettre à jour l'écran</button>
          ${current.message ? `<button data-action="clear-tv-message" ${f.loading ? 'disabled' : ''} style="background:none;border:1px solid var(--line-strong);color:${T};padding:10px 14px;font:600 13px var(--font-body);cursor:pointer">Retirer le message</button>` : ''}
        </div>
      </div>
      <p style="font-size:12px;color:${M};margin:0">Pour un écran dédié à un sport, ajoutez-le à l'adresse : <span style="font-family:var(--font-mono)">/tv?sport=${esc(SPORTS[0] || 'Football')}</span> (prioritaire sur ce réglage).</p>
      ${f.error ? `<div role="alert" style="padding:10px 12px;border:1px solid ${R};background:var(--error-bg);color:var(--error-text);font-size:13px">${esc(f.error)}</div>` : ''}
      ${f.success ? `<div style="padding:10px 12px;border:1px solid var(--success-line);background:var(--success-bg);color:var(--success-text);font-size:13px">${esc(f.success)}</div>` : ''}
    </section>
  `;
}

export function renderAdminLive(s, adminMatches, DAYS, liveList) {
  const toStart = adminMatches.filter(m => m.status === 'up');

  return `
    <h1 style="font:italic 900 56px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;margin:0">Scores en direct</h1>
    <p style="font-size:14px;color:${M};margin:8px 0 28px">Chaque point saisi s'affiche aussitôt sur le site (bandeau live, planning, classement) et sur l'écran TV.</p>
    ${renderTvControl(s)}

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
              <button data-action="match-status" data-id="${esc(m.id)}" data-status="done" data-confirm="Terminer ${esc(m.sport)} : ${esc(m.teamAName || m.a)} (${esc(m.a)}) ${m.sa} – ${m.sb} ${esc(m.teamBName || m.b)} (${esc(m.b)}) ? Le score sera compté au classement." class="hover-border-white" style="background:none;border:1px solid var(--line-strong);color:${T};padding:6px 12px;font:600 12px var(--font-body);cursor:pointer;white-space:nowrap">Terminer le match</button>
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
        <span style="font:italic 800 22px/1 'Barlow Condensed',sans-serif">${teamTag(m.teamAName, m.a)} <span style="color:var(--dim);font:400 14px var(--font-body);margin:0 6px">vs</span> ${teamTag(m.teamBName, m.b)}</span>
        <span style="font-size:13px;color:${M}">${esc(m.venue || '')}</span>
        <button data-action="match-status" data-id="${esc(m.id)}" data-status="live" data-reset="true" class="hover-accent" style="justify-self:end;background:${R};color:var(--on-accent);border:0;padding:9px 14px;font:700 13px var(--font-body);cursor:pointer">Démarrer ▶</button>
      </div>
    `).join('')}
  `;
}
