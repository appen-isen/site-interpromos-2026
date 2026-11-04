// Actions des pages publiques : navigation, filtres, thème, vidéos, visionneuse
import { state } from '../state.js';
import { toggleTheme } from '../theme.js';
import { openLightbox } from '../lightbox.js';

// Son de la vidéo d'accueil (sans réaffichage, pour ne pas relancer la vidéo)
function toggleHeroSound(btn) {
  const video = document.querySelector('video[data-hero]');
  if (!video) return;
  const sync = () => {
    btn.setAttribute('aria-pressed', String(!video.muted));
    btn.setAttribute('aria-label', video.muted ? 'Activer le son' : 'Couper le son');
    btn.querySelector('.hero-sound-icon').textContent = video.muted ? '🔇' : '🔊';
  };
  video.muted = !video.muted;
  sync();
  // Si le navigateur refuse la lecture avec le son, on repasse en sourdine pour que la vidéo continue
  video.play().catch(() => {
    video.muted = true;
    sync();
    video.play().catch(() => {});
  });
}

// Son d'une vidéo Instagram jointe : sans réaffichage, pour ne pas relancer la vidéo
function toggleInstagramSound(btn) {
  const video = btn.closest('.ig-card')?.querySelector('video');
  if (!video) return;
  video.muted = !video.muted;
  if (!video.muted) video.play().catch(() => {});
  btn.setAttribute('aria-pressed', String(!video.muted));
  btn.textContent = video.muted ? '🔇 Son' : '🔊 Son';
}

function goPlanningDay({ btn, action, go }) {
  state.day = Number(btn.dataset.day);
  if (action === 'go-planning-day') state.sport = 'Tous';
  go('planning');
}

export const clickActions = {
  nav: ({ btn, go }) => go(btn.dataset.page),
  'toggle-theme': ({ render }) => {
    toggleTheme();
    render();
  },
  'scroll-to': ({ btn }) => {
    document.getElementById(btn.dataset.target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },
  'res-sport': ({ btn, render }) => {
    state.resSport = Number(btn.dataset.si);
    render();
  },
  'planning-sport': ({ btn, render }) => {
    state.sport = btn.dataset.sport;
    render();
  },
  'teams-filter': ({ btn, render }) => {
    state[btn.dataset.key] = btn.dataset.value;
    render();
  },
  'go-sport-teams': ({ btn, go }) => go('equipes', { sportF: btn.dataset.sport, promoF: 'Toutes' }),
  'planning-day': goPlanningDay,
  'go-planning-day': goPlanningDay,
  'gallery-album': ({ btn, render }) => {
    state.album = btn.dataset.album;
    render();
  },
  'open-lb': ({ btn }) => {
    const photosF = state.photos.filter(p => state.album === 'Tout' || p.album === state.album);
    openLightbox(photosF, Number(btn.dataset.index), btn);
  },
  'hero-sound': ({ btn }) => toggleHeroSound(btn),
  'ig-sound': ({ btn }) => toggleInstagramSound(btn)
};
