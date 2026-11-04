// Onglet « Galerie » : albums, photos et vidéos.
import { ALBUMS } from '../state.js';
import { esc, albumPeriod, formatAlbumDates, groupAlbumsByPeriod, PERIOD_LABELS } from '../utils.js';
import { R, T, M, L } from './ui.js';

function renderMediaThumb(p, height) {
  return p.type === 'video'
    ? `<video class="media-thumb" src="${esc(p.url)}#t=0.1" muted playsinline preload="metadata" style="width:100%;height:${height};object-fit:cover;display:block;background:#000"></video>`
    : `<img class="media-thumb" src="${esc(p.url)}" alt="${esc(p.caption)}" loading="lazy" style="width:100%;height:${height};object-fit:cover;display:block;background:var(--surface-3)">`;
}

function renderAlbumForm(f) {
  const input = `background:var(--bg);border:1px solid ${L};color:${T};padding:10px 12px;font:14px var(--font-body)`;
  return `
    <div style="background:var(--surface);border:1px solid ${f.editingId ? R : L};padding:20px 24px;margin-top:24px">
      <div style="font:italic 800 22px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;margin-bottom:6px">
        ${f.editingId ? 'Modifier l’album' : 'Nouvel album / événement'}
      </div>
      <div style="font-size:13px;color:${M};margin-bottom:16px">
        Datez l'album pour qu'il soit classé automatiquement dans la galerie : à venir, en cours ou passé. Sans date, il apparaît dans « Autres ».
      </div>
      <div style="display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr) minmax(0,1fr) auto;gap:12px;align-items:end">
        <label style="display:flex;flex-direction:column;gap:6px;font-size:12px;color:${M}">
          Nom
          <input data-field="albumForm-name" value="${esc(f.name)}" maxlength="80" placeholder="Nom de l'événement" style="${input}">
        </label>
        <label style="display:flex;flex-direction:column;gap:6px;font-size:12px;color:${M}">
          Date de début
          <input type="date" data-field="albumForm-start" value="${esc(f.start)}" style="${input};color-scheme:var(--scheme)">
        </label>
        <label style="display:flex;flex-direction:column;gap:6px;font-size:12px;color:${M}">
          Date de fin (optionnelle)
          <input type="date" data-field="albumForm-end" value="${esc(f.end)}" style="${input};color-scheme:var(--scheme)">
        </label>
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:${T};padding-bottom:10px">
          <input type="checkbox" data-field="albumForm-published" ${f.published ? 'checked' : ''}> Publié
        </label>
      </div>
      ${f.error ? `<div style="color:var(--error-text);font-size:13px;margin-top:12px">${esc(f.error)}</div>` : ''}
      <div style="display:flex;gap:10px;margin-top:16px">
        <button data-action="submit-album" class="hover-accent" style="background:${R};color:var(--on-accent);border:0;padding:11px 18px;font:700 14px var(--font-body);cursor:pointer">
          ${f.editingId ? 'Enregistrer' : '+ Créer l’album'}
        </button>
        ${f.editingId ? `<button data-action="cancel-album-edit" style="background:transparent;color:${T};border:1px solid var(--line-strong);padding:11px 18px;font:600 14px var(--font-body);cursor:pointer">Annuler</button>` : ''}
      </div>
    </div>
  `;
}

export function renderAdminGallery(s, ALBUMS) {
  const targetAlbum = ALBUMS.includes(s.mediaAlbum) ? s.mediaAlbum : ALBUMS[0];
  const up = s.mediaUploading;
  const locked = Boolean(up) || s.albums.length === 0;
  const heroId = s.adminSlots?.hero?.id;

  return `
    <h1 style="font:italic 900 52px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;margin:0 0 24px">Galerie</h1>
    <div style="border:2px dashed var(--line-strong);padding:32px 40px;display:flex;align-items:center;justify-content:space-between;gap:24px;margin-bottom:16px;flex-wrap:wrap">
      <div>
        <div style="font:italic 800 28px/1 'Barlow Condensed',sans-serif;text-transform:uppercase">Déposer des photos ou vidéos</div>
        <div style="font-size:13px;color:${M};margin-top:6px">Photos (JPG, PNG, WEBP, GIF) et vidéos (MP4, WEBM, MOV) · ${Math.round((s.uploadConfig?.maxBytes || 209715200) / 1048576)} Mo max par fichier · sélection multiple possible</div>
      </div>
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <label style="display:flex;flex-direction:column;gap:6px;font-size:12px;color:${M}">
          Album de destination
          <select data-field="mediaAlbum" ${up ? 'disabled' : ''} style="background:var(--bg);border:1px solid ${L};color:${T};padding:10px 12px;font:14px var(--font-body)">
            ${groupAlbumsByPeriod(s.albums).map(g => `
              <optgroup label="${esc(g.label)}">
                ${g.albums.map(a => `<option value="${esc(a.name)}" ${a.name === targetAlbum ? 'selected' : ''}>${esc(a.name)}${a.start ? ` · ${esc(formatAlbumDates(a))}` : ''}</option>`).join('')}
              </optgroup>
            `).join('')}
          </select>
        </label>
        <label class="hover-accent" title="${s.albums.length === 0 ? 'Créez d’abord un album' : ''}" style="align-self:flex-end;background:${locked ? 'var(--line-strong)' : R};color:var(--on-accent);padding:13px 20px;font:700 14px var(--font-body);cursor:${up ? 'wait' : locked ? 'not-allowed' : 'pointer'}">
          ${up ? `Envoi ${Math.min(up.done + 1, up.total)}/${up.total}${up.percent ? ` · ${up.percent} %` : ''}…` : '+ Ajouter des médias'}
          <input type="file" data-field="mediaFiles" multiple accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" ${locked ? 'disabled' : ''} style="display:none">
        </label>
      </div>
    </div>

    ${s.mediaError || s.mediaSuccess ? `
      <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;padding:12px 16px;margin-bottom:16px;font-size:14px;border:1px solid ${s.mediaError ? R : 'var(--success-line)'};background:${s.mediaError ? 'var(--error-bg)' : 'var(--success-bg)'};color:${s.mediaError ? 'var(--error-text)' : 'var(--success-text)'}">
        <span>${esc(s.mediaSuccess)} ${esc(s.mediaError)}</span>
        <button data-action="dismiss-media-msg" style="background:none;border:0;color:inherit;cursor:pointer;font-size:16px">×</button>
      </div>
    ` : ''}

    ${renderAlbumForm(s.albumForm)}

    <div style="display:grid;grid-template-columns:80px minmax(0,1fr) 110px 100px 120px 170px;gap:16px;padding:10px 16px;font-size:12px;color:${M};border-bottom:2px solid ${L};margin-top:24px">
      <span></span><span>Album / événement</span><span>Période</span><span>Médias</span><span>Visibilité</span><span></span>
    </div>

    ${s.albums.length === 0 ? `
      <div style="padding:16px;color:${M};font-size:14px;border-bottom:1px solid ${L}">Aucun album. Créez-en un ci-dessus avant d'ajouter des médias.</div>
    ` : groupAlbumsByPeriod(s.albums).flatMap(g => g.albums).map(a => {
      const on = Boolean(a.published);
      const items = s.adminPhotos.filter(p => p.album === a.name);
      const period = albumPeriod(a);
      const periodColor = { present: R, future: 'var(--info)', past: M, none: 'var(--dim)' }[period];
      const editing = s.albumForm.editingId === a.id;
      return `
        <div style="display:grid;grid-template-columns:80px minmax(0,1fr) 110px 100px 120px 170px;gap:16px;align-items:center;padding:12px 16px;border-bottom:1px solid ${L};background:${editing ? 'var(--surface-2)' : 'transparent'}">
          <div style="height:52px;overflow:hidden;background:repeating-linear-gradient(135deg,var(--surface-3) 0 6px,var(--surface-4) 6px 12px)">${items[0] ? renderMediaThumb(items[0], '52px') : ''}</div>
          <div>
            <strong style="font-size:15px">${esc(a.name)}</strong>
            <div style="font-size:12px;color:${M};margin-top:3px">${a.start ? esc(formatAlbumDates(a)) : 'Sans date'}</div>
          </div>
          <span style="justify-self:start;font:700 11px var(--font-body);text-transform:uppercase;letter-spacing:.06em;color:${periodColor};border:1px solid ${periodColor};padding:4px 8px">${period === 'past' ? 'Passé' : esc(PERIOD_LABELS[period])}</span>
          <span style="font-size:14px;color:${M}">${items.length} média(s)</span>
          <button data-action="toggle-album" data-name="${esc(a.name)}" style="justify-self:start;padding:7px 12px;font:700 12px var(--font-body);cursor:pointer;background:${on ? R : 'transparent'};color:${on ? 'var(--on-accent)' : M};border:1px solid ${on ? R : 'var(--line-strong)'}">
            ${on ? 'Publié' : 'Brouillon'}
          </button>
          <div style="display:flex;gap:6px;justify-content:flex-end">
            <button data-action="edit-album" data-id="${a.id}" style="padding:6px 10px;font:600 12px var(--font-body);cursor:pointer;background:transparent;color:${T};border:1px solid var(--line-strong)">Modifier</button>
            <button data-action="delete-album" data-id="${a.id}" data-name="${esc(a.name)}" ${items.length > 0 ? 'disabled title="Déplacez ou supprimez d’abord ses médias"' : ''} style="padding:6px 10px;font:600 12px var(--font-body);cursor:${items.length > 0 ? 'not-allowed' : 'pointer'};background:transparent;color:${items.length > 0 ? 'var(--dim)' : R};border:1px solid ${items.length > 0 ? 'var(--line-strong)' : R}">Supprimer</button>
          </div>
        </div>
      `;
    }).join('')}

    <h2 style="font:italic 800 32px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;margin:40px 0 16px">Médias (${s.adminPhotos.length})</h2>
    ${s.adminPhotos.length === 0 ? `
      <div style="padding:20px;background:var(--surface);border:1px solid ${L};color:${M};font-size:14px">Aucun média pour le moment. Utilisez « Ajouter des médias » ci-dessus.</div>
    ` : `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px">
        ${s.adminPhotos.map(p => `
          <div style="background:var(--surface);border:1px solid ${p.id === heroId ? R : L};display:flex;flex-direction:column">
            <a href="${esc(p.url)}" target="_blank" rel="noopener" style="display:block;position:relative">
              ${renderMediaThumb(p, '150px')}
              ${p.type === 'video' ? `<span style="position:absolute;top:8px;left:8px;background:rgba(0,0,0,.7);color:var(--on-accent);font:600 11px var(--font-body);padding:3px 6px">VIDÉO</span>` : ''}
              ${p.id === heroId ? `<span style="position:absolute;top:8px;right:8px;background:${R};color:var(--on-accent);font:600 11px var(--font-body);padding:3px 6px" title="Affiché en tête de l'accueil, donc masqué dans la galerie publique">ACCUEIL · hors galerie</span>` : ''}
            </a>
            <div style="padding:10px;display:flex;flex-direction:column;gap:8px">
              <input data-field="mediaCaption" data-id="${p.id}" value="${esc(p.caption)}" maxlength="200" placeholder="Légende" style="background:var(--bg);border:1px solid ${L};color:${T};padding:7px 9px;font:13px var(--font-body)">
              <select data-field="mediaMoveAlbum" data-id="${p.id}" style="background:var(--bg);border:1px solid ${L};color:${T};padding:7px 9px;font:13px var(--font-body)">
                ${ALBUMS.map(name => `<option value="${esc(name)}" ${name === p.album ? 'selected' : ''}>${esc(name)}</option>`).join('')}
              </select>
              <div style="display:flex;gap:6px;flex-wrap:wrap">
                <button data-action="set-media-slot" data-slot="hero" data-id="${p.id === heroId ? '' : p.id}" style="flex:1;padding:6px 8px;font:600 12px var(--font-body);cursor:pointer;background:transparent;color:${T};border:1px solid var(--line-strong)">
                  ${p.id === heroId ? 'Retirer de l’accueil' : 'Mettre en accueil'}
                </button>
                <button data-action="toggle-media-big" data-id="${p.id}" data-big="${p.big ? 'true' : 'false'}" title="Afficher en grand format dans la galerie" style="padding:6px 8px;font:600 12px var(--font-body);cursor:pointer;background:${p.big ? 'var(--line)' : 'transparent'};color:${T};border:1px solid var(--line-strong)">
                  ${p.big ? 'Grand ✓' : 'Grand'}
                </button>
                <button data-action="delete-media" data-id="${p.id}" style="padding:6px 8px;font:600 12px var(--font-body);cursor:pointer;background:transparent;color:${R};border:1px solid ${R}">
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `}
  `;
}
