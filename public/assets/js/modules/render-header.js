import { esc } from './utils.js';
import { state, EDITION } from './state.js';
import { renderThemeToggle } from './theme.js';

export function renderPublicHeader(liveList) {
  const showTicker = liveList.length > 0;
  const pages = [
    ['home', 'Accueil'],
    ['planning', 'Planning'],
    ['resultats', 'Résultats'],
    ['equipes', 'Équipes'],
    ['galerie', 'Galerie']
  ];

  return `
    ${showTicker ? `
      <div style="display:flex;align-items:stretch;background:var(--bg-deep);border-bottom:1px solid var(--line);overflow-x:auto;white-space:nowrap">
        <div style="display:flex;align-items:center;gap:8px;padding:10px 20px;background:var(--accent);color:var(--on-accent);font-weight:700;letter-spacing:.1em;text-transform:uppercase;font-size:12px;flex:none">
          <span class="pulse-dot-white"></span>En direct
        </div>
        ${liveList.map(g => `
          <button data-action="go-planning-day" data-day="${g.d}" class="hover-surface" style="display:flex;align-items:center;gap:10px;padding:10px 20px;border:0;border-right:1px solid var(--line);background:transparent;color:var(--text);font:13px var(--font-body);cursor:pointer;flex:none">
            <span style="color:var(--muted)">${esc(g.sport)}</span>
            <strong>${esc(g.a)}</strong>
            <span style="font-weight:800;font-variant-numeric:tabular-nums;color:var(--accent)">${esc(g.score)}</span>
            <strong>${esc(g.b)}</strong>
          </button>
        `).join('')}
      </div>
    ` : ''}

    <nav class="main-nav" style="display:flex;align-items:center;gap:28px;padding:18px 48px;border-bottom:1px solid var(--line)">
      <button data-action="nav" data-page="home" style="display:flex;align-items:center;gap:12px;margin-right:auto;background:none;border:0;color:var(--text);cursor:pointer;padding:0">
        <span style="width:36px;height:36px;background:var(--logo-bg);display:grid;place-items:center">
          <img src="/assets/logo_bds.svg" alt="BDS" style="width:28px;height:28px">
        </span>
        <span style="font:italic 800 24px/1 'Barlow Condensed',sans-serif;text-transform:uppercase">Interpromos ${esc(EDITION.shortYear)}</span>
      </button>

      ${pages.map(([p, label]) => {
        const active = state.page === p;
        return `
          <button data-action="nav" data-page="${p}" style="background:none;border:0;border-bottom:2px solid ${active ? 'var(--accent)' : 'transparent'};padding:6px 0;color:${active ? 'var(--text)' : 'var(--muted)'};font:600 14px var(--font-body);cursor:pointer">
            ${esc(label)}
          </button>
        `;
      }).join('')}

      ${renderThemeToggle()}

      <button data-action="nav" data-page="inscription" class="hover-accent" style="background:var(--accent);color:var(--on-accent);border:0;padding:11px 18px;font:700 14px var(--font-body);cursor:pointer">
        S'inscrire →
      </button>
    </nav>
  `;
}
