// Gestion des événements de la page (délégation sur #root).
// Chaque domaine déclare ses actions dans modules/events/ :
//   clickActions  : boutons data-action="…"
//   changeFields  : champs data-field="…" (événement change : fichiers, listes, cases)
//   inputFields / inputPrefixes : champs data-field="…" pendant la saisie
import * as publicEvents from './events/public.js';
import * as inscription from './events/inscription.js';
import * as admin from './events/admin.js';
import * as adminContent from './events/admin-content.js';
import { findFieldHandler } from './events/helpers.js';

const DOMAINS = [publicEvents, inscription, admin, adminContent];

function merge(key) {
  const table = {};
  for (const domain of DOMAINS) {
    for (const [name, handler] of Object.entries(domain[key] || {})) {
      if (table[name]) console.warn(`Gestionnaire « ${name} » déclaré deux fois (${key})`);
      table[name] = handler;
    }
  }
  return table;
}

const CLICK = merge('clickActions');
const CHANGE = merge('changeFields');
const INPUT = merge('inputFields');
const INPUT_PREFIXES = DOMAINS.flatMap(domain => domain.inputPrefixes || []);

let listenersAttached = false;

export function attachEventListeners(render, go) {
  if (listenersAttached) return;
  const root = document.getElementById('root') || document.getElementById('app');
  if (!root) return;
  listenersAttached = true;

  root.addEventListener('click', async e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    e.preventDefault();
    const action = btn.dataset.action;
    await CLICK[action]?.({ btn, action, render, go });
  });

  // Vignettes de la galerie accessibles au clavier
  root.addEventListener('keydown', e => {
    const tile = e.target.closest?.('.gallery-tile');
    if (tile && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      tile.click();
    }
  });

  root.addEventListener('change', async e => {
    const target = e.target;
    const field = target.dataset.field;
    await CHANGE[field]?.({ target, field, render });
  });

  root.addEventListener('input', e => {
    const target = e.target;
    const field = target.dataset.field;
    if (field) {
      findFieldHandler(field, INPUT, INPUT_PREFIXES)?.({ target, field, render });
    } else if (target.dataset.playerIndex !== undefined) {
      inscription.onPlayerInput(target);
    }
  });
}
