// Planning des matchs, par jour et par sport.
import { SPORTS, DAYS, EDITION } from '../state.js';
import { esc, teamTag } from '../utils.js';

export function renderPlanning(d) {
  const { ms, byTime, s } = d;
  const planList = ms
    .filter(m => m.d === s.day && (s.sport === 'Tous' || m.sport === s.sport))
    .sort(byTime);
  const groups = [...new Set(planList.map(m => m.t))].map(t => ({ t, items: planList.filter(m => m.t === t) }));
  const chip = (value, on) => `
    <button data-action="planning-sport" data-sport="${esc(value)}" style="padding:8px 14px;border:1px solid ${on ? 'var(--text)' : 'var(--line)'};background:${on ? 'var(--text)' : 'transparent'};color:${on ? 'var(--bg)' : 'var(--muted)'};font:600 13px var(--font-body);cursor:pointer">${esc(value)}</button>
  `;

  return `
    <div style="padding:56px 48px 0">
      <div style="font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)">${esc(EDITION.range)}</div>
      <h1 style="font:italic 900 88px/.9 'Barlow Condensed',sans-serif;text-transform:uppercase;margin:8px 0 0">Planning</h1>
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;gap:24px;padding:32px 48px 24px;flex-wrap:wrap">
      <div style="display:flex;border:1px solid var(--line)">
        ${DAYS.map((day, i) => `
          <button data-action="planning-day" data-day="${i}" style="padding:12px 22px;border:0;background:${s.day === i ? 'var(--accent)' : 'transparent'};color:${s.day === i ? 'var(--on-accent)' : 'var(--muted)'};cursor:pointer;text-align:left;font-family:var(--font-body)">
            <div style="font-weight:700;font-size:14px">${esc(day[0])}</div>
            <div style="font-size:12px;opacity:.8">${esc(day[1])}</div>
          </button>
        `).join('')}
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${['Tous', ...SPORTS].map(v => chip(v, s.sport === v)).join('')}
      </div>
    </div>

    <div style="padding:0 48px 72px;overflow-x:auto">
      ${groups.length === 0 ? `
        <div style="padding:28px 0;border-top:1px solid var(--line);font-size:15px;color:var(--muted)">
          Aucun match programmé ${s.sport === 'Tous' ? 'pour cette journée' : `en ${esc(s.sport.toLowerCase())} ce jour-là`}.
        </div>
      ` : groups.map(g => `
        <div class="plan-group" style="display:grid;grid-template-columns:120px minmax(0,1fr);border-top:1px solid var(--line)">
          <div style="padding:22px 0;font:italic 800 34px/1 'Barlow Condensed',sans-serif">${esc(g.t)}</div>
          <div>
            ${g.items.map(m => `
              <div style="display:grid;grid-template-columns:130px minmax(220px,1fr) 160px 100px;min-width:680px;align-items:center;gap:16px;padding:18px 0;border-bottom:1px solid var(--line-soft)">
                <div>
                  <div style="font-weight:700;font-size:15px">${esc(m.sport)}</div>
                  <div style="font-size:12px;color:var(--muted)">${esc(m.phase || 'Qualification')}</div>
                </div>
                <div style="display:flex;align-items:center;gap:16px">
                  <span style="flex:1;min-width:0;text-align:right;font:italic 800 24px/1.1 'Barlow Condensed',sans-serif;color:${m.ca}">${teamTag(m.teamAName, m.a)}</span>
                  <span class="${m.status === 'live' ? 'live-score' : ''}" style="font:italic 800 28px/1 'Barlow Condensed',sans-serif;font-variant-numeric:tabular-nums;color:${m.scCol};min-width:80px;text-align:center">${esc(m.score)}</span>
                  <span style="flex:1;min-width:0;font:italic 800 24px/1.1 'Barlow Condensed',sans-serif;color:${m.cb}">${teamTag(m.teamBName, m.b)}</span>
                </div>
                <span style="font-size:13px;color:var(--muted)">${esc(m.venue || '')}</span>
                <span style="justify-self:start;padding:4px 10px;font-size:12px;font-weight:700;background:${m.tagBg};color:${m.tagFg};border:1px solid ${m.tagBd}">${esc(m.tag)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}
