import { esc, albumPeriod, formatAlbumDates, groupAlbumsByPeriod } from './utils.js';
import { state, SPORTS, SHORT, PROMOS, MASCOT, VENUE, DAYS, SIZE, EDITION } from './state.js';

const SPORT_META = [
  { icon: '⚽', format: '7 vs 7', vibe: 'Intensité maximale sur grand synthétique' },
  { icon: '🏀', format: '5 vs 5', vibe: 'Showtime, contre-attaques et tirs primés' },
  { icon: '🏐', format: '6 vs 6', vibe: 'Smashs, blocs et cohésion millimétrée' },
  { icon: '🤾', format: '7 vs 7', vibe: 'Impact, vitesse et duels au 6 mètres' },
  { icon: '🏸', format: 'Duo 2 vs 2', vibe: 'Réflexes éclairs et volants décisifs' },
  { icon: '🥏', format: '7 vs 7', vibe: 'Fair-play, cardio et longues passes en zone' }
];

const PROMO_SLOGANS = {
  A1: 'Nouveaux venus, déjà prêts à tout casser',
  A2: 'Survoltés du premier au dernier coup de sifflet',
  A3: 'La résistance s’organise sur tous les terrains',
  A4: 'Aucun crash possible, victoire programmée',
  A5: 'Les anciens ont tous les privilèges sur le terrain'
};

const BIG = "font:italic 800 40px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;margin:0";

function renderHeroMedia(hero) {
  if (hero?.type === 'video') {
    // Vidéo d'ambiance : lecture automatique en boucle et en sourdine (sauf si l'appareil demande moins d'animations)
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    return `
      <video data-hero src="${esc(hero.url)}" ${reduce ? 'controls' : 'autoplay loop'} muted playsinline preload="auto" aria-label="${esc(hero.caption || 'Vidéo Interpromos')}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#000"></video>
      ${reduce ? '' : `
        <button data-action="hero-sound" class="hero-sound" aria-pressed="false" aria-label="Activer le son">
          <span class="hero-sound-icon">🔇</span><span class="hero-sound-label">Son</span>
        </button>
      `}
    `;
  }
  if (hero) {
    return `<img src="${esc(hero.url)}" alt="${esc(hero.caption)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">`;
  }
  return '';
}

export function renderHome(d) {
  const { avant, cd, liveList, ms, byTime, ranking } = d;
  const nextMatches = ms.filter(m => m.status === 'up').sort(byTime).slice(0, 5);
  const hero = state.slots?.hero;
  const venues = [...new Set(VENUE.filter(Boolean))];

  return `
    <div class="hero-grid" style="display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);border-bottom:1px solid var(--line)">
      <div style="padding:72px 48px 64px;display:flex;flex-direction:column;gap:28px">
        <div style="display:flex;align-items:center;gap:10px;font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)">
          <span style="width:24px;height:2px;background:var(--accent)"></span>${esc(EDITION.range)} · ${esc(EDITION.venue)}
        </div>
        <h1 style="font:italic 900 120px/.86 'Barlow Condensed',sans-serif;text-transform:uppercase;margin:0">
          Une promo.<br><span style="color:var(--accent)">Un titre.</span>
        </h1>
        <p style="font-size:18px;line-height:1.6;color:var(--text-2);max-width:480px;margin:0">
          ${SPORTS.length} sports, ${PROMOS.length} promos, ${DAYS.length} jours de compétition organisés par le BDS et le club APPEN.
        </p>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <button data-action="nav" data-page="inscription" class="hover-accent" style="background:var(--accent);color:var(--on-accent);border:0;padding:15px 22px;font:700 15px var(--font-body);cursor:pointer">
            Inscrire mon équipe →
          </button>
          <button data-action="nav" data-page="planning" class="hover-border-white" style="background:transparent;border:1px solid var(--line-strong);color:var(--text);padding:14px 22px;font:600 15px var(--font-body);cursor:pointer">
            Voir le planning
          </button>
        </div>
      </div>
      <div style="background:repeating-linear-gradient(135deg,var(--surface-3) 0 10px,var(--surface-4) 10px 20px);position:relative;min-height:420px;overflow:hidden">
        ${renderHeroMedia(hero)}
      </div>
    </div>

    ${avant ? `
      <div class="countdown-grid" style="display:grid;grid-template-columns:repeat(${DAYS.length + 1},minmax(0,1fr));border-bottom:1px solid var(--line)">
        <div style="padding:28px 48px;border-right:1px solid var(--line)">
          <div style="font-size:12px;color:var(--muted);margin-bottom:6px">Coup d'envoi dans</div>
          <div id="countdown" class="countdown-value" role="timer" aria-live="off" style="font:italic 800 44px/1 'Barlow Condensed',sans-serif;font-variant-numeric:tabular-nums;white-space:nowrap">${cd.d}J ${cd.h}H ${cd.m}M ${cd.s}S</div>
        </div>
        ${DAYS.map((day, i) => {
          const last = i === DAYS.length - 1;
          return `
            <div style="padding:28px 32px;${last ? 'background:var(--accent)' : 'border-right:1px solid var(--line)'}">
              <div style="font-size:12px;${last ? '' : 'color:var(--muted);'}margin-bottom:6px">${esc(day[0])}</div>
              <div style="font:italic 800 30px/1 'Barlow Condensed',sans-serif;text-transform:uppercase">${esc(day[1])}</div>
            </div>
          `;
        }).join('')}
      </div>
    ` : ''}

    ${liveList.length > 0 ? `
      <div style="padding:40px 48px;border-bottom:1px solid var(--line)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
          <h2 style="display:flex;align-items:center;gap:12px;${BIG}"><span class="pulse-dot-red"></span>En direct</h2>
          <button data-action="nav" data-page="planning" style="background:none;border:0;color:var(--accent);font:600 14px var(--font-body);cursor:pointer">Tout le programme →</button>
        </div>
        <div class="live-cards-grid" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">
          ${liveList.map(g => `
            <button data-action="go-planning-day" data-day="${g.d}" class="hover-surface-2 live-card" style="background:var(--surface-2);border:0;color:var(--text);text-align:left;padding:20px 22px;cursor:pointer;font-family:var(--font-body)">
              <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin-bottom:12px">
                <span>${esc(g.sport)} · ${esc(g.venue || '')}</span><span style="color:var(--accent);font-weight:700">LIVE</span>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;font:italic 800 34px/1 'Barlow Condensed',sans-serif">
                <span>${esc(g.a)}</span><span style="font-variant-numeric:tabular-nums">${esc(g.score)}</span><span>${esc(g.b)}</span>
              </div>
            </button>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <div class="home-split-grid" style="display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr)">
      <div style="padding:48px;border-right:1px solid var(--line)">
        <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:20px">
          <h2 style="${BIG}">Prochains matchs</h2>
          <button data-action="nav" data-page="planning" style="background:none;border:0;color:var(--accent);font:600 14px var(--font-body);cursor:pointer">Planning complet →</button>
        </div>
        ${nextMatches.length === 0 ? `
          <div style="padding:16px 0;border-top:1px solid var(--line);font-size:14px;color:var(--muted)">Aucun match programmé pour le moment.</div>
        ` : nextMatches.map(m => `
          <div style="display:grid;grid-template-columns:72px 120px minmax(0,1fr) 180px;align-items:center;gap:16px;padding:16px 0;border-top:1px solid var(--line)">
            <span style="font:italic 800 24px/1 'Barlow Condensed',sans-serif;font-variant-numeric:tabular-nums">${esc(m.t)}</span>
            <span style="font-size:13px;color:var(--muted)">${esc(m.sport)}</span>
            <span style="font-size:16px;font-weight:700">${esc(m.a)} <span style="color:var(--dim);font-weight:400;margin:0 6px">vs</span> ${esc(m.b)}</span>
            <span style="font-size:13px;color:var(--muted)">${esc(m.dayShort)} · ${esc(m.venue || '')}</span>
          </div>
        `).join('')}
      </div>

      <div style="padding:48px 40px">
        ${avant ? `
          <h2 style="${BIG};margin:0 0 20px">Infos pratiques</h2>
          <div style="padding:16px 0;border-top:1px solid var(--line)">
            <div style="font-size:12px;color:var(--muted)">Lieux</div>
            <div style="font-size:16px;margin-top:4px">${esc(venues.join(' · ') || 'ISEN Nantes')}</div>
          </div>
          <div style="padding:16px 0;border-top:1px solid var(--line)">
            <div style="font-size:12px;color:var(--muted)">Inscriptions</div>
            <div style="font-size:16px;margin-top:4px">En ligne, validées par le BDS · <button data-action="nav" data-page="inscription" style="background:none;border:0;padding:0;color:var(--accent);font:600 16px var(--font-body);cursor:pointer">s'inscrire →</button></div>
          </div>
          ${EDITION.contact ? `
            <div style="padding:16px 0;border-top:1px solid var(--line)">
              <div style="font-size:12px;color:var(--muted)">Contact</div>
              <a href="mailto:${esc(EDITION.contact)}" style="display:block;font-size:16px;margin-top:4px;color:var(--text)">${esc(EDITION.contact)}</a>
            </div>
          ` : ''}
        ` : `
          <h2 style="${BIG};margin:0 0 16px">Classement</h2>
          ${ranking.map(r => `
            <div style="display:grid;grid-template-columns:36px minmax(0,1fr) auto;align-items:center;gap:12px;padding:14px 0;border-top:1px solid var(--line)">
              <span style="font:italic 900 30px/1 'Barlow Condensed',sans-serif;color:${r.col}">${r.pos}</span>
              <div>
                <div style="font-weight:700;font-size:15px">${esc(r.p)} · ${esc(r.mascot)}</div>
                <div style="height:4px;background:var(--line);margin-top:7px"><div class="rank-bar" style="height:4px;width:${r.w};background:${r.col}"></div></div>
              </div>
              <span style="font:italic 800 24px/1 'Barlow Condensed',sans-serif">${r.pts}</span>
            </div>
          `).join('')}
          <button data-action="nav" data-page="resultats" style="margin-top:16px;padding:0;background:none;border:0;color:var(--accent);font:600 14px var(--font-body);cursor:pointer">Tous les résultats →</button>
        `}
      </div>
    </div>

    <div class="sports-strip-grid" style="display:grid;grid-template-columns:repeat(${SPORTS.length},minmax(0,1fr));border-top:1px solid var(--line)">
      ${SPORTS.map((name, si) => {
        const count = state.teams.filter(t => t.si === si).length;
        return `
          <button data-action="go-sport-teams" data-sport="${esc(name)}" class="hover-surface" style="padding:28px 24px;border:0;border-right:1px solid var(--line);background:transparent;color:var(--text);text-align:left;cursor:pointer;display:flex;flex-direction:column;gap:6px;font-family:var(--font-body)">
            <span style="font:italic 800 26px/1 'Barlow Condensed',sans-serif;text-transform:uppercase">${esc(name)}</span>
            <span style="font-size:13px;color:var(--muted)">${count} équipe${count > 1 ? 's' : ''}${VENUE[si] ? ` · ${esc(VENUE[si])}` : ''}</span>
          </button>
        `;
      }).join('')}
    </div>
  `;
}

export function renderPublicFooter(s) {
  return `
    <footer style="display:flex;align-items:center;gap:20px;padding:22px 48px;border-top:1px solid var(--line);font-size:13px;color:var(--muted);flex-wrap:wrap">
      <span style="margin-right:auto">BDS ${esc(EDITION.venue)} × club APPEN${EDITION.contact ? ` · <a href="mailto:${esc(EDITION.contact)}" style="color:inherit">${esc(EDITION.contact)}</a>` : ''}</span>
      <span style="display:flex;align-items:center;gap:10px">
        <span style="height:28px;padding:0 4px;background:var(--logo-bg);display:grid;place-items:center"><img src="/assets/logo_bds.svg" alt="BDS ISEN Nantes" style="height:22px"></span>
        <span style="height:28px;padding:0 4px;background:var(--logo-bg);display:grid;place-items:center"><img src="/assets/logo_appen.png" alt="Club APPEN" style="height:22px"></span>
      </span>
      <button data-action="nav" data-page="admin" class="hover-text-light" style="background:none;border:1px solid var(--line);color:var(--muted);padding:7px 12px;font:600 12px var(--font-body);cursor:pointer">
        ${s?.isAdminAuthenticated ? 'Espace BDS (connecté)' : 'Espace BDS'}
      </button>
    </footer>
  `;
}

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
                  <span style="font:italic 800 28px/1 'Barlow Condensed',sans-serif;color:${m.ca};min-width:44px">${esc(m.a)}</span>
                  <span class="${m.status === 'live' ? 'live-score' : ''}" style="font:italic 800 28px/1 'Barlow Condensed',sans-serif;font-variant-numeric:tabular-nums;color:${m.scCol};min-width:80px;text-align:center">${esc(m.score)}</span>
                  <span style="font:italic 800 28px/1 'Barlow Condensed',sans-serif;color:${m.cb}">${esc(m.b)}</span>
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

export function renderResults(d) {
  const { ranking, sportStandAll, doneList, byTime, s } = d;
  const si = Math.min(Math.max(0, s.resSport || 0), SPORTS.length - 1);
  const sportStand = sportStandAll[si] || [];
  const sportResults = doneList.filter(m => m.si === si).sort((x, y) => -byTime(x, y));
  const coef = s.standings?.bySport?.find(x => x.si === si)?.coef || 1;
  const anyCoef = (s.standings?.bySport || []).some(x => x.coef && x.coef !== 1);
  const cols = `48px minmax(170px,1fr) repeat(${SPORTS.length},64px) 96px 64px`;

  return `
    <div style="padding:56px 48px 0">
      <div style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)">
        <span class="pulse-dot-red" style="width:8px;height:8px"></span>Mis à jour en direct
      </div>
      <h1 style="font:italic 900 88px/.9 'Barlow Condensed',sans-serif;text-transform:uppercase;margin:8px 0 0">Résultats &amp; classements</h1>
    </div>

    <div style="padding:40px 48px;overflow-x:auto">
      <h2 style="font:italic 800 36px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;margin:0 0 16px">Classement général</h2>
      <div style="display:grid;grid-template-columns:${cols};min-width:880px;gap:12px;padding:10px 0;border-bottom:2px solid var(--line);font-size:12px;color:var(--muted)">
        <span>#</span><span>Promo</span>
        ${SHORT.map(x => `<span>${esc(x)}</span>`).join('')}
        <span>V · N · D</span><span>Pts</span>
      </div>
      ${ranking.map(r => `
        <div style="display:grid;grid-template-columns:${cols};min-width:880px;gap:12px;align-items:center;padding:16px 0;border-bottom:1px solid var(--line)">
          <span style="font:italic 900 34px/1 'Barlow Condensed',sans-serif;color:${r.col}">${r.pos}</span>
          <div>
            <div style="font:italic 800 26px/1 'Barlow Condensed',sans-serif;text-transform:uppercase">${esc(r.p)}</div>
            <div style="font-size:13px;color:var(--muted)">${esc(r.mascot)}</div>
          </div>
          ${SPORTS.map((_, i) => {
            const x = r.per[i] || { v: 0, col: 'var(--dim)' };
            return `<span style="font-size:15px;font-variant-numeric:tabular-nums;color:${x.col}">${x.v}</span>`;
          }).join('')}
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
          ${sportStand.map(r => `
            <div style="display:grid;grid-template-columns:36px minmax(0,1fr) 120px 50px;align-items:center;gap:12px;padding:14px 0;border-top:1px solid var(--line)">
              <span style="font:italic 900 26px/1 'Barlow Condensed',sans-serif;color:${r.col}">${r.pos}</span>
              <span style="font-weight:700">${esc(r.p)} · ${esc(r.mascot)}</span>
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
                <span style="color:${m.ca}">${esc(m.a)}</span>
                <span style="font-variant-numeric:tabular-nums">${esc(m.score)}</span>
                <span style="color:${m.cb}">${esc(m.b)}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

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

// Engagement
export function charterText(f) {
  const players = f.players.map(x => x.trim()).filter(Boolean).length;
  const team = f.team.trim() ? `l'équipe <strong>« ${esc(f.team.trim())} »</strong>` : 'mon équipe';
  const who = players === 0 ? 'tous les joueurs de ' + team
    : players === 1 ? `le joueur inscrit dans ${team}`
    : `les <strong>${players} joueurs</strong> de ${team}`;
  const captain = f.captain.trim() ? `, capitaine <strong>${esc(f.captain.trim())}</strong>` : '';
  return `<strong>Charte Fair-Play &amp; Règlement BDS :</strong> Je certifie que ${who} (<strong>${esc(SPORTS[f.sport] || '')}</strong>${captain}) ${players === 1 ? 'appartient' : 'appartiennent'} bien à la promo <strong>${esc(f.promo)}</strong> et ${players === 1 ? "s'engage" : "s'engagent"} à respecter les horaires, les arbitres et l'esprit sportif des Interpromos ${esc(EDITION.year)}.`;
}

export function renderInscription(d) {
  const { s } = d;
  const f = s.form;
  const minP = SIZE[f.sport] || 5;
  const maxP = minP + 3;
  const filledPlayers = f.players.map(x => x.trim()).filter(Boolean);
  const filled = filledPlayers.length;
  const R = 'var(--accent)';
  const sportName = SPORTS[f.sport] || 'Football';
  const sportMeta = SPORT_META[f.sport] || { icon: '🏆', format: `${minP} vs ${minP}`, vibe: 'Compétition officielle Interpromos' };
  const venueName = VENUE[f.sport] || 'Campus ISEN';
  const mascotName = MASCOT[f.promo] || 'ISEN';
  const promoSlogan = PROMO_SLOGANS[f.promo] || 'Prêts pour le titre';

  // Calcul du niveau de complétion du dossier
  let readiness = 20; // Sport + Promo sélectionnés
  if (f.team.trim()) readiness += 20;
  if (f.captain.trim() && /^\S+@\S+\.\S+$/.test(f.email.trim())) readiness += 20;
  if (filled >= minP) readiness += 25;
  else readiness += Math.round((filled / minP) * 20);
  if (f.rules) readiness += 15;
  readiness = Math.min(100, readiness);

  if (s.sent) {
    const sentIdx = Math.max(0, SPORTS.indexOf(s.sent.sport));
    const sentMinP = SIZE[sentIdx] || 5;
    const sportMeta = SPORT_META[sentIdx] || { icon: '🏆', format: `${sentMinP} vs ${sentMinP}` };
    const sentPlayers = Array.isArray(s.sent.playersList) && s.sent.playersList.length > 0
      ? s.sent.playersList
      : filledPlayers;

    return `
      <div style="padding:56px 48px 80px;max-width:860px;margin:0 auto">
        <div class="anim-pop" style="background:var(--surface);border:2px solid var(--accent);padding:44px;position:relative;overflow:hidden">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:1px solid var(--line);padding-bottom:24px;margin-bottom:28px;flex-wrap:wrap">
            <div style="display:flex;align-items:center;gap:14px">
              <div style="width:56px;height:56px;background:var(--accent);display:grid;place-items:center;font-size:28px">
                ${sportMeta.icon}
              </div>
              <div>
                <div style="font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--success)">
                  ● Dossier d'engagement enregistré · #IP${esc(EDITION.shortYear)}-${esc(String(s.sent.id || 'OK').slice(0, 8).toUpperCase())}
                </div>
                <h1 style="font:italic 900 48px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;margin:4px 0 0">
                  ${esc(s.sent.team)}
                </h1>
              </div>
            </div>
            <div style="text-align:right">
              <span style="display:inline-block;padding:6px 12px;background:var(--accent);color:var(--on-accent);font:800 14px 'Barlow Condensed',sans-serif;letter-spacing:.08em;text-transform:uppercase">
                Promo ${esc(s.sent.promo)} · ${esc(MASCOT[s.sent.promo] || '')}
              </span>
              <div style="font-size:12px;color:var(--muted);margin-top:6px">Statut : ${esc(s.sent.status || 'En attente de validation BDS')}</div>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-bottom:28px">
            <div style="background:var(--bg);border:1px solid var(--line);padding:16px">
              <div style="font-size:11px;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Discipline</div>
              <div style="font-size:16px;font-weight:700;color:var(--text)">${esc(s.sent.sport)} (${sportMeta.format})</div>
            </div>
            <div style="background:var(--bg);border:1px solid var(--line);padding:16px">
              <div style="font-size:11px;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Capitaine</div>
              <div style="font-size:16px;font-weight:700;color:var(--text)">${esc(s.sent.captain)}</div>
            </div>
            <div style="background:var(--bg);border:1px solid var(--line);padding:16px">
              <div style="font-size:11px;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Effectif engagé</div>
              <div style="font-size:16px;font-weight:700;color:var(--success)">${sentPlayers.length} joueur(s)</div>
            </div>
          </div>

          <div style="margin-bottom:32px">
            <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:10px">
              Feuille de match officielle
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:8px">
              ${sentPlayers.map((pl, idx) => `
                <span style="padding:8px 12px;background:var(--bg);border:1px solid ${idx === 0 ? 'var(--accent)' : 'var(--line)'};font-size:13px;color:var(--text);display:inline-flex;align-items:center;gap:8px">
                  <strong style="color:var(--accent);font-family:var(--font-mono)">#${idx + 1}</strong>
                  ${esc(pl)}
                  ${idx === 0 ? `<span style="font-size:10px;background:var(--accent);color:var(--on-accent);padding:1px 5px;font-weight:700">CAP</span>` : ''}
                </span>
              `).join('')}
            </div>
          </div>

          <div style="background:var(--bg);border-left:3px solid var(--accent);padding:14px 18px;margin-bottom:28px;font-size:14px;line-height:1.6;color:var(--text-2)">
            <strong style="color:var(--text)">Et maintenant ?</strong> Le BDS vérifie ton dossier. Une fois validée, ton équipe apparaît dans la page « Équipes » et peut être programmée dans le planning. Garde ce numéro de dossier : <strong style="color:var(--text);font-family:var(--font-mono)">#IP${esc(EDITION.shortYear)}-${esc(String(s.sent.id || '').slice(0, 8).toUpperCase())}</strong>.
          </div>

          <div style="display:flex;gap:12px;flex-wrap:wrap">
            <button data-action="reset-form" class="hover-accent" style="background:var(--accent);color:var(--on-accent);border:0;padding:14px 22px;font:700 14px var(--font-body);cursor:pointer">
              + Inscrire une autre équipe
            </button>
            <button data-action="nav" data-page="equipes" style="background:transparent;border:1px solid var(--line-strong);color:var(--text);padding:14px 22px;font:600 14px var(--font-body);cursor:pointer">
              Voir les équipes engagées
            </button>
            <button data-action="nav" data-page="planning" style="background:transparent;border:1px solid var(--line-strong);color:var(--muted);padding:14px 22px;font:600 14px var(--font-body);cursor:pointer">
              Consulter le planning
            </button>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div style="padding:48px 48px 72px;max-width:1280px;margin:0 auto">
      <!-- En-tête & Barre de progression -->
      <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:32px;flex-wrap:wrap;border-bottom:1px solid var(--line);padding-bottom:24px">
        <div>
          <div style="display:flex;align-items:center;gap:10px;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);margin-bottom:8px">
            <span style="width:24px;height:2px;background:var(--accent)"></span>Engagement Officiel des Équipes Étudiantes
          </div>
          <h1 style="font:italic 900 68px/.9 'Barlow Condensed',sans-serif;text-transform:uppercase;margin:0">
            Compose ton <span style="color:var(--accent)">escouade.</span>
          </h1>
          <p style="font-size:15px;color:var(--muted);margin:10px 0 0;max-width:600px">
            Choisis ton sport, défends les couleurs de ta promo et aligne ton effectif sur la feuille de match officielle des Interpromos ${esc(EDITION.year)}.
          </p>
        </div>

        <div style="min-width:260px;background:var(--surface);border:1px solid var(--line);padding:16px 20px">
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;margin-bottom:8px">
            <span style="color:var(--muted);text-transform:uppercase;letter-spacing:.08em;font-weight:600">Prêt pour le coup d'envoi</span>
            <strong id="form-progress-label" style="color:${readiness === 100 ? 'var(--success)' : 'var(--accent)'};font-family:var(--font-mono)">${readiness}%</strong>
          </div>
          <div style="height:6px;background:var(--bg);overflow:hidden">
            <div id="form-progress-bar" style="height:100%;width:${readiness}%;background:${readiness === 100 ? 'var(--success)' : 'var(--accent)'};transition:width .25s ease"></div>
          </div>
        </div>
      </div>

      <div class="inscription-layout" style="display:grid;grid-template-columns:minmax(0,1.35fr) minmax(320px,0.85fr);gap:36px;align-items:start">
        <!-- Colonne gauche : Formulaire interactif en 4 étapes -->
        <div style="display:flex;flex-direction:column;gap:28px">

          <!-- ÉTAPE 1 : CHOIX DE LA PROMO & DU SPORT -->
          <section style="background:var(--surface);border:1px solid var(--line);padding:28px">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
              <span style="width:26px;height:26px;background:var(--accent);color:var(--on-accent);font:800 14px 'Barlow Condensed',sans-serif;display:grid;place-items:center">01</span>
              <h2 style="font:italic 800 26px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;margin:0">Bannière de Promo &amp; Discipline</h2>
            </div>

            <!-- Cartes Promo A1 -> A5 -->
            <div style="margin-bottom:22px">
              <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:10px">
                Quelle promotion représentes-tu ?
              </div>
              <div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px">
                ${PROMOS.map(p => {
                  const active = f.promo === p;
                  return `
                    <button
                      type="button"
                      data-action="form-promo"
                      data-promo="${esc(p)}"
                      style="padding:14px 10px;background:${active ? 'var(--accent)' : 'var(--bg)'};border:1px solid ${active ? 'var(--accent)' : 'var(--line)'};color:${active ? 'var(--on-accent)' : 'var(--text)'};cursor:pointer;text-align:center;display:flex;flex-direction:column;gap:4px;align-items:center"
                    >
                      <span style="font:italic 900 28px/1 'Barlow Condensed',sans-serif">${esc(p)}</span>
                      <span style="font-size:11px;color:${active ? 'var(--on-accent)' : 'var(--muted)'};font-weight:600">${esc(MASCOT[p] || '')}</span>
                    </button>
                  `;
                }).join('')}
              </div>
              <div style="margin-top:8px;font-size:12px;color:var(--muted);font-style:italic">
                « ${esc(promoSlogan)} »
              </div>
            </div>

            <!-- Cartes des 6 Sports -->
            <div>
              <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:10px">
                Choisis ton terrain de jeu
              </div>
              <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">
                ${SPORTS.map((sp, i) => {
                  const active = f.sport === i;
                  const meta = SPORT_META[i] || { icon: '🏆', format: `${SIZE[i] || 5} j.`, vibe: '' };
                  const sMin = SIZE[i] || 5;
                  return `
                    <button
                      type="button"
                      data-action="form-sport"
                      data-si="${i}"
                      style="padding:14px 16px;background:${active ? 'var(--error-bg)' : 'var(--bg)'};border:1px solid ${active ? 'var(--accent)' : 'var(--line)'};color:var(--text);cursor:pointer;text-align:left;display:flex;flex-direction:column;gap:6px"
                    >
                      <div style="display:flex;justify-content:space-between;align-items:center;width:100%">
                        <span style="font-size:20px">${meta.icon}</span>
                        <span style="font:700 11px var(--font-mono);padding:2px 6px;background:${active ? 'var(--accent)' : 'var(--surface-2)'};color:${active ? 'var(--on-accent)' : 'var(--muted)'}">${esc(meta.format)}</span>
                      </div>
                      <div style="font:italic 800 20px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;color:${active ? 'var(--accent)' : 'var(--text)'}">
                        ${esc(sp)}
                      </div>
                      <div style="font-size:11px;color:var(--muted)">
                        ${sMin} titulaires min. · ${esc(VENUE[i] || 'Gymnase')}
                      </div>
                    </button>
                  `;
                }).join('')}
              </div>
            </div>
          </section>

          <!-- ÉTAPE 2 : IDENTITÉ DE L'ÉQUIPE & CAPITAINE -->
          <section style="background:var(--surface);border:1px solid var(--line);padding:28px">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px;flex-wrap:wrap">
              <div style="display:flex;align-items:center;gap:10px">
                <span style="width:26px;height:26px;background:var(--accent);color:var(--on-accent);font:800 14px 'Barlow Condensed',sans-serif;display:grid;place-items:center">02</span>
                <h2 style="font:italic 800 26px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;margin:0">Identité d'Équipe &amp; Capitaine</h2>
              </div>
              <button
                type="button"
                data-action="generate-team-name"
                style="background:var(--surface-2);border:1px solid var(--line-strong);color:var(--text);padding:8px 14px;font:600 12px var(--font-body);cursor:pointer"
              >
                🎲 Générer un nom d'équipe fun
              </button>
            </div>

            <div style="display:grid;gap:18px">
              <label style="display:flex;flex-direction:column;gap:8px">
                <span style="font-size:13px;font-weight:600">Nom officiel de l'équipe</span>
                <input
                  data-field="form-team"
                  value="${esc(f.team)}"
                  placeholder="Ex: FC ${esc(mascotName)}, Les Survoltés ${esc(f.promo)}..."
                  style="background:var(--bg);border:1px solid ${s.err.team ? R : 'var(--line)'};color:var(--text);padding:13px 16px;font:15px var(--font-body);outline:none"
                >
                ${s.err.team ? `<span class="field-error" style="font-size:13px;color:var(--error)">${esc(s.err.team)}</span>` : ''}
              </label>

              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px">
                <label style="display:flex;flex-direction:column;gap:8px">
                  <span style="font-size:13px;font-weight:600">Prénom &amp; Nom du Capitaine</span>
                  <input
                    data-field="form-captain"
                    value="${esc(f.captain)}"
                    placeholder="Prénom Nom"
                    style="background:var(--bg);border:1px solid ${s.err.captain ? R : 'var(--line)'};color:var(--text);padding:13px 16px;font:15px var(--font-body);outline:none"
                  >
                  ${s.err.captain ? `<span class="field-error" style="font-size:13px;color:var(--error)">${esc(s.err.captain)}</span>` : ''}
                </label>

                <label style="display:flex;flex-direction:column;gap:8px">
                  <span style="font-size:13px;font-weight:600">E-mail ISEN du Capitaine</span>
                  <input
                    data-field="form-email"
                    type="email"
                    value="${esc(f.email)}"
                    placeholder="prenom.nom@isen-ouest.yncrea.fr"
                    style="background:var(--bg);border:1px solid ${s.err.email ? R : 'var(--line)'};color:var(--text);padding:13px 16px;font:15px var(--font-body);outline:none"
                  >
                  ${s.err.email ? `<span class="field-error" style="font-size:13px;color:var(--error)">${esc(s.err.email)}</span>` : ''}
                </label>
              </div>
            </div>
          </section>

          <!-- ÉTAPE 3 : LE VESTIAIRE (COMPOSITION DES JOUEURS) -->
          <section style="background:var(--surface);border:1px solid var(--line);padding:28px">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px;flex-wrap:wrap">
              <div style="display:flex;align-items:center;gap:10px">
                <span style="width:26px;height:26px;background:var(--accent);color:var(--on-accent);font:800 14px 'Barlow Condensed',sans-serif;display:grid;place-items:center">03</span>
                <h2 style="font:italic 800 26px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;margin:0">Le Vestiaire · Feuille de Match</h2>
              </div>
              <span id="form-players-hint" style="font:700 12px var(--font-mono);padding:4px 10px;background:${filled >= minP ? 'var(--success-bg)' : 'var(--surface-2)'};color:${filled >= minP ? 'var(--success)' : 'var(--accent)'};border:1px solid ${filled >= minP ? 'var(--success)' : 'var(--line)'}">
                ${filled} / ${minP} titulaires requis (max ${maxP})
              </span>
            </div>

            <p style="font-size:13px;color:var(--muted);margin:0 0 18px">
              Renseigne le prénom et le nom de chaque joueur. Tu peux ajouter jusqu'à 3 remplaçants pour faire tourner l'effectif.
            </p>

            ${f.captain.trim() && f.players[0]?.trim() !== f.captain.trim() ? `
              <button
                type="button"
                data-action="copy-captain-to-player1"
                style="margin-bottom:14px;background:var(--surface-2);border:1px solid var(--line-strong);color:var(--text-2);padding:7px 12px;font:600 12px var(--font-body);cursor:pointer"
              >
                ★ Inscrire automatiquement le capitaine (${esc(f.captain.trim())}) en Joueur #1
              </button>
            ` : ''}

            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px">
              ${f.players.map((p, i) => {
                const isSub = i >= minP;
                return `
                  <div style="display:flex;align-items:center;background:var(--bg);border:1px solid ${s.err.players && !p.trim() && !isSub ? R : 'var(--line)'}">
                    <span style="min-width:44px;padding:10px 8px;text-align:center;font:700 12px var(--font-mono);color:${isSub ? 'var(--muted)' : 'var(--accent)'};border-right:1px solid var(--line);background:var(--surface)">
                      #${i + 1}
                    </span>
                    <input
                      data-player-index="${i}"
                      value="${esc(p)}"
                      placeholder="${i === 0 ? 'Joueur 1 (Capitaine)' : isSub ? `Remplaçant ${i - minP + 1} (optionnel)` : `Titulaire ${i + 1}`}"
                      style="flex:1;min-width:0;background:transparent;border:0;color:var(--text);padding:11px 12px;font:14px var(--font-body);outline:none"
                    >
                    ${isSub ? `
                      <button
                        type="button"
                        data-action="remove-player-slot"
                        data-index="${i}"
                        title="Retirer ce remplaçant"
                        style="background:none;border:0;color:var(--muted);padding:0 10px;font-size:16px;cursor:pointer"
                      >×</button>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>

            ${s.err.players ? `<div class="field-error" style="margin-top:10px;font-size:13px;color:var(--error)">${esc(s.err.players)}</div>` : ''}

            ${f.players.length < maxP ? `
              <div style="margin-top:14px">
                <button
                  type="button"
                  data-action="add-player-slot"
                  style="background:transparent;border:1px dashed var(--line-strong);color:var(--text);padding:9px 16px;font:600 13px var(--font-body);cursor:pointer"
                >
                  + Ajouter un remplaçant (${f.players.length - minP} / 3)
                </button>
              </div>
            ` : ''}
          </section>

          <!-- ÉTAPE 4 : ENGAGEMENT FAIR-PLAY & VALIDATION -->
          <section style="background:var(--surface);border:1px solid var(--line);padding:28px;display:flex;flex-direction:column;gap:18px">
            <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer">
              <input data-field="form-rules" type="checkbox" ${f.rules ? 'checked' : ''} style="width:18px;height:18px;margin-top:2px;accent-color:var(--accent)">
              <span id="form-charter-text" style="font-size:14px;color:var(--text-2);line-height:1.5">${charterText(f)}</span>
            </label>
            ${s.err.rules ? `<span class="field-error" style="font-size:13px;color:var(--error)">${esc(s.err.rules)}</span>` : ''}

            ${s.err.general ? `<div class="field-error" role="alert" style="padding:12px 14px;border:1px solid var(--accent);background:var(--error-bg);color:var(--error-text);font-size:14px">${esc(s.err.general)}</div>` : ''}

            <button
              data-action="submit-registration"
              class="hover-accent ${s.formLoading ? 'is-loading' : ''}"
              ${s.formLoading ? 'disabled aria-busy="true"' : ''}
              style="background:${s.formLoading ? 'var(--line-strong)' : 'var(--accent)'};color:var(--on-accent);border:0;padding:17px 24px;font:italic 900 22px/1 'Barlow Condensed',sans-serif;letter-spacing:.06em;text-transform:uppercase;cursor:${s.formLoading ? 'wait' : 'pointer'};text-align:center"
            >
              ${s.formLoading ? 'Envoi de la feuille de match…' : `Valider la feuille de match · ${esc(f.promo)} ${esc(sportName)} →`}
            </button>
          </section>
        </div>

        <!-- Colonne droite : Aperçu Live du Pass Officiel d'Équipe -->
        <aside style="position:sticky;top:24px;background:var(--surface);border:1px solid var(--line);padding:28px;display:flex;flex-direction:column;gap:20px">
          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--line);padding-bottom:16px">
            <div>
              <div style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--accent)">Pass Officiel · Aperçu Live</div>
              <div style="font:italic 900 28px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;margin-top:4px">
                Interpromos ${esc(EDITION.shortYear)}
              </div>
            </div>
            <div style="width:48px;height:48px;background:var(--bg);border:1px solid var(--line);display:grid;place-items:center;font-size:24px">
              ${sportMeta.icon}
            </div>
          </div>

          <div style="background:var(--bg);border-left:4px solid var(--accent);padding:16px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <span style="padding:2px 8px;background:var(--accent);color:var(--on-accent);font-size:12px;font-weight:700">${esc(f.promo)}</span>
              <span style="font-size:12px;color:var(--muted);font-weight:600">${esc(mascotName)} · ${esc(sportName)}</span>
            </div>
            <div id="preview-team-name" style="font:italic 900 30px/1.05 'Barlow Condensed',sans-serif;text-transform:uppercase;color:var(--text);word-break:break-word">
              ${esc(f.team.trim() || `${f.promo} ${sportName}`)}
            </div>
            <div style="font-size:12px;color:var(--muted);margin-top:6px">
              📍 ${esc(venueName)} · Format ${esc(sportMeta.format)}
            </div>
          </div>

          <div style="display:flex;justify-content:space-between;font-size:13px;border-bottom:1px solid var(--line);padding-bottom:12px">
            <span style="color:var(--muted)">Capitaine</span>
            <strong id="preview-captain-name" style="color:var(--text)">${esc(f.captain.trim() || 'À désigner')}</strong>
          </div>

          <div>
            <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin-bottom:10px">
              <span>Composition de l'escouade</span>
              <span id="preview-roster-count" style="font-family:var(--font-mono);color:${filled >= minP ? 'var(--success)' : 'var(--accent)'}">${filled}/${minP} min.</span>
            </div>
            <div id="preview-roster-list" style="display:grid;gap:6px">
              ${f.players.map((pl, idx) => {
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
              }).join('')}
            </div>
          </div>
        </aside>
      </div>
    </div>
  `;
}

function renderGalleryThumb(p) {
  return p.type === 'video'
    ? `<video src="${esc(p.url)}#t=0.1" muted playsinline preload="metadata" onloadeddata="this.classList.add('is-loaded')"></video>`
    : `<img src="${esc(p.url)}" alt="${esc(p.caption)}" loading="lazy" onload="this.classList.add('is-loaded')" onerror="this.classList.add('is-loaded')">`;
}

export function renderGallery(d) {
  const { photosF, s } = d;
  const anim = s.galleryAnimate ? 'anim-in' : '';
  const groups = groupAlbumsByPeriod(s.albums.filter(a => a.published));
  const selected = s.albums.find(a => a.name === s.album);
  const chip = (value, label, sub) => {
    const on = s.album === value;
    return `
      <button data-action="gallery-album" data-album="${esc(value)}" class="album-chip" title="${esc(sub || '')}" style="padding:8px 14px;border:1px solid ${on ? 'var(--text)' : 'var(--line)'};background:${on ? 'var(--text)' : 'transparent'};color:${on ? 'var(--bg)' : 'var(--muted)'};font:600 13px var(--font-body);cursor:pointer">${esc(label)}</button>
    `;
  };
  const emptyMessage = selected && albumPeriod(selected) === 'future'
    ? `Cet événement aura lieu le ${formatAlbumDates(selected)}. Les photos et vidéos arriveront ensuite.`
    : 'Aucune photo ou vidéo publiée pour le moment.';

  return `
    <div style="padding:56px 48px 0">
      <div style="font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)">Photos &amp; vidéos</div>
      <h1 style="font:italic 900 88px/.9 'Barlow Condensed',sans-serif;text-transform:uppercase;margin:8px 0 0">Galerie</h1>
    </div>

    <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;padding:32px 48px 24px">
      ${chip('Tout', 'Tout')}
      ${groups.map(g => `
        <span class="chip-group-label" style="margin:0 4px 0 14px;font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:${g.key === 'present' ? 'var(--accent)' : 'var(--dim)'}">${esc(g.label)}</span>
        ${g.albums.map(a => chip(a.name, a.name, formatAlbumDates(a))).join('')}
      `).join('')}
    </div>

    ${photosF.length === 0 ? `
      <div style="margin:0 48px 72px;padding:28px 0;border-top:1px solid var(--line);font-size:15px;color:var(--muted)">
        ${esc(emptyMessage)}
      </div>
    ` : `
      <div class="gallery-grid" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-auto-rows:220px;grid-auto-flow:dense;gap:8px;padding:0 48px 72px">
        ${photosF.map((p, i) => `
          <div data-action="open-lb" data-index="${i}" tabindex="0" role="button" aria-label="Ouvrir ${esc(p.caption || 'le média')}" class="gallery-tile ${anim}" style="--i:${i};${p.big ? 'grid-column:span 2;grid-row:span 2;' : ''}">
            ${renderGalleryThumb(p)}
            ${p.type === 'video' ? `<span class="tile-play"><span style="width:0;height:0;border-left:11px solid var(--on-accent);border-top:7px solid transparent;border-bottom:7px solid transparent;margin-left:3px"></span></span>` : ''}
            <span class="tile-caption">${esc(p.caption || p.album || '')}</span>
          </div>
        `).join('')}
      </div>
    `}
  `;
}
