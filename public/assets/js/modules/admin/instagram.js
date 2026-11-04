// Onglet « Instagram » : posts et reels affichés sur le site.
import { EDITION } from '../state.js';
import { esc } from '../utils.js';
import { R, T, M, L } from './ui.js';

export function renderAdminInstagram(s) {
  const f = s.igForm;
  const input = `background:var(--bg);border:1px solid ${L};color:${T};padding:11px 12px;font:15px var(--font-body)`;
  return `
    <h1 style="font:italic 900 56px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;margin:0">Instagram</h1>
    <p style="font-size:14px;color:${M};margin:8px 0 28px;max-width:720px">
      Collez le lien d'un post ou d'un reel du BDS : il s'affiche aussitôt sur l'accueil (3 plus récents) et dans la galerie (12 plus récents).
      Sur Instagram : « ⋯ » puis « Copier le lien ». Le compte doit être public.
      Instagram n'autorise pas la lecture automatique de son lecteur : pour qu'un reel tourne en boucle, joignez-lui son fichier vidéo
      (il est lu sans le son, le visiteur peut l'activer). Une vidéo jointe peut aussi passer en tête de l'accueil avec « Mettre en accueil ».
    </p>

    <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:28px;align-items:start;max-width:1100px">
      <div style="background:var(--surface);border:1px solid ${L};padding:24px;display:flex;flex-direction:column;gap:16px">
        <label style="display:flex;flex-direction:column;gap:6px;font-size:12px;color:${M}">
          Lien du post ou du reel
          <input data-field="igForm-url" value="${esc(f.url)}" placeholder="https://www.instagram.com/reel/…" style="${input}">
        </label>
        ${f.error ? `<div role="alert" style="padding:10px 12px;border:1px solid ${R};background:var(--error-bg);color:var(--error-text);font-size:13px">${esc(f.error)}</div>` : ''}
        ${f.success ? `<div style="padding:10px 12px;border:1px solid var(--success-line);background:var(--success-bg);color:var(--success-text);font-size:13px">${esc(f.success)}</div>` : ''}
        <button data-action="add-ig-post" class="hover-accent ${f.loading ? 'is-loading' : ''}" ${f.loading ? 'disabled' : ''} style="align-self:flex-start;background:${f.loading ? 'var(--line-strong)' : R};color:var(--on-accent);border:0;padding:13px 20px;font:700 14px var(--font-body);cursor:pointer">
          ${f.loading ? 'Ajout…' : 'Ajouter au site'}
        </button>
        <p style="font-size:12px;color:${M};margin:0">
          Compte affiché : ${EDITION.instagram ? `<strong style="color:${T}">@${esc(EDITION.instagram)}</strong>` : 'aucun'}
          · <button data-action="admin-tab" data-tab="edition" style="padding:0;background:none;border:0;color:${R};font:600 12px var(--font-body);cursor:pointer">modifier dans Édition</button>
        </p>
      </div>

      <div style="background:var(--surface);border:1px solid ${L};padding:24px">
        <div style="font-size:12px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:${R};margin-bottom:8px">Sur le site (${s.instagramPosts.length})</div>
        ${s.instagramPosts.length === 0 ? `
          <p style="font-size:14px;color:${M};margin:0">Aucun post pour le moment.</p>
        ` : s.instagramPosts.map((p, i) => {
          const up = f.uploading?.id === p.id;
          const small = `background:none;border:1px solid ${L};padding:6px 10px;font:600 12px var(--font-body);cursor:pointer`;
          return `
          <div style="padding:12px 0;border-top:1px solid ${L};font-size:14px">
            <div style="display:flex;align-items:center;gap:12px">
              <span style="min-width:44px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${p.type === 'reel' ? R : M}">${p.type === 'reel' ? 'Reel' : 'Post'}</span>
              <a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:${T}">${esc(p.code)}</a>
              ${i < 3 ? `<span style="font-size:11px;color:${M}">accueil</span>` : ''}
              <button data-action="delete-ig-post" data-id="${esc(p.id)}" class="hover-text-light" style="${small};color:var(--error)">Retirer</button>
            </div>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:8px 0 0 56px;font-size:12px;color:${M}">
              ${up ? `<span>Envoi de la vidéo… ${f.uploading.percent ? `${f.uploading.percent} %` : ''}</span>` : p.video ? `
                <span style="color:var(--success-text)">▶ Vidéo en boucle</span>
                ${p.hero
                  ? `<span style="background:${R};color:var(--on-accent);font:600 11px var(--font-body);padding:3px 6px">ACCUEIL</span>
                     <button data-action="ig-hero" data-id="${esc(p.id)}" data-on="false" class="hover-text-light" style="${small};color:${T}">Retirer de l'accueil</button>`
                  : `<button data-action="ig-hero" data-id="${esc(p.id)}" data-on="true" class="hover-text-light" style="${small};color:${T}" title="Remplace la photo ou vidéo d'accueil choisie dans la Galerie">Mettre en accueil</button>`}
                <label class="hover-text-light" style="${small};color:${T}">Remplacer<input data-field="igVideo" data-id="${esc(p.id)}" type="file" accept="video/mp4,video/webm,video/quicktime" hidden></label>
                <button data-action="delete-ig-video" data-id="${esc(p.id)}" class="hover-text-light" style="${small};color:${M}">Retirer la vidéo</button>
              ` : `
                <span>Lecteur Instagram (pas de lecture auto)</span>
                <label class="hover-text-light" style="${small};color:${T}">Joindre la vidéo<input data-field="igVideo" data-id="${esc(p.id)}" type="file" accept="video/mp4,video/webm,video/quicktime" hidden></label>
              `}
            </div>
          </div>
        `;
        }).join('')}
      </div>
    </div>
  `;
}
