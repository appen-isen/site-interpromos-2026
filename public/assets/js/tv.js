// Mode TV : scores en direct en plein écran, mis à jour automatiquement.
// Réglages par le BDS (Espace BDS > Scores en direct) : sport affiché et message défilant.
// Une adresse /tv?sport=Basket force un sport sur un écran donné (prioritaire sur le réglage du BDS).
import { esc } from './modules/utils.js';

const MATCHES_EVERY = 5000;   // scores
const SETTINGS_EVERY = 15000; // réglages du BDS (sport, message)
const PAGE_EVERY = 12000;     // rotation quand plus de 4 matchs sont en direct
const PER_PAGE = 4;

const root = document.getElementById('tv-root');
const params = new URLSearchParams(window.location.search);

const tv = {
  config: null,
  edition: null,
  matches: [],
  standings: null,
  lastScores: new Map(),
  flashed: new Set(),
  page: 0,
  sig: '',
  ticker: null,
  error: false
};

const dayFmt = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' });
const clockFmt = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' });

async function getJson(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${url} : ${res.status}`);
  return res.json();
}

// Sport affiché : paramètre de l'adresse, sinon choix du BDS, sinon tous
function selectedSport() {
  const sports = tv.config?.sports || [];
  const fromUrl = params.get('sport');
  if (fromUrl !== null && fromUrl !== '') {
    const byIndex = Number(fromUrl);
    if (Number.isInteger(byIndex) && sports[byIndex]) return byIndex;
    const byName = sports.findIndex(s => s.toLowerCase() === fromUrl.toLowerCase());
    if (byName >= 0) return byName;
  }
  const fromBds = tv.edition?.tv?.sport;
  return Number.isInteger(fromBds) && sports[fromBds] ? fromBds : null;
}

// Jour du tournoi en cours (0, 1, 2) d'après la date de Paris, ou null hors tournoi
function currentDay() {
  if (!tv.edition?.start) return null;
  const [d, m, y] = dayFmt.format(new Date()).split('/');
  const diff = Math.round((Date.parse(`${y}-${m}-${d}T12:00:00Z`) - Date.parse(`${tv.edition.start}T12:00:00Z`)) / 86400000);
  return diff >= 0 && diff < (tv.edition.days?.length || 3) ? diff : null;
}

const byTime = (x, y) => x.d - y.d || String(x.t).localeCompare(String(y.t)) || x.si - y.si;
const mascot = code => tv.config?.mascot?.[code] || '';
const scoreOf = m => (Array.isArray(m.scores) ? m.scores.map(v => Number(v) || 0) : [0, 0]);

function visibleMatches() {
  const si = selectedSport();
  return si === null ? tv.matches : tv.matches.filter(m => m.si === si);
}

// Repère les scores qui viennent de changer pour les faire clignoter
function detectScoreChanges(list) {
  for (const m of list) {
    const key = m.dbId || m.id;
    const now = scoreOf(m).join('-');
    const before = tv.lastScores.get(key);
    if (before !== undefined && before !== now && m.status === 'live') {
      tv.flashed.add(key);
      setTimeout(() => tv.flashed.delete(key), 2600);
    }
    tv.lastScores.set(key, now);
  }
}

function renderHead(liveCount) {
  const day = currentDay();
  const si = selectedSport();
  const dayLabel = day !== null && tv.edition?.days?.[day] ? `${tv.edition.days[day][0]} · ${tv.edition.days[day][1]}` : tv.edition?.range || '';
  return `
    <header class="tv-head">
      <div class="tv-brand">Interpromos <span>${esc(tv.edition?.year || '')}</span></div>
      <div class="tv-day">${esc(dayLabel)}${si !== null ? ` · ${esc(tv.config.sports[si])}` : ''}${tv.edition?.venue ? ` · ${esc(tv.edition.venue)}` : ''}</div>
      <div class="tv-head-right">
        <span class="tv-live-pill ${liveCount ? '' : 'is-off'}"><span class="tv-dot"></span>${liveCount ? `${liveCount} en direct` : 'Pas de match en cours'}</span>
        <span class="tv-clock" id="tv-clock">${clockFmt.format(new Date())}</span>
      </div>
    </header>
  `;
}

function renderTeam(m, side) {
  const code = side === 0 ? m.a : m.b;
  const name = side === 0 ? m.teamAName : m.teamBName;
  return `
    <div class="tv-team ${side === 1 ? 'right' : ''}">
      <div class="tv-promo">${esc(code)}</div>
      <div class="tv-team-name">${esc(name || '')}</div>
      <div class="tv-mascot">${esc(mascot(code))}</div>
    </div>
  `;
}

function renderLiveMatch(m) {
  const [a, b] = scoreOf(m);
  const key = m.dbId || m.id;
  return `
    <article class="tv-match ${tv.flashed.has(key) ? 'tv-flash' : ''}">
      <div class="tv-match-meta">
        <span><strong>${esc(m.sport)}</strong> · ${esc(m.phase || '')}</span>
        <span>${esc(m.venue || '')}${m.t ? ` · ${esc(m.t)}` : ''}</span>
      </div>
      <div class="tv-match-body">
        ${renderTeam(m, 0)}
        <div class="tv-score"><span class="${a > b ? 'lead' : ''}">${a}</span><span class="sep">–</span><span class="${b > a ? 'lead' : ''}">${b}</span></div>
        ${renderTeam(m, 1)}
      </div>
    </article>
  `;
}

function renderLive(live, upcoming) {
  if (live.length === 0) {
    const next = upcoming[0];
    return `
      <section class="tv-panel">
        <div class="tv-empty">
          <div class="tv-empty-title">Aucun match en cours</div>
          ${next ? `
            <div class="tv-empty-sub">Prochain match${tv.edition?.days?.[next.d] ? ` · ${esc(tv.edition.days[next.d][0])}` : ''} à ${esc(next.t)}</div>
            <div class="tv-empty-next">${esc(next.sport)} · ${esc(next.teamAName || next.a)} (${esc(next.a)}) vs ${esc(next.teamBName || next.b)} (${esc(next.b)})</div>
            <div class="tv-empty-sub">${esc(next.venue || '')}</div>
          ` : '<div class="tv-empty-sub">Restez connectés, les scores arrivent ici en direct.</div>'}
        </div>
      </section>
    `;
  }
  const pages = Math.ceil(live.length / PER_PAGE);
  if (tv.page >= pages) tv.page = 0;
  const shown = live.slice(tv.page * PER_PAGE, tv.page * PER_PAGE + PER_PAGE);
  return `
    <div style="display:flex;flex-direction:column;gap:1vh;min-height:0">
      <div class="tv-live n${shown.length}" style="flex:1">${shown.map(renderLiveMatch).join('')}</div>
      ${pages > 1 ? `<div class="tv-page-dots">${Array.from({ length: pages }, (_, i) => `<i class="${i === tv.page ? 'on' : ''}"></i>`).join('')}</div>` : ''}
    </div>
  `;
}

function renderStandings() {
  const si = selectedSport();
  // Les 8 premières équipes (général ou sport choisi) restent lisibles de loin
  const rows = (si === null
    ? tv.standings?.general || []
    : (tv.standings?.bySport || []).find(s => s.si === si)?.standings || []).slice(0, 8);
  return `
    <section class="tv-panel">
      <div class="tv-panel-title"><span>Classement${si === null ? ' général' : ` · <strong>${esc(tv.config.sports[si])}</strong>`}</span><span>Pts</span></div>
      <ol class="tv-rank">
        ${rows.map(r => `
          <li>
            <span class="pos">${esc(r.pos)}</span>
            <span class="who">${r.team
              ? `<div class="code team">${esc(r.team)}</div><div class="masc">${esc(r.p)}${si === null && r.sport ? ` · ${esc(r.sport)}` : ` · ${esc(r.mascot || mascot(r.p))}`} · ${esc(r.rec || '')}</div>`
              : `<div class="code">${esc(r.p)}</div><div class="masc">${esc(r.mascot || mascot(r.p))} · ${esc(r.rec || '')}</div>`}</span>
            <span class="pts">${esc(r.pts)}</span>
          </li>
        `).join('') || '<li><span></span><span class="masc">Classement disponible après les premiers matchs.</span><span></span></li>'}
      </ol>
    </section>
  `;
}

function renderList(title, list, done) {
  return `
    <section class="tv-panel">
      <div class="tv-panel-title"><span>${title}</span></div>
      <ul class="tv-list">
        ${list.length === 0 ? `<li class="none">${done ? 'Aucun résultat pour le moment.' : 'Aucun match à venir.'}</li>` : list.map(m => {
          const [a, b] = scoreOf(m);
          const day = tv.edition?.days?.[m.d]?.[2] || '';
          return `
            <li>
              <span class="time">${esc(m.t || '')}</span>
              <span class="vs">
                <b class="${done && a > b ? 'win' : ''}">${esc(m.teamAName || m.a)}</b> <small>${esc(m.a)}</small> – <b class="${done && b > a ? 'win' : ''}">${esc(m.teamBName || m.b)}</b> <small>${esc(m.b)}</small>
                <span class="tag"> · ${esc(m.sport)}${day ? ` · ${esc(day)}` : ''}${!done && m.venue ? ` · ${esc(m.venue)}` : ''}</span>
              </span>
              ${done ? `<span class="res">${a}–${b}</span>` : `<span class="tag">${esc(m.phase || '')}</span>`}
            </li>
          `;
        }).join('')}
      </ul>
    </section>
  `;
}

function renderTicker() {
  const message = tv.edition?.tv?.message || '';
  if (message === tv.ticker) return;
  tv.ticker = message;
  const el = document.getElementById('tv-ticker');
  if (!el) return;
  if (!message) {
    el.innerHTML = '';
    return;
  }
  // Vitesse de lecture constante, quelle que soit la longueur du message
  const duration = Math.max(14, Math.round(message.length * 0.28 + 12));
  el.innerHTML = `
    <div class="tv-ticker">
      <span class="tv-ticker-label">BDS</span>
      <div class="tv-ticker-track"><span class="tv-ticker-text" style="--tv-duration:${duration}s">${esc(message)}</span></div>
    </div>
  `;
}

function render() {
  if (!tv.config) return;
  const list = visibleMatches();
  const live = list.filter(m => m.status === 'live').sort(byTime);
  const upcoming = list.filter(m => m.status === 'up').sort(byTime);
  const done = list.filter(m => m.status === 'done').sort(byTime).reverse();

  if (!document.getElementById('tv-ticker')) {
    root.innerHTML = '<div id="tv-head"></div><div id="tv-main" class="tv-main"></div><div id="tv-bottom" class="tv-bottom"></div><div id="tv-ticker"></div>';
    tv.ticker = null;
  }
  document.getElementById('tv-head').innerHTML = renderHead(live.length);
  document.getElementById('tv-main').innerHTML = renderLive(live, upcoming) + renderStandings();
  document.getElementById('tv-bottom').innerHTML =
    renderList('À suivre', upcoming.slice(live.length ? 0 : 1, (live.length ? 0 : 1) + 4), false) +
    renderList('Derniers résultats', done.slice(0, 4), true);
  renderTicker();
}

async function refreshMatches() {
  try {
    const list = await getJson(`/api/matches?t=${Date.now()}`);
    if (!Array.isArray(list)) return;
    tv.error = false;
    const sig = JSON.stringify(list);
    if (sig === tv.sig) return;
    tv.sig = sig;
    detectScoreChanges(list);
    tv.matches = list;
    tv.standings = await getJson(`/api/standings?t=${Date.now()}`).catch(() => tv.standings);
    render();
  } catch (err) {
    console.error('Mode TV : scores indisponibles', err);
  }
}

async function refreshSettings() {
  try {
    const edition = await getJson('/api/edition');
    const before = JSON.stringify(tv.edition?.tv);
    tv.edition = edition;
    if (JSON.stringify(edition.tv) !== before) {
      tv.page = 0;
      render();
    }
  } catch (err) {
    console.error('Mode TV : réglages indisponibles', err);
  }
}

async function start() {
  try {
    const data = await getJson('/api/state');
    tv.config = data.config || {};
    tv.edition = data.config?.edition || null;
    tv.matches = Array.isArray(data.matches) ? data.matches : [];
    tv.standings = data.standings || null;
    tv.sig = JSON.stringify(tv.matches);
    detectScoreChanges(tv.matches);
    render();
  } catch (err) {
    root.innerHTML = '<div class="tv-error">Connexion au serveur impossible · nouvel essai dans 10 s</div>';
    setTimeout(start, 10000);
    return;
  }

  setInterval(() => { if (!document.hidden) refreshMatches(); }, MATCHES_EVERY);
  setInterval(() => { if (!document.hidden) refreshSettings(); }, SETTINGS_EVERY);
  setInterval(() => {
    const live = visibleMatches().filter(m => m.status === 'live').length;
    if (live > PER_PAGE) {
      tv.page = (tv.page + 1) % Math.ceil(live / PER_PAGE);
      render();
    }
  }, PAGE_EVERY);
  setInterval(() => {
    const el = document.getElementById('tv-clock');
    if (el) el.textContent = clockFmt.format(new Date());
    // Passage de minuit : le jour du tournoi affiché change
    if (new Date().getSeconds() === 0) render();
  }, 1000);
}

// Plein écran (bouton visible seulement quand on bouge la souris)
const fsButton = document.getElementById('tv-fullscreen');
let pointerTimer = null;
document.addEventListener('mousemove', () => {
  document.body.classList.add('tv-pointer');
  clearTimeout(pointerTimer);
  pointerTimer = setTimeout(() => document.body.classList.remove('tv-pointer'), 2500);
});
fsButton.addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.().catch(() => {});
});
document.addEventListener('fullscreenchange', () => {
  fsButton.textContent = document.fullscreenElement ? 'Quitter le plein écran' : 'Plein écran';
});

// Empêche l'écran de se mettre en veille pendant l'affichage
let wakeLock = null;
async function keepAwake() {
  try {
    if ('wakeLock' in navigator && !document.hidden) wakeLock = await navigator.wakeLock.request('screen');
  } catch (e) {}
}
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    keepAwake();
    refreshMatches();
  }
});
keepAwake();

start();
