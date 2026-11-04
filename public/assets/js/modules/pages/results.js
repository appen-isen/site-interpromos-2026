// Résultats et classements par équipe : général (toutes les équipes) et par sport.
import { SPORTS } from '../state.js';
import { esc, teamTag } from '../utils.js';

export function renderResults(d) {
  const { ranking, sportStandAll, doneList, byTime, s } = d;
  const si = Math.min(Math.max(0, s.resSport || 0), SPORTS.length - 1);
  const sportStand = sportStandAll[si] || [];
  const sportResults = doneList.filter(m => m.si === si).sort((x, y) => -byTime(x, y));
  const coef = s.standings?.bySport?.find(x => x.si === si)?.coef || 1;
  const anyCoef = (s.standings?.bySport || []).some(x => x.coef && x.coef !== 1);
  const cols = '48px minmax(220px,1fr) 150px 110px 64px';

  return `
    <div style="padding:56px 48px 0">
      <div style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)">
        <span class="pulse-dot-red" style="width:8px;height:8px"></span>Mis à jour en direct
      </div>
      <h1 style="font:italic 900 88px/.9 'Barlow Condensed',sans-serif;text-transform:uppercase;margin:8px 0 0">Résultats &amp; classements</h1>
    </div>

    <div style="padding:40px 48px;overflow-x:auto">
      <h2 style="font:italic 800 36px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;margin:0 0 16px">Classement général</h2>
      <div style="display:grid;grid-template-columns:${cols};min-width:640px;gap:12px;padding:10px 0;border-bottom:2px solid var(--line);font-size:12px;color:var(--muted)">
        <span>#</span><span>Équipe</span><span>Sport</span><span>V · N · D</span><span>Pts</span>
      </div>
      ${ranking.length === 0 ? `<p style="font-size:15px;color:var(--muted);padding:14px 0;margin:0">Aucune équipe inscrite pour le moment.</p>` : ''}
      ${ranking.map(r => `
        <div style="display:grid;grid-template-columns:${cols};min-width:640px;gap:12px;align-items:center;padding:16px 0;border-bottom:1px solid var(--line)">
          <span style="font:italic 900 34px/1 'Barlow Condensed',sans-serif;color:${r.col}">${r.pos}</span>
          <div style="min-width:0">
            <div style="font:italic 800 26px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.team || r.p)}</div>
            <div style="font-size:13px;color:var(--muted)">${esc(r.p)}${r.mascot ? ` · ${esc(r.mascot)}` : ''}</div>
          </div>
          <span style="font-size:15px">${esc(r.sport || SPORTS[r.si] || '')}</span>
          <span style="font-size:14px;color:var(--muted)">${esc(r.rec)}</span>
          <span style="font:italic 900 34px/1 'Barlow Condensed',sans-serif">${r.pts}</span>
        </div>
      `).join('')}
      <p style="font-size:13px;color:var(--muted);margin:12px 0 0">Victoire 3 pts · Nul 1 pt · Défaite 0 pt${anyCoef ? ' · multipliés par le coefficient du sport' : ''}</p>
    </div>

    <div style="padding:24px 48px 72px;border-top:1px solid var(--line)">
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin:16px 0 28px">
        ${SPORTS.map((label, i) => `
          <button data-action="res-sport" data-si="${i}" style="padding:10px 16px;border:1px solid ${si === i ? 'var(--accent)' : 'var(--line)'};background:${si === i ? 'var(--accent)' : 'transparent'};color:${si === i ? 'var(--on-accent)' : 'var(--muted)'};font:600 14px var(--font-body);cursor:pointer">${esc(label)}</button>
        `).join('')}
      </div>

      <div class="results-split-grid" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:48px">
        <div>
          <h2 style="font:italic 800 32px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;margin:0 0 12px">${esc(SPORTS[si] || '')} — classement</h2>
          ${sportStand.length === 0 ? `<p style="font-size:15px;color:var(--muted);padding:14px 0;border-top:1px solid var(--line);margin:0">Aucune équipe inscrite dans ce sport pour le moment.</p>` : ''}
          ${sportStand.map(r => `
            <div style="display:grid;grid-template-columns:36px minmax(0,1fr) 120px 50px;align-items:center;gap:12px;padding:14px 0;border-top:1px solid var(--line)">
              <span style="font:italic 900 26px/1 'Barlow Condensed',sans-serif;color:${r.col}">${r.pos}</span>
              <span style="min-width:0">
                <span style="display:block;font-weight:700">${esc(r.team || r.p)}</span>
                <span style="display:block;font-size:12px;color:var(--muted)">${esc(r.p)}${r.mascot ? ` · ${esc(r.mascot)}` : ''}</span>
              </span>
              <span style="font-size:13px;color:var(--muted)">${esc(r.rec)}</span>
              <span style="font:italic 800 24px/1 'Barlow Condensed',sans-serif;text-align:right">${r.pts}</span>
            </div>
          `).join('')}
          ${coef !== 1 ? `<p style="font-size:12px;color:var(--muted);margin:10px 0 0">Coefficient ${coef} sur ce sport.</p>` : ''}
        </div>
        <div>
          <h2 style="font:italic 800 32px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;margin:0 0 12px">Derniers résultats</h2>
          ${sportResults.length === 0 ? `
            <p style="font-size:15px;color:var(--muted);padding:14px 0;border-top:1px solid var(--line);margin:0">Les résultats apparaîtront dès la fin du premier match.</p>
          ` : sportResults.map(m => `
            <div style="display:grid;grid-template-columns:110px minmax(0,1fr);align-items:center;gap:12px;padding:14px 0;border-top:1px solid var(--line)">
              <span style="font-size:13px;color:var(--muted)">${esc(m.dayShort)} · ${esc(m.t)}</span>
              <div style="display:flex;align-items:center;gap:14px;font:italic 800 24px/1 'Barlow Condensed',sans-serif">
                <span style="color:${m.ca}">${teamTag(m.teamAName, m.a)}</span>
                <span style="font-variant-numeric:tabular-nums">${esc(m.score)}</span>
                <span style="color:${m.cb}">${teamTag(m.teamBName, m.b)}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}
