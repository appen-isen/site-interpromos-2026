// Page d'accueil : vidéo, matchs en direct, prochains matchs, infos pratiques.
import { state, SPORTS, PROMOS, VENUE, DAYS, EDITION, registrationStatus } from '../state.js';
import { esc, teamTag, mapLink, mapUrl, formatParisDateTime } from '../utils.js';
import { INSTAGRAM_ICON, renderInstagramSection } from './instagram.js';

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
      ${hero.instagram ? `<a href="${esc(hero.instagram)}" target="_blank" rel="noopener noreferrer" class="hero-sound hero-ig-link">${INSTAGRAM_ICON} Voir sur Instagram</a>` : ''}
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
          <span style="width:24px;height:2px;background:var(--accent)"></span>${esc(EDITION.range)} · ${mapLink(EDITION.venue, 'color:inherit;text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:4px')}
        </div>
        <h1 style="font:italic 900 120px/.86 'Barlow Condensed',sans-serif;text-transform:uppercase;margin:0">
          Une promo.<br><span style="color:var(--accent)">Un titre.</span>
        </h1>
        <p style="font-size:18px;line-height:1.6;color:var(--text-2);max-width:480px;margin:0">
          ${SPORTS.length} sports, ${PROMOS.length} promos, ${DAYS.length} jours de compétition organisés par le BDS .
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
      <div class="media-frame" style="background:repeating-linear-gradient(135deg,var(--surface-3) 0 10px,var(--surface-4) 10px 20px);position:relative;min-height:420px;overflow:hidden">
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
              <div style="display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:10px;align-items:center;font:italic 800 34px/1 'Barlow Condensed',sans-serif">
                <span>${esc(g.a)}</span><span style="font-variant-numeric:tabular-nums">${esc(g.score)}</span><span style="text-align:right">${esc(g.b)}</span>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:6px;font-size:12px;color:var(--muted)">
                <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(g.teamAName || '')}</span><span style="text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(g.teamBName || '')}</span>
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
            <span style="font-size:16px;font-weight:700">${teamTag(m.teamAName, m.a)} <span style="color:var(--dim);font-weight:400;margin:0 6px">vs</span> ${teamTag(m.teamBName, m.b)}</span>
            <span style="font-size:13px;color:var(--muted)">${esc(m.dayShort)} · ${esc(m.venue || '')}</span>
          </div>
        `).join('')}
      </div>

      <div style="padding:48px 40px">
        ${avant ? `
          <h2 style="${BIG};margin:0 0 20px">Infos pratiques</h2>
          <div style="padding:16px 0;border-top:1px solid var(--line)">
            <div style="font-size:12px;color:var(--muted)">Adresse</div>
            <div style="font-size:16px;margin-top:4px">${esc(EDITION.venue)} · <a href="${esc(mapUrl(EDITION.venue))}" target="_blank" rel="noopener noreferrer" style="color:var(--accent);font-weight:600;text-decoration:none">voir sur la carte →</a></div>
          </div>
          <div style="padding:16px 0;border-top:1px solid var(--line)">
            <div style="font-size:12px;color:var(--muted)">Terrains</div>
            <div style="font-size:16px;margin-top:4px">${esc(venues.join(' · ') || 'ISEN Nantes')}</div>
          </div>
          <div style="padding:16px 0;border-top:1px solid var(--line)">
            <div style="font-size:12px;color:var(--muted)">Inscriptions</div>
            ${registrationStatus().open ? `
              <div style="font-size:16px;margin-top:4px">En ligne jusqu'au ${esc(formatParisDateTime(registrationStatus().closesAt))}, validées par le BDS · <button data-action="nav" data-page="inscription" style="background:none;border:0;padding:0;color:var(--accent);font:600 16px var(--font-body);cursor:pointer">s'inscrire →</button></div>
            ` : `
              <div style="font-size:16px;margin-top:4px">Closes · <button data-action="nav" data-page="equipes" style="background:none;border:0;padding:0;color:var(--accent);font:600 16px var(--font-body);cursor:pointer">voir les équipes →</button></div>
            `}
          </div>
          ${EDITION.contact ? `
            <div style="padding:16px 0;border-top:1px solid var(--line)">
              <div style="font-size:12px;color:var(--muted)">Contact</div>
              <a href="mailto:${esc(EDITION.contact)}" style="display:block;font-size:16px;margin-top:4px;color:var(--text)">${esc(EDITION.contact)}</a>
            </div>
          ` : ''}
        ` : `
          <h2 style="${BIG};margin:0 0 16px">Classement</h2>
          ${ranking.slice(0, 5).map(r => `
            <div style="display:grid;grid-template-columns:36px minmax(0,1fr) auto;align-items:center;gap:12px;padding:14px 0;border-top:1px solid var(--line)">
              <span style="font:italic 900 30px/1 'Barlow Condensed',sans-serif;color:${r.col}">${r.pos}</span>
              <div>
                <div style="font-weight:700;font-size:15px">${teamTag(r.team || r.p, r.p)} <span style="font-weight:400;color:var(--muted)">· ${esc(r.sport || '')}</span></div>
                <div style="height:4px;background:var(--line);margin-top:7px"><div class="rank-bar" style="height:4px;width:${r.w};background:${r.col}"></div></div>
              </div>
              <span style="font:italic 800 24px/1 'Barlow Condensed',sans-serif">${r.pts}</span>
            </div>
          `).join('')}
          <button data-action="nav" data-page="resultats" style="margin-top:16px;padding:0;background:none;border:0;color:var(--accent);font:600 14px var(--font-body);cursor:pointer">Classement complet →</button>
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

    ${renderInstagramSection({ limit: 3, skipHero: true })}
  `;
}
