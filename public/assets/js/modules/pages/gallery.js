// Galerie photos et vidéos, par album.
import { esc, albumPeriod, formatAlbumDates, groupAlbumsByPeriod } from '../utils.js';
import { renderInstagramSection } from './instagram.js';

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

    ${renderInstagramSection({ limit: 12 })}
  `;
}
