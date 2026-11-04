// Équipes engagées, filtrées par promo et par sport.
import { SPORTS, PROMOS } from '../state.js';
import { esc } from '../utils.js';

export function renderTeams(d) {
  const { teams, s } = d;
  const chip = (key, value) => {
    const on = s[key] === value;
    return `<button data-action="teams-filter" data-key="${key}" data-value="${esc(value)}" class="album-chip" style="padding:8px 14px;border:1px solid ${on ? 'var(--text)' : 'var(--line)'};background:${on ? 'var(--text)' : 'transparent'};color:${on ? 'var(--bg)' : 'var(--muted)'};font:600 13px var(--font-body);cursor:pointer">${esc(value)}</button>`;
  };
  const filterRow = (label, key, values) => `
    <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
      <span style="width:64px;font-size:12px;color:var(--muted)">${label}</span>
      ${values.map(v => chip(key, v)).join('')}
    </div>
  `;
  const stat = (label, value) => `
    <div>
      <div style="font-size:11px;color:var(--muted)">${label}</div>
      <div style="font-size:14px;font-weight:600;margin-top:2px">${esc(value)}</div>
    </div>
  `;

  return `
    <div style="padding:56px 48px 0;display:flex;align-items:flex-end;justify-content:space-between;gap:24px;flex-wrap:wrap">
      <div>
        <div style="font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)">${teams.length} équipe${teams.length > 1 ? 's' : ''}</div>
        <h1 style="font:italic 900 88px/.9 'Barlow Condensed',sans-serif;text-transform:uppercase;margin:8px 0 0">Équipes</h1>
      </div>
      <button data-action="nav" data-page="inscription" class="hover-accent" style="background:var(--accent);color:var(--on-accent);border:0;padding:14px 20px;font:700 15px var(--font-body);cursor:pointer">
        Inscrire une équipe →
      </button>
    </div>

    <div style="display:flex;flex-direction:column;gap:10px;padding:32px 48px 24px">
      ${filterRow('Promo', 'promoF', ['Toutes', ...PROMOS])}
      ${filterRow('Sport', 'sportF', ['Tous', ...SPORTS])}
    </div>

    ${teams.length === 0 ? `
      <div style="margin:0 48px 72px;padding:28px 0;border-top:1px solid var(--line);font-size:15px;color:var(--muted)">
        Aucune équipe ${s.promoF !== 'Toutes' || s.sportF !== 'Tous' ? 'pour ces critères' : 'enregistrée pour le moment'}.
      </div>
    ` : `
      <div class="teams-grid" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:0 48px 72px">
        ${teams.map(t => `
          <div style="background:var(--surface-2);padding:24px;display:flex;flex-direction:column;gap:16px">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
              <span style="font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--accent)">${esc(t.sport)}</span>
              <span style="padding:3px 9px;border:1px solid var(--line-strong);font-size:12px;font-weight:700">${esc(t.p)}</span>
            </div>
            <div style="font:italic 800 34px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;overflow-wrap:anywhere">${esc(t.name || `${t.p} ${t.sport}`)}</div>
            <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;padding-top:14px;border-top:1px solid var(--line)">
              ${stat('Capitaine', t.captain || '—')}
              ${stat('Joueurs', t.players || 0)}
              ${stat('Bilan', t.rec)}
            </div>
          </div>
        `).join('')}
      </div>
    `}
  `;
}
