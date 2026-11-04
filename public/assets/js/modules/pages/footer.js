// Pied de page des pages publiques.
import { EDITION } from '../state.js';
import { esc } from '../utils.js';
import { INSTAGRAM_ICON, instagramProfileUrl } from './instagram.js';

export function renderPublicFooter(s) {
  return `
    <footer style="display:flex;align-items:center;gap:20px;padding:22px 48px;border-top:1px solid var(--line);font-size:13px;color:var(--muted);flex-wrap:wrap">
      <span style="margin-right:auto">BDS ${esc(EDITION.venue)} × club APPEN${EDITION.contact ? ` · <a href="mailto:${esc(EDITION.contact)}" style="color:inherit">${esc(EDITION.contact)}</a>` : ''}</span>
      ${EDITION.instagram ? `
        <a href="${esc(instagramProfileUrl(EDITION.instagram))}" target="_blank" rel="noopener noreferrer" class="hover-text-light" aria-label="Instagram du BDS (@${esc(EDITION.instagram)})" style="display:inline-flex;align-items:center;gap:6px;color:var(--muted);text-decoration:none;font-weight:600">
          ${INSTAGRAM_ICON} @${esc(EDITION.instagram)}
        </a>
      ` : ''}
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
