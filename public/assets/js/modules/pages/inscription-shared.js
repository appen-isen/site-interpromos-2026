// Formulaire d'inscription : données et calculs partagés entre l'affichage et la saisie en direct
import { SPORTS, SIZE, EDITION } from '../state.js';
import { esc } from '../utils.js';

export const SPORT_META = [
  { icon: '⚽', format: '7 vs 7', vibe: 'Intensité maximale sur grand synthétique' },
  { icon: '🏀', format: '5 vs 5', vibe: 'Showtime, contre-attaques et tirs primés' },
  { icon: '🏐', format: '6 vs 6', vibe: 'Smashs, blocs et cohésion millimétrée' },
  { icon: '🤾', format: '7 vs 7', vibe: 'Impact, vitesse et duels au 6 mètres' },
  { icon: '🏸', format: 'Duo 2 vs 2', vibe: 'Réflexes éclairs et volants décisifs' },
  { icon: '🤼', format: 'Duels 1 vs 1', vibe: 'Force, technique et combats au tapis' }
];

export const PROMO_SLOGANS = {
  A1: 'Nouveaux venus, déjà prêts à tout casser',
  A2: 'Survoltés du premier au dernier coup de sifflet',
  A3: 'La résistance s’organise sur tous les terrains',
  A4: 'Aucun crash possible, victoire programmée',
  A5: 'Les anciens ont tous les privilèges sur le terrain'
};

export const sportMetaFor = (si, minP = SIZE[si] || 5) =>
  SPORT_META[si] || { icon: '🏆', format: `${minP} vs ${minP}`, vibe: 'Compétition officielle Interpromos' };

// Joueurs effectivement renseignés
export const filledPlayers = f => f.players.map(x => x.trim()).filter(Boolean);

// Niveau de complétion du dossier, de 20 % (promo et sport choisis) à 100 %
export function readiness(f) {
  const minP = SIZE[f.sport] || 5;
  const filled = filledPlayers(f).length;
  let value = 20;
  if (f.team.trim()) value += 20;
  if (f.captain.trim() && /^\S+@\S+\.\S+$/.test(f.email.trim())) value += 20;
  if (filled >= minP) value += 25;
  else value += Math.round((filled / minP) * 20);
  if (f.rules) value += 15;
  return Math.min(100, value);
}

export function charterText(f) {
  const players = filledPlayers(f).length;
  const team = f.team.trim() ? `l'équipe <strong>« ${esc(f.team.trim())} »</strong>` : 'mon équipe';
  const who = players === 0 ? 'tous les joueurs de ' + team
    : players === 1 ? `le joueur inscrit dans ${team}`
    : `les <strong>${players} joueurs</strong> de ${team}`;
  const captain = f.captain.trim() ? `, capitaine <strong>${esc(f.captain.trim())}</strong>` : '';
  return `<strong>Charte Fair-Play &amp; Règlement BDS :</strong> Je certifie que ${who} (<strong>${esc(SPORTS[f.sport] || '')}</strong>${captain}) ${players === 1 ? 'appartient' : 'appartiennent'} bien à la promo <strong>${esc(f.promo)}</strong> et ${players === 1 ? "s'engage" : "s'engagent"} à respecter les horaires, les arbitres et l'esprit sportif des Interpromos ${esc(EDITION.year)}.`;
}

// Liste des joueurs dans l'aperçu du pass d'équipe
export function renderPreviewRoster(players, minP) {
  return players
    .map((pl, idx) => {
      const name = pl.trim();
      const isSub = idx >= minP;
      return `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 10px;background:var(--bg);border:1px solid ${name ? 'var(--line)' : 'var(--surface-3)'};font-size:12px">
          <span style="color:${name ? 'var(--text)' : 'var(--dim)'}">
            <strong style="color:${isSub ? 'var(--muted)' : 'var(--accent)'};font-family:var(--font-mono);margin-right:6px">#${idx + 1}</strong>
            ${esc(name || (isSub ? 'Remplaçant libre' : 'Titulaire à compléter'))}
          </span>
          <span style="font-size:10px;text-transform:uppercase;color:${isSub ? 'var(--muted)' : 'var(--text-2)'}">${idx === 0 ? '★ CAP' : isSub ? 'REMPL.' : 'TIT.'}</span>
        </div>
      `;
    })
    .join('');
}
