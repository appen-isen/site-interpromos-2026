// Cadre de l'Espace BDS : menu latéral, compteurs, onglet affiché.
import { state, DAYS, ALBUMS } from '../state.js';
import { renderThemeToggle } from '../theme.js';
import { esc } from '../utils.js';
import { renderAdminEdition } from './edition.js';
import { renderAdminGallery } from './gallery.js';
import { renderAdminImport } from './import.js';
import { renderAdminInstagram } from './instagram.js';
import { renderAdminLive } from './live.js';
import { renderAdminMatches } from './matches.js';
import { renderAdminInscriptions } from './registrations.js';
import { renderAdminTeams } from './teams.js';
import { T, M, L } from './ui.js';

// Icônes de la barre latérale de l'Espace BDS (seules visibles quand le menu est réduit)
const svg = body => `<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

const ICONS = {
  menu: svg('<path d="M4 6h16M4 12h16M4 18h16"/>'),
  live: svg('<circle cx="12" cy="12" r="2"/><path d="M16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4M19 5a10 10 0 0 1 0 14M5 19A10 10 0 0 1 5 5"/>'),
  matchs: svg('<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
  equipes: svg('<circle cx="9" cy="8" r="4"/><path d="M2 21v-1a6 6 0 0 1 12 0v1M16 4a4 4 0 0 1 0 8M22 21v-1a6 6 0 0 0-4-5.6"/>'),
  inscriptions: svg('<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v2h6V3M9 12l2 2 4-4"/>'),
  import: svg('<path d="M12 15V3M7 8l5-5 5 5M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>'),
  edition: svg('<path d="M4 21V4M4 4h12l-2 4 2 4H4"/>'),
  galerie: svg('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>'),
  instagram: svg('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>'),
  refresh: svg('<path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/>'),
  docs: svg('<path d="M4 19.5V5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2.5zM20 19v3H6"/>'),
  site: svg('<path d="M19 12H5M12 19l-7-7 7-7"/>'),
  logout: svg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>')
};

export function renderAdmin(d) {
  const { s, liveList, ms, byTime } = d;
  const pending = s.regs.filter(r => r.status === 'En attente').length;
  const totalPlayers = s.teams.reduce((acc, t) => acc + (Array.isArray(t.playersList) && t.playersList.length > 0 ? t.playersList.length : (t.players || 0)), 0);

  const tabs = [
    ['live', 'Scores en direct', liveList.length],
    ['matchs', 'Matchs', ms.length],
    ['equipes', 'Équipes & Joueurs', s.teams.length],
    ['inscriptions', 'Inscriptions', pending],
    ['import', 'Import CSV', 0],
    ['edition', 'Édition', 0],
    ['galerie', 'Galerie', s.adminPhotos.length],
    ['instagram', 'Instagram', s.instagramPosts.length]
  ];

  const regTone = {
    'En attente': [T, 'var(--bg)', T],
    'Validée': [L, T, L],
    'Refusée': ['transparent', M, 'var(--line-strong)']
  };

  const adminMatches = ms.filter(m => m.d === s.adminDay).sort(byTime);

  return `
    <div class="admin-layout ${s.sideOpen ? 'side-open' : ''} ${s.sideCollapsed ? 'side-collapsed' : ''}">
      <button type="button" data-action="toggle-side" class="admin-side-backdrop" aria-label="Fermer le menu" tabindex="-1"></button>
      <aside class="admin-side">
        <div class="admin-side-brand">
          <span style="width:32px;height:32px;flex:none;background:var(--logo-bg);display:grid;place-items:center">
            <img src="/assets/logo_bds.svg" alt="BDS" style="width:24px;height:24px">
          </span>
          <div class="side-label">
            <div style="font:italic 800 20px/1 'Barlow Condensed',sans-serif;text-transform:uppercase">Admin BDS</div>
            <div style="font-size:11px;color:var(--success);margin-top:2px">● Connecté · Bureau BDS</div>
          </div>
        </div>

        <button type="button" data-action="toggle-side" class="side-item side-toggle hover-surface" aria-expanded="${s.sideOpen || !s.sideCollapsed}" title="Afficher ou masquer le menu">
          <span class="side-icon">${ICONS.menu}</span><span class="side-label">Réduire le menu</span>
        </button>

        ${tabs.map(([t, label, count]) => {
          const on = s.adminTab === t;
          const hot = on || t === 'live' || t === 'inscriptions';
          return `
            <button data-action="admin-tab" data-tab="${t}" class="side-item hover-surface ${on ? 'is-on' : ''}" title="${esc(label)}" aria-label="${esc(label)}${count ? ` (${count})` : ''}" ${on ? 'aria-current="page"' : ''}>
              <span class="side-icon">${ICONS[t] || ''}${count ? `<span class="side-dot" style="background:${hot ? 'var(--accent)' : 'var(--line-strong)'}"></span>` : ''}</span>
              <span class="side-label">${esc(label)}</span>
              ${count ? `<span class="side-count" style="background:${hot ? 'var(--accent)' : 'var(--line)'};color:${hot ? 'var(--on-accent)' : 'var(--text)'}">${count}</span>` : ''}
            </button>
          `;
        }).join('')}

        <div class="admin-side-foot">
          <div class="side-theme">${renderThemeToggle()}</div>
          <button data-action="refresh-state" class="side-item hover-text-light" title="Actualiser les données" style="color:var(--text-2)">
            <span class="side-icon">${ICONS.refresh}</span><span class="side-label">Actualiser les données</span>
          </button>
          <a href="/docs/" class="side-item hover-text-light" title="Documentation API" style="color:var(--text-2)">
            <span class="side-icon">${ICONS.docs}</span><span class="side-label">Documentation API</span>
          </a>
          <button data-action="nav" data-page="home" class="side-item hover-text-light" title="Voir le site public">
            <span class="side-icon">${ICONS.site}</span><span class="side-label">Voir le site public</span>
          </button>
          <button data-action="admin-logout" class="side-item hover-text-light" title="Se déconnecter" style="color:var(--error)">
            <span class="side-icon">${ICONS.logout}</span><span class="side-label">Se déconnecter</span>
          </button>
        </div>
      </aside>

      <main class="admin-main" style="padding:40px 32px 64px;min-width:0;overflow-x:auto">
        <!-- Bandeau récapitulatif des données en base (masqué sur le live pour garder l'écran de saisie épuré) -->
        ${s.adminTab === 'live' ? '' : `<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border:1px solid var(--line);background:var(--surface);margin-bottom:32px">
          <div data-action="admin-tab" data-tab="matchs" style="padding:16px 20px;border-right:1px solid var(--line);cursor:pointer">
            <div style="font-size:12px;color:var(--muted);margin-bottom:4px">Matchs programmés</div>
            <div style="font:italic 800 28px/1 'Barlow Condensed',sans-serif;color:var(--text)">${ms.length} <span style="font-size:14px;color:var(--accent);font-style:normal">(${liveList.length} live)</span></div>
          </div>
          <div data-action="admin-tab" data-tab="equipes" style="padding:16px 20px;border-right:1px solid var(--line);cursor:pointer">
            <div style="font-size:12px;color:var(--muted);margin-bottom:4px">Équipes enregistrées</div>
            <div style="font:italic 800 28px/1 'Barlow Condensed',sans-serif;color:var(--text)">${s.teams.length}</div>
          </div>
          <div data-action="admin-tab" data-tab="equipes" style="padding:16px 20px;border-right:1px solid var(--line);cursor:pointer">
            <div style="font-size:12px;color:var(--muted);margin-bottom:4px">Participants inscrits</div>
            <div style="font:italic 800 28px/1 'Barlow Condensed',sans-serif;color:var(--text)">${totalPlayers}</div>
          </div>
          <div data-action="admin-tab" data-tab="inscriptions" style="padding:16px 20px;cursor:pointer">
            <div style="font-size:12px;color:var(--muted);margin-bottom:4px">Inscriptions web</div>
            <div style="font:italic 800 28px/1 'Barlow Condensed',sans-serif;color:${pending > 0 ? 'var(--accent)' : 'var(--text)'}">${s.regs.length} <span style="font-size:14px;color:var(--muted);font-style:normal">(${pending} en attente)</span></div>
          </div>
        </div>`}

        ${s.adminTab === 'live' ? renderAdminLive(s, adminMatches, DAYS, liveList) : ''}
        ${s.adminTab === 'matchs' ? renderAdminMatches(d) : ''}
        ${s.adminTab === 'equipes' ? renderAdminTeams(s) : ''}
        ${s.adminTab === 'inscriptions' ? renderAdminInscriptions(s, regTone) : ''}
        ${s.adminTab === 'galerie' ? renderAdminGallery(s, ALBUMS) : ''}
        ${s.adminTab === 'import' ? renderAdminImport(s) : ''}
        ${s.adminTab === 'edition' ? renderAdminEdition(s) : ''}
        ${s.adminTab === 'instagram' ? renderAdminInstagram(s) : ''}
      </main>
    </div>
  `;
}
