import { esc } from './utils.js';

// Visionneuse plein écran de la galerie, gérée hors du rendu principal :
// les animations (ouverture depuis la vignette, glissement entre médias, fermeture) ne sont jamais interrompues.

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let current = null;

function mediaHtml(p) {
  if (p.type === 'video') {
    return `<video class="lb-media" src="${esc(p.url)}" controls autoplay playsinline></video>`;
  }
  return `<img class="lb-media" src="${esc(p.url)}" alt="${esc(p.caption)}">`;
}

function preload(items, index) {
  for (const i of [index - 1, index + 1]) {
    const p = items[(i + items.length) % items.length];
    if (p && p.type !== 'video') new Image().src = p.url;
  }
}

function renderSlide(direction) {
  const { root, items, index } = current;
  const p = items[index];
  const stage = root.querySelector('.lb-stage');
  const old = stage.querySelector('.lb-slide');

  const slide = document.createElement('figure');
  slide.className = 'lb-slide';
  slide.innerHTML = mediaHtml(p);
  stage.appendChild(slide);

  if (old) {
    old.querySelector('video')?.pause();
    if (reduceMotion()) {
      old.remove();
    } else {
      const dx = direction > 0 ? -60 : 60;
      old.animate(
        [{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: `translateX(${dx}px)` }],
        { duration: 260, easing: 'cubic-bezier(.4,0,.2,1)' }
      ).onfinish = () => old.remove();
      slide.animate(
        [{ opacity: 0, transform: `translateX(${-dx}px)` }, { opacity: 1, transform: 'translateX(0)' }],
        { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' }
      );
    }
  }

  root.querySelector('.lb-counter').textContent = `${index + 1} / ${items.length}`;
  root.querySelector('.lb-title').innerHTML = `${esc(p.caption || '')}<span class="lb-album">${esc(p.album || '')}</span>`;
  preload(items, index);
}

function go(step) {
  if (!current || current.items.length < 2) return;
  current.index = (current.index + step + current.items.length) % current.items.length;
  renderSlide(step);
}

function onKey(e) {
  if (e.key === 'Escape') closeLightbox();
  else if (e.key === 'ArrowRight') go(1);
  else if (e.key === 'ArrowLeft') go(-1);
}

export function closeLightbox() {
  if (!current) return;
  const { root, origin } = current;
  current = null;
  document.removeEventListener('keydown', onKey);
  document.body.style.overflow = '';
  root.querySelector('video')?.pause();

  if (reduceMotion()) {
    root.remove();
    origin?.focus?.();
    return;
  }
  root.classList.add('is-closing');
  root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: 'ease-in' }).onfinish = () => {
    root.remove();
    origin?.focus?.();
  };
}

/**
 * Ouvre la visionneuse sur items[index]. origin = vignette cliquée (l'image s'agrandit depuis sa position).
 */
export function openLightbox(items, index, origin) {
  if (!items.length) return;
  if (current) closeLightbox();

  const root = document.createElement('div');
  root.className = 'lightbox';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.innerHTML = `
    <div class="lb-backdrop"></div>
    <div class="lb-top">
      <span class="lb-title"></span>
      <span class="lb-counter"></span>
      <button class="lb-close" aria-label="Fermer">×</button>
    </div>
    <div class="lb-body">
      <button class="lb-nav lb-prev" aria-label="Précédente" ${items.length > 1 ? '' : 'disabled'}>←</button>
      <div class="lb-stage"></div>
      <button class="lb-nav lb-next" aria-label="Suivante" ${items.length > 1 ? '' : 'disabled'}>→</button>
    </div>
  `;
  document.body.appendChild(root);
  document.body.style.overflow = 'hidden';

  current = { root, items, index, origin };
  renderSlide(0);

  root.querySelector('.lb-backdrop').addEventListener('click', closeLightbox);
  root.querySelector('.lb-close').addEventListener('click', closeLightbox);
  root.querySelector('.lb-prev')?.addEventListener('click', () => go(-1));
  root.querySelector('.lb-next')?.addEventListener('click', () => go(1));
  root.querySelector('.lb-body').addEventListener('click', e => {
    if (['lb-body', 'lb-stage', 'lb-slide'].some(c => e.target.classList.contains(c))) closeLightbox();
  });
  document.addEventListener('keydown', onKey);

  // Balayage tactile gauche / droite
  let startX = null;
  root.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  root.addEventListener('touchend', e => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
    startX = null;
  });

  root.querySelector('.lb-close').focus({ preventScroll: true });

  if (reduceMotion()) return;
  root.querySelector('.lb-backdrop').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease-out' });
  root.querySelectorAll('.lb-top, .lb-nav').forEach(el =>
    el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 120, fill: 'backwards' })
  );

  // Agrandissement depuis la vignette (technique FLIP)
  const slide = root.querySelector('.lb-slide');
  const from = origin?.getBoundingClientRect();
  const media = slide.querySelector('.lb-media');
  const animateFrom = () => {
    const to = media.getBoundingClientRect();
    if (!from || !to.width || !to.height) {
      slide.animate([{ opacity: 0, transform: 'scale(.94)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 300, easing: 'cubic-bezier(.2,.8,.2,1)' });
      return;
    }
    const scale = Math.max(from.width / to.width, from.height / to.height);
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    media.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 0.6 },
        { transform: 'translate(0, 0) scale(1)', opacity: 1 }
      ],
      { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)' }
    );
  };
  if (media.tagName === 'IMG' && !media.complete) {
    slide.style.opacity = '0';
    media.addEventListener('load', () => { slide.style.opacity = ''; animateFrom(); }, { once: true });
    media.addEventListener('error', () => { slide.style.opacity = ''; }, { once: true });
  } else {
    animateFrom();
  }
}
