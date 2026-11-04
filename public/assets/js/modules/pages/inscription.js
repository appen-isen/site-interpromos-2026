// Formulaire public d'inscription d'une équipe (assemble les écrans et les étapes)
import { SPORTS, SIZE, MASCOT, VENUE, EDITION, registrationStatus } from '../state.js';
import { esc, formatParisDateTime } from '../utils.js';
import { PROMO_SLOGANS, sportMetaFor, filledPlayers, readiness, renderPreviewRoster } from './inscription-shared.js';
import { renderInscriptionSent, renderInscriptionClosed } from './inscription-status.js';
import { renderStepPromoSport, renderStepIdentity, renderStepRoster, renderStepSubmit } from './inscription-steps.js';

export { charterText } from './inscription-shared.js';

// En-tête : titre, date de clôture et progression du dossier
function renderHeader({ reg, readiness }) {
  return `
      <!-- En-tête & Barre de progression -->
      <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:32px;flex-wrap:wrap;border-bottom:1px solid var(--line);padding-bottom:24px">
        <div>
          <div style="display:flex;align-items:center;gap:10px;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);margin-bottom:8px">
            <span style="width:24px;height:2px;background:var(--accent)"></span>Engagement Officiel des Équipes Étudiantes
          </div>
          <h1 style="font:italic 900 68px/.9 'Barlow Condensed',sans-serif;text-transform:uppercase;margin:0">
            Compose ton <span style="color:var(--accent)">escouade.</span>
          </h1>
          <p style="font-size:15px;color:var(--muted);margin:10px 0 0;max-width:600px">
            Choisis ton sport, défends les couleurs de ta promo et aligne ton effectif sur la feuille de match officielle des Interpromos ${esc(EDITION.year)}.
          </p>
          ${reg.closesAt ? `<p style="font-size:13px;font-weight:600;color:var(--accent);margin:8px 0 0">Clôture des inscriptions le ${esc(formatParisDateTime(reg.closesAt))}.</p>` : ''}
        </div>

        <div style="min-width:260px;background:var(--surface);border:1px solid var(--line);padding:16px 20px">
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;margin-bottom:8px">
            <span style="color:var(--muted);text-transform:uppercase;letter-spacing:.08em;font-weight:600">Prêt pour le coup d'envoi</span>
            <strong id="form-progress-label" style="color:${readiness === 100 ? 'var(--success)' : 'var(--accent)'};font-family:var(--font-mono)">${readiness}%</strong>
          </div>
          <div style="height:6px;background:var(--bg);overflow:hidden">
            <div id="form-progress-bar" style="height:100%;width:${readiness}%;background:${readiness === 100 ? 'var(--success)' : 'var(--accent)'};transition:width .25s ease"></div>
          </div>
        </div>
      </div>
  `;
}

// Colonne de droite : aperçu en direct du pass d'équipe
function renderPreview({ f, minP, filled, sportName, sportMeta, venueName, mascotName }) {
  return `
        <!-- Colonne droite : Aperçu Live du Pass Officiel d'Équipe -->
        <aside style="position:sticky;top:24px;background:var(--surface);border:1px solid var(--line);padding:28px;display:flex;flex-direction:column;gap:20px">
          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--line);padding-bottom:16px">
            <div>
              <div style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--accent)">Pass Officiel · Aperçu Live</div>
              <div style="font:italic 900 28px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;margin-top:4px">
                Interpromos ${esc(EDITION.shortYear)}
              </div>
            </div>
            <div style="width:48px;height:48px;background:var(--bg);border:1px solid var(--line);display:grid;place-items:center;font-size:24px">
              ${sportMeta.icon}
            </div>
          </div>

          <div style="background:var(--bg);border-left:4px solid var(--accent);padding:16px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <span style="padding:2px 8px;background:var(--accent);color:var(--on-accent);font-size:12px;font-weight:700">${esc(f.promo)}</span>
              <span style="font-size:12px;color:var(--muted);font-weight:600">${esc(mascotName)} · ${esc(sportName)}</span>
            </div>
            <div id="preview-team-name" style="font:italic 900 30px/1.05 'Barlow Condensed',sans-serif;text-transform:uppercase;color:var(--text);word-break:break-word">
              ${esc(f.team.trim() || `${f.promo} ${sportName}`)}
            </div>
            <div style="font-size:12px;color:var(--muted);margin-top:6px">
              📍 ${esc(venueName)} · Format ${esc(sportMeta.format)}
            </div>
          </div>

          <div style="display:flex;justify-content:space-between;font-size:13px;border-bottom:1px solid var(--line);padding-bottom:12px">
            <span style="color:var(--muted)">Capitaine</span>
            <strong id="preview-captain-name" style="color:var(--text)">${esc(f.captain.trim() || 'À désigner')}</strong>
          </div>

          <div>
            <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin-bottom:10px">
              <span>Composition de l'escouade</span>
              <span id="preview-roster-count" style="font-family:var(--font-mono);color:${filled >= minP ? 'var(--success)' : 'var(--accent)'}">${filled}/${minP} min.</span>
            </div>
            <div id="preview-roster-list" style="display:grid;gap:6px">${renderPreviewRoster(f.players, minP)}</div>
          </div>
        </aside>
  `;
}

export function renderInscription(d) {
  const { s } = d;
  const f = s.form;
  const players = filledPlayers(f);
  if (s.sent) return renderInscriptionSent(s, players);

  const reg = registrationStatus();
  if (!reg.open) return renderInscriptionClosed(reg);

  const minP = SIZE[f.sport] || 5;
  const sportName = SPORTS[f.sport] || 'Football';
  const c = {
    s,
    f,
    reg,
    minP,
    maxP: minP + 3,
    filled: players.length,
    R: 'var(--accent)',
    sportName,
    sportMeta: sportMetaFor(f.sport, minP),
    venueName: VENUE[f.sport] || 'Campus ISEN',
    mascotName: MASCOT[f.promo] || 'ISEN',
    promoSlogan: PROMO_SLOGANS[f.promo] || 'Prêts pour le titre',
    readiness: readiness(f)
  };

  return `
    <div style="padding:48px 48px 72px;max-width:1280px;margin:0 auto">
      ${renderHeader(c)}

      <div class="inscription-layout" style="display:grid;grid-template-columns:minmax(0,1.35fr) minmax(320px,0.85fr);gap:36px;align-items:start">
        <!-- Colonne gauche : formulaire en 4 étapes -->
        <div style="display:flex;flex-direction:column;gap:28px">
          ${renderStepPromoSport(c)}
          ${renderStepIdentity(c)}
          ${renderStepRoster(c)}
          ${renderStepSubmit(c)}
        </div>

        ${renderPreview(c)}
      </div>
    </div>
  `;
}
