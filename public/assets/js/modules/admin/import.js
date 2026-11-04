// Onglet « Import CSV » des équipes.
import { PROMOS } from '../state.js';
import { esc } from '../utils.js';
import { R } from './ui.js';

export function renderAdminImport(s) {
  return `
    <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:24px;flex-wrap:wrap">
      <div>
        <h1 style="font:italic 900 52px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;margin:0">Import CSV des équipes</h1>
        <p style="font-size:14px;color:var(--muted);margin:8px 0 0">Importez un fichier CSV de fiche d'équipe par promo (colonnes par sport ou lignes) pour créer automatiquement les équipes et les participants.</p>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,0.9fr);gap:28px;align-items:start">
      <div style="background:var(--surface);border:1px solid var(--line);padding:24px;display:flex;flex-direction:column;gap:20px">
        <div style="display:grid;grid-template-columns:160px minmax(0,1fr);gap:16px">
          <label style="display:flex;flex-direction:column;gap:8px">
            <span style="font-size:13px;font-weight:600">Promotion cible</span>
            <select
              data-field="importPromo"
              class="input-focus"
              style="background:var(--bg);border:1px solid var(--line);color:var(--text);padding:12px 16px;font:15px var(--font-body);outline:none"
            >
              ${PROMOS.map(p => `<option value="${esc(p)}" ${s.importPromo === p ? 'selected' : ''}>${esc(p)}</option>`).join('')}
            </select>
          </label>

          <label style="display:flex;flex-direction:column;gap:8px">
            <span style="font-size:13px;font-weight:600">Charger un fichier .csv depuis votre ordinateur</span>
            <input
              type="file"
              accept=".csv,.txt"
              data-field="importCsvFile"
              style="background:var(--bg);border:1px solid var(--line);color:var(--text-2);padding:9px 12px;font:13px var(--font-body);cursor:pointer"
            >
          </label>
        </div>

        <label style="display:flex;flex-direction:column;gap:8px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:13px;font-weight:600">Contenu CSV ${s.importFileName ? `(${esc(s.importFileName)})` : ''}</span>
            <span style="font-size:12px;color:var(--muted)">Séparateur <code>;</code> ou <code>,</code> supporté</span>
          </div>
          <textarea
            data-field="importCsvContent"
            placeholder="Collez ici le contenu du fichier CSV ou sélectionnez un fichier ci-dessus..."
            rows="11"
            class="input-focus"
            style="background:var(--bg);border:1px solid ${s.importError ? R : 'var(--line)'};color:var(--text);padding:12px 16px;font:13px var(--font-mono);outline:none;resize:vertical;min-height:220px"
          >${esc(s.importCsvContent)}</textarea>
          ${s.importError ? `<span style="font-size:13px;color:var(--error)">${esc(s.importError)}</span>` : ''}
          ${s.importSuccess ? `<span style="font-size:13px;color:var(--success)">${esc(s.importSuccess)}</span>` : ''}
        </label>

        <div style="display:flex;gap:12px;align-items:center">
          <button
            type="button"
            data-action="import-csv"
            ${s.importLoading ? 'disabled' : ''}
            class="hover-accent"
            style="background:var(--accent);color:var(--on-accent);border:0;padding:14px 22px;font:700 15px var(--font-body);cursor:pointer"
          >
            ${s.importLoading ? 'Importation en cours...' : `Importer les équipes (${esc(s.importPromo)}) →`}
          </button>

          <button
            type="button"
            data-action="admin-tab"
            data-tab="equipes"
            style="background:transparent;border:1px solid var(--line-strong);color:var(--text);padding:13px 18px;font:600 14px var(--font-body);cursor:pointer"
          >
            Voir les ${s.teams.length} équipe(s) en base
          </button>
        </div>
      </div>

      <div style="background:var(--surface);border:1px solid var(--line);padding:24px;display:flex;flex-direction:column;gap:16px">
        <div style="font:italic 800 22px/1 'Barlow Condensed',sans-serif;text-transform:uppercase">
          ${s.lastImportedTeams.length > 0 ? 'Dernier import effectué' : 'Formats CSV reconnus'}
        </div>

        ${s.lastImportedTeams.length > 0 ? `
          <div style="display:grid;gap:10px">
            ${s.lastImportedTeams.map(t => `
              <div style="padding:12px 14px;background:var(--bg);border:1px solid var(--line)">
                <div style="display:flex;justify-content:space-between;font-weight:700;font-size:14px;color:var(--text)">
                  <span>${esc(t.name)}</span>
                  <span style="color:var(--success)">${t.players} joueurs</span>
                </div>
                <div style="font-size:12px;color:var(--muted);margin-top:4px">
                  ${esc((t.playersList || []).join(', '))}
                </div>
              </div>
            `).join('')}
          </div>
        ` : `
          <div style="font-size:13px;color:var(--text-2);line-height:1.6">
            <p style="margin:0 0 10px"><strong>1. Format Fiche d'équipe (colonnes par sport) :</strong></p>
            <pre style="background:var(--bg);border:1px solid var(--line);padding:12px;font:12px var(--font-mono);color:var(--muted);overflow-x:auto;margin:0 0 14px">Volleyball 1 (6);Basketball 1 (5);Futsal 1 (7)
Prénom Nom;Prénom Nom;Prénom Nom
Prénom Nom;Prénom Nom;Prénom Nom</pre>
            <p style="margin:0 0 10px"><strong>2. Format Lignes (Sport ; Équipe ; Capitaine ; Joueurs) :</strong></p>
            <pre style="background:var(--bg);border:1px solid var(--line);padding:12px;font:12px var(--font-mono);color:var(--muted);overflow-x:auto;margin:0">Sport;Nom de l'équipe;Prénom Nom du capitaine;Prénom Nom, Prénom Nom, ...</pre>
          </div>
        `}
      </div>
    </div>
  `;
}
