// Bloc Instagram du BDS : posts, reels en boucle, bouton « Suivre ».
import { state, EDITION } from '../state.js';
import { esc } from '../utils.js';

// Instagram

export const INSTAGRAM_ICON = `<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>`;

export const instagramProfileUrl = handle => `https://www.instagram.com/${encodeURIComponent(handle)}/`;

// Bouton « Suivre » : ouvre le profil Instagram (on s'abonne depuis Instagram, le site ne le fait pas à la place de l'utilisateur)
function renderFollowButton(handle) {
  return `
    <a href="${esc(instagramProfileUrl(handle))}" target="_blank" rel="noopener noreferrer" class="hover-accent" style="display:inline-flex;align-items:center;gap:8px;background:var(--accent);color:var(--on-accent);padding:12px 18px;font:700 14px var(--font-body);text-decoration:none">
      ${INSTAGRAM_ICON} Suivre @${esc(handle)}
    </a>
  `;
}

// Vidéo jointe par le BDS : lue en boucle et sans le son quand elle est à l'écran (main.js), le son s'active au clic
function renderInstagramVideo(post) {
  return `
    <div class="ig-card ig-card-video">
      <video data-ig-video src="${esc(post.video)}" muted loop playsinline preload="metadata" aria-label="${post.type === 'reel' ? 'Reel' : 'Vidéo'} Instagram du BDS"></video>
      <div class="ig-video-bar">
        <a href="${esc(post.url)}" target="_blank" rel="noopener noreferrer">${INSTAGRAM_ICON} Voir sur Instagram</a>
        <button type="button" data-action="ig-sound" aria-pressed="false">🔇 Son</button>
      </div>
    </div>
  `;
}

// Lecteur officiel d'Instagram : la hauteur est ajustée ensuite d'après la taille annoncée par Instagram (main.js)
function renderInstagramEmbed(post) {
  if (post.video) return renderInstagramVideo(post);
  const kind = post.type === 'reel' ? 'reel' : 'p';
  return `
    <div class="ig-card">
      <iframe data-ig="${esc(post.code)}" src="https://www.instagram.com/${kind}/${esc(post.code)}/embed/" title="${post.type === 'reel' ? 'Reel' : 'Post'} Instagram du BDS" loading="lazy" scrolling="no" allow="encrypted-media; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin"></iframe>
    </div>
  `;
}

/**
 * Section « Suivez-nous » : derniers posts et reels ajoutés dans l'Espace BDS + bouton Suivre.
 * Rien n'est affiché tant qu'il n'y a ni compte ni post.
 */
export function renderInstagramSection({ limit = 3, skipHero = false } = {}) {
  const handle = EDITION.instagram;
  // Sur l'accueil, la vidéo déjà affichée en tête n'est pas répétée
  const posts = state.instagramPosts.filter(p => !(skipHero && p.hero && p.video)).slice(0, limit);
  if (!handle && posts.length === 0) return '';
  return `
    <section class="ig-section" style="padding:56px 48px;border-top:1px solid var(--line)">
      <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;margin-bottom:28px">
        <div>
          <div style="font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)">Instagram${handle ? ` · @${esc(handle)}` : ''}</div>
          <h2 style="font:italic 900 56px/.9 'Barlow Condensed',sans-serif;text-transform:uppercase;margin:8px 0 0">Suivez-nous</h2>
          <p style="font-size:15px;color:var(--muted);margin:10px 0 0;max-width:560px">Coulisses, résultats et meilleurs moments du tournoi en posts et en reels.</p>
        </div>
        ${handle ? renderFollowButton(handle) : ''}
      </div>
      ${posts.length ? `<div class="ig-grid">${posts.map(renderInstagramEmbed).join('')}</div>` : ''}
    </section>
  `;
}
