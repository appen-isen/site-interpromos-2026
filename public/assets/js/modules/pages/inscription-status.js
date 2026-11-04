// Formulaire d'inscription : écrans « dossier envoyé » et « inscriptions closes »
import { SPORTS, SIZE, MASCOT, EDITION } from '../state.js';
import { esc, formatParisDateTime } from '../utils.js';
import { SPORT_META } from './inscription-shared.js';

// Récapitulatif du dossier qui vient d'être envoyé
export function renderInscriptionSent(s, filledPlayers) {
    const sentIdx = Math.max(0, SPORTS.indexOf(s.sent.sport));
    const sentMinP = SIZE[sentIdx] || 5;
    const sportMeta = SPORT_META[sentIdx] || { icon: '🏆', format: `${sentMinP} vs ${sentMinP}` };
    const sentPlayers = Array.isArray(s.sent.playersList) && s.sent.playersList.length > 0
      ? s.sent.playersList
      : filledPlayers;

    return `
      <div style="padding:56px 48px 80px;max-width:860px;margin:0 auto">
        <div class="anim-pop" style="background:var(--surface);border:2px solid var(--accent);padding:44px;position:relative;overflow:hidden">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:1px solid var(--line);padding-bottom:24px;margin-bottom:28px;flex-wrap:wrap">
            <div style="display:flex;align-items:center;gap:14px">
              <div style="width:56px;height:56px;background:var(--accent);display:grid;place-items:center;font-size:28px">
                ${sportMeta.icon}
              </div>
              <div>
                <div style="font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--success)">
                  ● Dossier d'engagement enregistré · #IP${esc(EDITION.shortYear)}-${esc(String(s.sent.id || 'OK').slice(0, 8).toUpperCase())}
                </div>
                <h1 style="font:italic 900 48px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;margin:4px 0 0">
                  ${esc(s.sent.team)}
                </h1>
              </div>
            </div>
            <div style="text-align:right">
              <span style="display:inline-block;padding:6px 12px;background:var(--accent);color:var(--on-accent);font:800 14px 'Barlow Condensed',sans-serif;letter-spacing:.08em;text-transform:uppercase">
                Promo ${esc(s.sent.promo)} · ${esc(MASCOT[s.sent.promo] || '')}
              </span>
              <div style="font-size:12px;color:var(--muted);margin-top:6px">Statut : ${esc(s.sent.status || 'En attente de validation BDS')}</div>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-bottom:28px">
            <div style="background:var(--bg);border:1px solid var(--line);padding:16px">
              <div style="font-size:11px;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Discipline</div>
              <div style="font-size:16px;font-weight:700;color:var(--text)">${esc(s.sent.sport)} (${sportMeta.format})</div>
            </div>
            <div style="background:var(--bg);border:1px solid var(--line);padding:16px">
              <div style="font-size:11px;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Capitaine</div>
              <div style="font-size:16px;font-weight:700;color:var(--text)">${esc(s.sent.captain)}</div>
            </div>
            <div style="background:var(--bg);border:1px solid var(--line);padding:16px">
              <div style="font-size:11px;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Effectif engagé</div>
              <div style="font-size:16px;font-weight:700;color:var(--success)">${sentPlayers.length} joueur(s)</div>
            </div>
          </div>

          <div style="margin-bottom:32px">
            <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:10px">
              Feuille de match officielle
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:8px">
              ${sentPlayers.map((pl, idx) => `
                <span style="padding:8px 12px;background:var(--bg);border:1px solid ${idx === 0 ? 'var(--accent)' : 'var(--line)'};font-size:13px;color:var(--text);display:inline-flex;align-items:center;gap:8px">
                  <strong style="color:var(--accent);font-family:var(--font-mono)">#${idx + 1}</strong>
                  ${esc(pl)}
                  ${idx === 0 ? `<span style="font-size:10px;background:var(--accent);color:var(--on-accent);padding:1px 5px;font-weight:700">CAP</span>` : ''}
                </span>
              `).join('')}
            </div>
          </div>

          <div style="background:var(--bg);border-left:3px solid var(--accent);padding:14px 18px;margin-bottom:28px;font-size:14px;line-height:1.6;color:var(--text-2)">
            <strong style="color:var(--text)">Et maintenant ?</strong> Le BDS vérifie ton dossier. Une fois validée, ton équipe apparaît dans la page « Équipes » et peut être programmée dans le planning. Garde ce numéro de dossier : <strong style="color:var(--text);font-family:var(--font-mono)">#IP${esc(EDITION.shortYear)}-${esc(String(s.sent.id || '').slice(0, 8).toUpperCase())}</strong>.
          </div>

          <div style="display:flex;gap:12px;flex-wrap:wrap">
            <button data-action="reset-form" class="hover-accent" style="background:var(--accent);color:var(--on-accent);border:0;padding:14px 22px;font:700 14px var(--font-body);cursor:pointer">
              + Inscrire une autre équipe
            </button>
            <button data-action="nav" data-page="equipes" style="background:transparent;border:1px solid var(--line-strong);color:var(--text);padding:14px 22px;font:600 14px var(--font-body);cursor:pointer">
              Voir les équipes engagées
            </button>
            <button data-action="nav" data-page="planning" style="background:transparent;border:1px solid var(--line-strong);color:var(--muted);padding:14px 22px;font:600 14px var(--font-body);cursor:pointer">
              Consulter le planning
            </button>
          </div>
        </div>
      </div>
    `;
}

// Inscriptions fermées par le BDS, échéance passée ou tournoi commencé
export function renderInscriptionClosed(reg) {
    const why = reg.reason === 'manual'
      ? 'Le BDS a clôturé les inscriptions des équipes.'
      : reg.reason === 'deadline'
        ? `Les inscriptions des équipes sont closes depuis le ${esc(formatParisDateTime(reg.closesAt))}.`
        : 'Le tournoi a commencé : les inscriptions des équipes sont closes.';
    return `
      <div style="padding:72px 48px 96px;max-width:760px;margin:0 auto">
        <div style="background:var(--surface);border:1px solid var(--line);border-top:4px solid var(--accent);padding:40px">
          <div style="font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);margin-bottom:10px">Interpromos ${esc(EDITION.year)}</div>
          <h1 style="font:italic 900 56px/.95 'Barlow Condensed',sans-serif;text-transform:uppercase;margin:0">Inscriptions closes</h1>
          <p style="font-size:16px;color:var(--text-2);margin:16px 0 0">${why}</p>
          <p style="font-size:14px;color:var(--muted);margin:10px 0 26px">
            Une question ou un oubli ? Contacte le BDS${EDITION.contact ? ` : <a href="mailto:${esc(EDITION.contact)}" style="color:var(--accent)">${esc(EDITION.contact)}</a>` : ''}.
          </p>
          <div style="display:flex;gap:12px;flex-wrap:wrap">
            <button data-action="nav" data-page="equipes" class="hover-accent" style="background:var(--accent);color:var(--on-accent);border:0;padding:13px 20px;font:700 14px var(--font-body);cursor:pointer">Voir les équipes →</button>
            <button data-action="nav" data-page="planning" style="background:none;border:1px solid var(--line-strong);color:var(--text);padding:12px 20px;font:600 14px var(--font-body);cursor:pointer">Voir le planning</button>
          </div>
        </div>
      </div>
    `;
}
