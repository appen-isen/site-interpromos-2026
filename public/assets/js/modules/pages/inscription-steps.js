// Formulaire d'inscription : les 4 étapes (promo et sport, identité, joueurs, validation)
import { SPORTS, SIZE, PROMOS, MASCOT, VENUE } from '../state.js';
import { esc } from '../utils.js';
import { SPORT_META, charterText } from './inscription-shared.js';

// Étape 1 : promo représentée et sport
export function renderStepPromoSport({ f, promoSlogan }) {
  return `
          <!-- ÉTAPE 1 : CHOIX DE LA PROMO & DU SPORT -->
          <section style="background:var(--surface);border:1px solid var(--line);padding:28px">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
              <span style="width:26px;height:26px;background:var(--accent);color:var(--on-accent);font:800 14px 'Barlow Condensed',sans-serif;display:grid;place-items:center">01</span>
              <h2 style="font:italic 800 26px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;margin:0">Bannière de Promo &amp; Discipline</h2>
            </div>

            <!-- Cartes Promo A1 -> A5 -->
            <div style="margin-bottom:22px">
              <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:10px">
                Quelle promotion représentes-tu ?
              </div>
              <div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px">
                ${PROMOS.map(p => {
                  const active = f.promo === p;
                  return `
                    <button
                      type="button"
                      data-action="form-promo"
                      data-promo="${esc(p)}"
                      style="padding:14px 10px;background:${active ? 'var(--accent)' : 'var(--bg)'};border:1px solid ${active ? 'var(--accent)' : 'var(--line)'};color:${active ? 'var(--on-accent)' : 'var(--text)'};cursor:pointer;text-align:center;display:flex;flex-direction:column;gap:4px;align-items:center"
                    >
                      <span style="font:italic 900 28px/1 'Barlow Condensed',sans-serif">${esc(p)}</span>
                      <span style="font-size:11px;color:${active ? 'var(--on-accent)' : 'var(--muted)'};font-weight:600">${esc(MASCOT[p] || '')}</span>
                    </button>
                  `;
                }).join('')}
              </div>
              <div style="margin-top:8px;font-size:12px;color:var(--muted);font-style:italic">
                « ${esc(promoSlogan)} »
              </div>
            </div>

            <!-- Cartes des 6 Sports -->
            <div>
              <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:10px">
                Choisis ton terrain de jeu
              </div>
              <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">
                ${SPORTS.map((sp, i) => {
                  const active = f.sport === i;
                  const meta = SPORT_META[i] || { icon: '🏆', format: `${SIZE[i] || 5} j.`, vibe: '' };
                  const sMin = SIZE[i] || 5;
                  return `
                    <button
                      type="button"
                      data-action="form-sport"
                      data-si="${i}"
                      style="padding:14px 16px;background:${active ? 'var(--error-bg)' : 'var(--bg)'};border:1px solid ${active ? 'var(--accent)' : 'var(--line)'};color:var(--text);cursor:pointer;text-align:left;display:flex;flex-direction:column;gap:6px"
                    >
                      <div style="display:flex;justify-content:space-between;align-items:center;width:100%">
                        <span style="font-size:20px">${meta.icon}</span>
                        <span style="font:700 11px var(--font-mono);padding:2px 6px;background:${active ? 'var(--accent)' : 'var(--surface-2)'};color:${active ? 'var(--on-accent)' : 'var(--muted)'}">${esc(meta.format)}</span>
                      </div>
                      <div style="font:italic 800 20px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;color:${active ? 'var(--accent)' : 'var(--text)'}">
                        ${esc(sp)}
                      </div>
                      <div style="font-size:11px;color:var(--muted)">
                        ${sMin} titulaires min. · ${esc(VENUE[i] || 'Gymnase')}
                      </div>
                    </button>
                  `;
                }).join('')}
              </div>
            </div>
          </section>
  `;
}

// Étape 2 : nom de l'équipe et capitaine
export function renderStepIdentity({ s, f, R, mascotName }) {
  return `
          <!-- ÉTAPE 2 : IDENTITÉ DE L'ÉQUIPE & CAPITAINE -->
          <section style="background:var(--surface);border:1px solid var(--line);padding:28px">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px;flex-wrap:wrap">
              <div style="display:flex;align-items:center;gap:10px">
                <span style="width:26px;height:26px;background:var(--accent);color:var(--on-accent);font:800 14px 'Barlow Condensed',sans-serif;display:grid;place-items:center">02</span>
                <h2 style="font:italic 800 26px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;margin:0">Identité d'Équipe &amp; Capitaine</h2>
              </div>
              <button
                type="button"
                data-action="generate-team-name"
                style="background:var(--surface-2);border:1px solid var(--line-strong);color:var(--text);padding:8px 14px;font:600 12px var(--font-body);cursor:pointer"
              >
                🎲 Générer un nom d'équipe fun
              </button>
            </div>

            <div style="display:grid;gap:18px">
              <label style="display:flex;flex-direction:column;gap:8px">
                <span style="font-size:13px;font-weight:600">Nom officiel de l'équipe</span>
                <input
                  data-field="form-team"
                  value="${esc(f.team)}"
                  placeholder="Ex: FC ${esc(mascotName)}, Les Survoltés ${esc(f.promo)}..."
                  style="background:var(--bg);border:1px solid ${s.err.team ? R : 'var(--line)'};color:var(--text);padding:13px 16px;font:15px var(--font-body);outline:none"
                >
                ${s.err.team ? `<span class="field-error" style="font-size:13px;color:var(--error)">${esc(s.err.team)}</span>` : ''}
              </label>

              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px">
                <label style="display:flex;flex-direction:column;gap:8px">
                  <span style="font-size:13px;font-weight:600">Prénom &amp; Nom du Capitaine</span>
                  <input
                    data-field="form-captain"
                    value="${esc(f.captain)}"
                    placeholder="Prénom Nom"
                    style="background:var(--bg);border:1px solid ${s.err.captain ? R : 'var(--line)'};color:var(--text);padding:13px 16px;font:15px var(--font-body);outline:none"
                  >
                  ${s.err.captain ? `<span class="field-error" style="font-size:13px;color:var(--error)">${esc(s.err.captain)}</span>` : ''}
                </label>

                <label style="display:flex;flex-direction:column;gap:8px">
                  <span style="font-size:13px;font-weight:600">E-mail ISEN du Capitaine</span>
                  <input
                    data-field="form-email"
                    type="email"
                    value="${esc(f.email)}"
                    placeholder="prenom.nom@isen-ouest.yncrea.fr"
                    style="background:var(--bg);border:1px solid ${s.err.email ? R : 'var(--line)'};color:var(--text);padding:13px 16px;font:15px var(--font-body);outline:none"
                  >
                  ${s.err.email ? `<span class="field-error" style="font-size:13px;color:var(--error)">${esc(s.err.email)}</span>` : ''}
                </label>
              </div>
            </div>
          </section>
  `;
}

// Étape 3 : titulaires et remplaçants
export function renderStepRoster({ s, f, R, filled, minP, maxP }) {
  return `
          <!-- ÉTAPE 3 : LE VESTIAIRE (COMPOSITION DES JOUEURS) -->
          <section style="background:var(--surface);border:1px solid var(--line);padding:28px">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px;flex-wrap:wrap">
              <div style="display:flex;align-items:center;gap:10px">
                <span style="width:26px;height:26px;background:var(--accent);color:var(--on-accent);font:800 14px 'Barlow Condensed',sans-serif;display:grid;place-items:center">03</span>
                <h2 style="font:italic 800 26px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;margin:0">Le Vestiaire · Feuille de Match</h2>
              </div>
              <span id="form-players-hint" style="font:700 12px var(--font-mono);padding:4px 10px;background:${filled >= minP ? 'var(--success-bg)' : 'var(--surface-2)'};color:${filled >= minP ? 'var(--success)' : 'var(--accent)'};border:1px solid ${filled >= minP ? 'var(--success)' : 'var(--line)'}">
                ${filled} / ${minP} titulaires requis (max ${maxP})
              </span>
            </div>

            <p style="font-size:13px;color:var(--muted);margin:0 0 18px">
              Renseigne le prénom et le nom de chaque joueur. Tu peux ajouter jusqu'à 3 remplaçants pour faire tourner l'effectif.
            </p>

            ${f.captain.trim() && f.players[0]?.trim() !== f.captain.trim() ? `
              <button
                type="button"
                data-action="copy-captain-to-player1"
                style="margin-bottom:14px;background:var(--surface-2);border:1px solid var(--line-strong);color:var(--text-2);padding:7px 12px;font:600 12px var(--font-body);cursor:pointer"
              >
                ★ Inscrire automatiquement le capitaine (${esc(f.captain.trim())}) en Joueur #1
              </button>
            ` : ''}

            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px">
              ${f.players.map((p, i) => {
                const isSub = i >= minP;
                return `
                  <div style="display:flex;align-items:center;background:var(--bg);border:1px solid ${s.err.players && !p.trim() && !isSub ? R : 'var(--line)'}">
                    <span style="min-width:44px;padding:10px 8px;text-align:center;font:700 12px var(--font-mono);color:${isSub ? 'var(--muted)' : 'var(--accent)'};border-right:1px solid var(--line);background:var(--surface)">
                      #${i + 1}
                    </span>
                    <input
                      data-player-index="${i}"
                      value="${esc(p)}"
                      placeholder="${i === 0 ? 'Joueur 1 (Capitaine)' : isSub ? `Remplaçant ${i - minP + 1} (optionnel)` : `Titulaire ${i + 1}`}"
                      style="flex:1;min-width:0;background:transparent;border:0;color:var(--text);padding:11px 12px;font:14px var(--font-body);outline:none"
                    >
                    ${isSub ? `
                      <button
                        type="button"
                        data-action="remove-player-slot"
                        data-index="${i}"
                        title="Retirer ce remplaçant"
                        style="background:none;border:0;color:var(--muted);padding:0 10px;font-size:16px;cursor:pointer"
                      >×</button>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>

            ${s.err.players ? `<div class="field-error" style="margin-top:10px;font-size:13px;color:var(--error)">${esc(s.err.players)}</div>` : ''}

            ${f.players.length < maxP ? `
              <div style="margin-top:14px">
                <button
                  type="button"
                  data-action="add-player-slot"
                  style="background:transparent;border:1px dashed var(--line-strong);color:var(--text);padding:9px 16px;font:600 13px var(--font-body);cursor:pointer"
                >
                  + Ajouter un remplaçant (${f.players.length - minP} / 3)
                </button>
              </div>
            ` : ''}
          </section>
  `;
}

// Étape 4 : charte fair-play et envoi
export function renderStepSubmit({ s, f, sportName }) {
  return `
          <!-- ÉTAPE 4 : ENGAGEMENT FAIR-PLAY & VALIDATION -->
          <section style="background:var(--surface);border:1px solid var(--line);padding:28px;display:flex;flex-direction:column;gap:18px">
            <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer">
              <input data-field="form-rules" type="checkbox" ${f.rules ? 'checked' : ''} style="width:18px;height:18px;margin-top:2px;accent-color:var(--accent)">
              <span id="form-charter-text" style="font-size:14px;color:var(--text-2);line-height:1.5">${charterText(f)}</span>
            </label>
            ${s.err.rules ? `<span class="field-error" style="font-size:13px;color:var(--error)">${esc(s.err.rules)}</span>` : ''}

            ${s.err.general ? `<div class="field-error" role="alert" style="padding:12px 14px;border:1px solid var(--accent);background:var(--error-bg);color:var(--error-text);font-size:14px">${esc(s.err.general)}</div>` : ''}

            <button
              data-action="submit-registration"
              class="hover-accent ${s.formLoading ? 'is-loading' : ''}"
              ${s.formLoading ? 'disabled aria-busy="true"' : ''}
              style="background:${s.formLoading ? 'var(--line-strong)' : 'var(--accent)'};color:var(--on-accent);border:0;padding:17px 24px;font:italic 900 22px/1 'Barlow Condensed',sans-serif;letter-spacing:.06em;text-transform:uppercase;cursor:${s.formLoading ? 'wait' : 'pointer'};text-align:center"
            >
              ${s.formLoading ? 'Envoi de la feuille de match…' : `Valider la feuille de match · ${esc(f.promo)} ${esc(sportName)} →`}
            </button>
          </section>
  `;
}
