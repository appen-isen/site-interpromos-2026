import { state, SPORTS, PROMOS, DAYS, MASCOT, EDITION, entryPage, pageFromLocation } from './modules/state.js';
import { calcStandings } from './modules/utils.js';
import { verifySession, detectPasswordRecovery } from './modules/auth.js';
import { fetchInitialState, fetchAdminMedia } from './modules/api/index.js';
import { renderPublicHeader } from './modules/render-header.js';
import { renderLogin, renderAdmin } from './modules/render-admin.js';
import { 
  renderHome, 
  renderPlanning, 
  renderResults, 
  renderTeams, 
  renderInscription, 
  renderGallery,
  renderPublicFooter
} from './modules/render-pages.js';
import { attachEventListeners } from './modules/events.js';
import { initTheme } from './modules/theme.js';

const R = 'var(--accent)';
const T = 'var(--text)';
const M = 'var(--muted)';
const L = 'var(--line)';

// Navigation : la page courante est gardée dans l'adresse (#planning…), pour le rechargement,
// les liens partagés et le bouton Retour du navigateur
function go(page, extra = {}) {
  Object.assign(state, { page }, extra);
  const url = page === entryPage() ? window.location.pathname + window.location.search : `#${page}`;
  if (pageFromLocation() !== page) history.pushState(null, '', url);
  window.scrollTo(0, 0);
  render();
}

window.addEventListener('popstate', () => {
  // Lien de réinitialisation ouvert dans un onglet où le site était déjà chargé
  state.page = detectPasswordRecovery() ? 'admin' : pageFromLocation();
  window.scrollTo(0, 0);
  render();
});

// Ajoute les éléments d'affichage (couleur du leader, largeur de barre, points par sport) aux classements de l'API
function decorateStandings(rows) {
  const max = Math.max(1, ...rows.map(r => r.pts));
  return rows.map((r, i) => ({
    ...r,
    pos: r.pos ?? i + 1,
    mascot: r.mascot || MASCOT[r.p] || '',
    rec: r.rec || `${r.v} · ${r.n} · ${r.l}`,
    w: `${Math.round((r.pts / max) * 100)}%`,
    col: i === 0 && r.pts > 0 ? R : T,
    per: (r.per || []).map(v => ({ v, col: v ? T : 'var(--dim)' }))
  }));
}

// Temps restant avant le coup d'envoi
function countdown(now) {
  const kickoff = EDITION.startsAt ? new Date(EDITION.startsAt).getTime() : now;
  const diff = Math.max(0, kickoff - now);
  const pad = n => String(n).padStart(2, '0');
  return {
    d: Math.floor(diff / 864e5),
    h: pad(Math.floor(diff / 36e5) % 24),
    m: pad(Math.floor(diff / 6e4) % 60),
    s: pad(Math.floor(diff / 1e3) % 60)
  };
}

function getDerived() {
  const s = state;
  // Avant le tournoi tant qu'aucun match n'a démarré (compte à rebours + infos pratiques)
  const avant = !s.matches.some(m => m.status === 'live' || m.status === 'done');
  const byTime = (x, y) => x.d - y.d || x.t.localeCompare(y.t) || x.si - y.si;

  const ms = s.matches.map(m => {
    const status = m.status;
    const sc = m.scores || [0, 0];
    const show = status !== 'up';
    const done = status === 'done';
    const aw = done && sc[0] > sc[1];
    const bw = done && sc[1] > sc[0];
    return {
      ...m,
      status,
      sc,
      sa: sc[0],
      sb: sc[1],
      score: show ? `${sc[0]} – ${sc[1]}` : 'vs',
      dayShort: DAYS[m.d]?.[2] || `J${m.d + 1}`,
      tag: status === 'live' ? 'En direct' : done ? 'Terminé' : 'À venir',
      tagBg: status === 'live' ? R : done ? L : 'transparent',
      tagFg: status === 'live' ? 'var(--on-accent)' : done ? M : T,
      tagBd: status === 'up' ? 'var(--line-strong)' : 'transparent',
      ca: bw ? M : T,
      cb: aw ? M : T,
      scCol: status === 'live' ? R : status === 'up' ? 'var(--dim)' : T
    };
  });

  const liveList = ms.filter(m => m.status === 'live').sort(byTime);
  const doneList = ms.filter(m => m.status === 'done');
  // Classements calculés par l'API (vues SQL, coefficient de chaque sport inclus) ; calcul local seulement en secours
  const api = s.standings;
  const ranking = api?.general?.length
    ? decorateStandings(api.general)
    : calcStandings(doneList, SPORTS, PROMOS, MASCOT);
  const sportStandAll = SPORTS.map((_, si) => {
    const fromApi = api?.bySport?.find(x => x.si === si)?.standings;
    return fromApi ? decorateStandings(fromApi) : calcStandings(doneList.filter(m => m.si === si), SPORTS, PROMOS, MASCOT);
  });

  const teamsAll = s.teams.map(t => {
    const r = sportStandAll[t.si]?.find(x => x.p === t.p) || { v: 0, n: 0, l: 0 };
    return {
      ...t,
      rec: `${r.v}V ${r.n}N ${r.l}D`
    };
  });

  const teams = teamsAll.filter(
    t => (s.promoF === 'Toutes' || t.p === s.promoF) && (s.sportF === 'Tous' || t.sport === s.sportF)
  );

  const photosF = s.photos.filter(p => s.album === 'Tout' || p.album === s.album);

  const cd = countdown(s.now);

  return {
    s,
    avant,
    pendant: !avant,
    ms,
    byTime,
    liveList,
    doneList,
    ranking,
    sportStandAll,
    doneList,
    teams,
    photosF,
    cd
  };
}

// Les vignettes de la galerie ne s'animent qu'à l'arrivée sur la page ou au changement d'album
let lastGalleryView = '';

function render() {
  const galleryView = state.page === 'galerie' ? `${state.album}|${state.photos.length}` : '';
  state.galleryAnimate = galleryView !== '' && galleryView !== lastGalleryView;
  lastGalleryView = galleryView;

  const d = getDerived();
  const { s, liveList } = d;

  const root = document.getElementById('root');
  if (!root) return;

  const PAGE_TITLES = { planning: 'Planning', resultats: 'Résultats', equipes: 'Équipes', inscription: 'Inscription', galerie: 'Galerie', admin: 'Espace BDS' };
  document.title = `${PAGE_TITLES[s.page] ? `${PAGE_TITLES[s.page]} · ` : ''}Interpromos ${EDITION.shortYear} · ${EDITION.venue}`;

  // La vidéo d'accueil est conservée d'un affichage à l'autre (sinon elle repartirait de zéro à chaque score)
  const heroVideo = root.querySelector('video[data-hero]');
  const heroButton = root.querySelector('[data-action="hero-sound"]');

  if (s.page === 'admin') {
    if (!s.isAdminAuthenticated) {
      root.innerHTML = renderLogin();
    } else {
      root.innerHTML = renderAdmin(d);
    }
  } else {
    root.innerHTML = `
      ${renderPublicHeader(liveList)}
      <main>${renderPage(d)}</main>
      ${renderPublicFooter(s)}
    `;
  }

  const newHero = root.querySelector('video[data-hero]');
  if (heroVideo && newHero && heroVideo.getAttribute('src') === newHero.getAttribute('src')) {
    newHero.replaceWith(heroVideo);
    if (heroVideo.loop) heroVideo.play().catch(() => {});
    const newButton = root.querySelector('[data-action="hero-sound"]');
    if (heroButton && newButton) newButton.replaceWith(heroButton);
  }

  attachEventListeners(render, go);
}

function renderPage(d) {
  const s = state;
  switch (s.page) {
    case 'home': return renderHome(d);
    case 'planning': return renderPlanning(d);
    case 'resultats': return renderResults(d);
    case 'equipes': return renderTeams(d);
    case 'inscription': return renderInscription(d);
    case 'galerie': return renderGallery(d);
    default: return renderHome(d);
  }
}

// Initialisation
// Thème clair / sombre (déjà posé par <head>) : met à jour la barre mobile et suit le réglage de l'appareil
initTheme(() => render());

// Lien « mot de passe oublié » reçu par e-mail : ouvre directement le formulaire de nouveau mot de passe

if (detectPasswordRecovery()) state.page = 'admin';

fetchInitialState().then(async () => {
  await verifySession();
  if (state.isAdminAuthenticated) await fetchAdminMedia();
  render();
  
  // Scores en direct : on relit les matchs régulièrement et on ne réaffiche que si quelque chose a changé
  let lastMatchesSig = JSON.stringify(state.matches);
  const LIVE_PAGES = ['home', 'planning', 'resultats', 'equipes'];
  setInterval(async () => {
    if (document.hidden) return;
    try {
      // L'admin contourne le cache CDN (3 s) pour ne jamais revoir un score plus ancien que celui qu'il vient de saisir
      const bust = state.isAdminAuthenticated ? `?t=${Date.now()}` : '';
      const res = await fetch(`/api/matches${bust}`, { cache: 'no-store' });
      if (!res.ok) return;
      const list = await res.json();
      const sig = JSON.stringify(list);
      if (!Array.isArray(list) || sig === lastMatchesSig) return;
      lastMatchesSig = sig;
      state.matches = list;
      // Les classements suivent les matchs : on les relit à chaque changement
      const st = await fetch(`/api/standings${bust}`, { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).catch(() => null);
      if (st?.general) state.standings = st;
      const onLiveView = LIVE_PAGES.includes(state.page) || (state.page === 'admin' && state.adminTab === 'live');
      // Pas de réaffichage pendant une saisie ou la lecture d'une vidéo
      const typing = document.activeElement?.matches?.('input, textarea, select');
      const playing = [...document.querySelectorAll('video:not([data-hero])')].some(v => !v.paused);
      if (onLiveView && !typing && !playing) render();
    } catch (e) {}
  }, 8000);

  // Compte à rebours : seul son texte change chaque seconde, la page n'est pas redessinée
  setInterval(() => {
    state.now = Date.now();
    const el = document.getElementById('countdown');
    if (!el) return;
    const cd = countdown(state.now);
    el.textContent = `${cd.d}J ${cd.h}H ${cd.m}M ${cd.s}S`;
  }, 1000);
});
