// Onglet « Équipes » : création, joueurs, capitaine, effectif.
import { SPORTS, PROMOS } from '../state.js';
import { esc } from '../utils.js';

export function renderAdminTeams(s) {
  const tf = s.teamForm;
  const filteredTeams = s.teams.filter(t => {
    if (s.adminTeamPromoF !== 'Toutes' && t.p !== s.adminTeamPromoF) return false;
    if (s.adminTeamSportF !== 'Tous' && t.sport !== s.adminTeamSportF) return false;
    return true;
  });

  return `
    <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:24px;flex-wrap:wrap">
      <div>
        <h1 style="font:italic 900 52px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;margin:0">Équipes &amp; Joueurs</h1>
        <p style="font-size:14px;color:var(--muted);margin:8px 0 0">Créez et éditez les équipes, augmentez la capacité max de joueurs, et ajoutez, déplacez ou supprimez des joueurs.</p>
      </div>
      <button data-action="admin-tab" data-tab="import" style="background:var(--surface-2);border:1px solid var(--line-strong);color:var(--text);padding:11px 18px;font:600 13px var(--font-body);cursor:pointer">
        Importer des équipes via CSV →
      </button>
    </div>

    <!-- Formulaire de création / édition d'équipe -->
    <div style="background:var(--surface);border:1px solid ${tf.editingId ? 'var(--accent)' : 'var(--line)'};padding:24px;margin-bottom:28px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px">
        <div style="font:italic 800 24px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;color:${tf.editingId ? 'var(--accent)' : 'var(--text)'}">
          ${tf.editingId ? `Modifier l'équipe #${tf.editingId}` : 'Créer une nouvelle équipe'}
        </div>
        ${tf.editingId ? `
          <button data-action="cancel-edit-team" style="background:none;border:1px solid var(--line-strong);color:var(--muted);padding:6px 12px;font:600 12px var(--font-body);cursor:pointer">
            Annuler la modification
          </button>
        ` : ''}
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:14px">
        <label style="display:flex;flex-direction:column;gap:6px">
          <span style="font-size:12px;color:var(--muted);font-weight:600">Promo</span>
          <select data-field="team-promo" style="background:var(--bg);border:1px solid var(--line);color:var(--text);padding:10px 12px;font:14px var(--font-body)">
            ${PROMOS.map(p => `<option value="${esc(p)}" ${tf.promo === p ? 'selected' : ''}>${esc(p)}</option>`).join('')}
          </select>
        </label>

        <label style="display:flex;flex-direction:column;gap:6px">
          <span style="font-size:12px;color:var(--muted);font-weight:600">Sport</span>
          <select data-field="team-si" style="background:var(--bg);border:1px solid var(--line);color:var(--text);padding:10px 12px;font:14px var(--font-body)">
            ${SPORTS.map((sp, idx) => `<option value="${idx}" ${Number(tf.si) === idx ? 'selected' : ''}>${esc(sp)}</option>`).join('')}
          </select>
        </label>

        <label style="display:flex;flex-direction:column;gap:6px">
          <span style="font-size:12px;color:var(--muted);font-weight:600">Nom de l'équipe</span>
          <input type="text" data-field="team-name" value="${esc(tf.name)}" placeholder="Ex: ${esc(tf.promo)} ${esc(SPORTS[tf.si] || 'Football')}" style="background:var(--bg);border:1px solid var(--line);color:var(--text);padding:10px 12px;font:14px var(--font-body)">
        </label>

        <label style="display:flex;flex-direction:column;gap:6px">
          <span style="font-size:12px;color:var(--muted);font-weight:600">Capitaine</span>
          <input type="text" data-field="team-captain" value="${esc(tf.captain)}" placeholder="Nom du capitaine" style="background:var(--bg);border:1px solid var(--line);color:var(--text);padding:10px 12px;font:14px var(--font-body)">
        </label>

        <label style="display:flex;flex-direction:column;gap:6px">
          <span style="font-size:12px;color:var(--muted);font-weight:600">Joueurs Max autorisés</span>
          <input type="number" min="1" max="50" data-field="team-maxPlayers" value="${tf.maxPlayers}" style="background:var(--bg);border:1px solid var(--line);color:var(--text);padding:10px 12px;font:700 14px var(--font-mono)">
        </label>
      </div>

      <label style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px">
        <span style="font-size:12px;color:var(--muted);font-weight:600">Joueurs (séparés par une virgule ou un retour à la ligne)</span>
        <textarea data-field="team-playersText" rows="2" placeholder="Prénom Nom, Prénom Nom, ..." style="background:var(--bg);border:1px solid var(--line);color:var(--text);padding:10px 12px;font:13px var(--font-body);resize:vertical">${esc(tf.playersText)}</textarea>
      </label>

      ${tf.error ? `<div style="margin-bottom:12px;font-size:13px;color:var(--error)">${esc(tf.error)}</div>` : ''}
      ${tf.success ? `<div style="margin-bottom:12px;font-size:13px;color:var(--success)">${esc(tf.success)}</div>` : ''}

      <button data-action="save-team" ${tf.loading ? 'disabled' : ''} class="hover-accent" style="background:var(--accent);color:var(--on-accent);border:0;padding:12px 22px;font:700 14px var(--font-body);cursor:pointer">
        ${tf.loading ? 'Enregistrement...' : tf.editingId ? "Enregistrer les modifications de l'équipe" : '+ Créer cette équipe'}
      </button>
    </div>

    ${s.teamActionError ? `<div style="margin-bottom:16px;padding:12px 16px;background:var(--error-bg);border:1px solid var(--accent);color:var(--error);font-size:13px">${esc(s.teamActionError)}</div>` : ''}
    ${s.teamActionSuccess ? `<div style="margin-bottom:16px;padding:12px 16px;background:var(--success-bg);border:1px solid var(--success);color:var(--success);font-size:13px">${esc(s.teamActionSuccess)}</div>` : ''}

    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px;flex-wrap:wrap">
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <select data-field="adminTeamPromoF" style="padding:8px 16px;background:var(--bg);border:1px solid var(--line);color:var(--text);font:14px var(--font-body)">
          ${['Toutes', ...PROMOS].map(p => `<option value="${esc(p)}" ${s.adminTeamPromoF === p ? 'selected' : ''}>Promo : ${esc(p)}</option>`).join('')}
        </select>
        <select data-field="adminTeamSportF" style="padding:8px 16px;background:var(--bg);border:1px solid var(--line);color:var(--text);font:14px var(--font-body)">
          ${['Tous', ...SPORTS].map(sp => `<option value="${esc(sp)}" ${s.adminTeamSportF === sp ? 'selected' : ''}>Sport : ${esc(sp)}</option>`).join('')}
        </select>
      </div>
      <div style="font-size:13px;color:var(--muted)">${filteredTeams.length} équipe(s) affichée(s)</div>
    </div>

    ${filteredTeams.length === 0 ? `
      <div style="padding:40px;background:var(--surface);border:1px solid var(--line);text-align:center">
        <div style="font:italic 800 26px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;margin-bottom:8px">Aucune équipe enregistrée</div>
        <p style="font-size:14px;color:var(--muted);margin:0">Utilisez le formulaire ci-dessus pour créer une équipe ou importez un fichier CSV.</p>
      </div>
    ` : `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));gap:18px">
        ${filteredTeams.map(t => {
          const pDetails = Array.isArray(t.playersDetails) && t.playersDetails.length > 0
            ? t.playersDetails
            : (t.playersList || []).map((name, idx) => ({ id: null, fullName: name, ordre: idx }));
          const maxP = t.maxPlayers || 10;
          const curP = pDetails.length;
          const otherTeams = s.teams.filter(ot => ot.id !== t.id);

          return `
            <div style="background:var(--surface);border:1px solid var(--line);padding:20px;display:flex;flex-direction:column;gap:14px">
              <!-- En-tête de la carte équipe -->
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">
                <div>
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                    <span style="padding:2px 8px;background:var(--accent);color:var(--on-accent);font-size:12px;font-weight:700">${esc(t.p)}</span>
                    <span style="font-size:13px;color:var(--muted);font-weight:600">${esc(t.sport)}</span>
                    <span style="font-size:12px;color:var(--dim)">· ${esc(t.rec || '0V 0N 0D')}</span>
                  </div>
                  <div style="font:italic 800 24px/1.1 'Barlow Condensed',sans-serif;color:var(--text);text-transform:uppercase">${esc(t.name || `${t.p} ${t.sport}`)}</div>
                </div>
                <div style="display:flex;gap:6px">
                  <button data-action="edit-team" data-id="${t.id}" style="background:var(--surface-2);border:1px solid var(--line-strong);color:var(--text);padding:5px 10px;font-size:12px;font-weight:600;cursor:pointer">
                    Éditer
                  </button>
                  <button data-action="delete-team" data-id="${t.id}" style="background:none;border:1px solid var(--line-strong);color:var(--error);padding:5px 10px;font-size:12px;font-weight:600;cursor:pointer">
                    Suppr.
                  </button>
                </div>
              </div>

              <!-- Capitaine & Contrôle du nombre de joueurs max -->
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:13px;color:var(--text-2);border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:10px 0;flex-wrap:wrap">
                <span>★ Cap. : <strong style="color:var(--text)">${esc(t.captain || 'Non renseigné')}</strong></span>

                <div style="display:flex;align-items:center;gap:6px">
                  <span style="font-size:12px;color:var(--muted)">Joueurs : <strong style="color:${curP >= maxP ? 'var(--accent)' : 'var(--success)'};font-family:var(--font-mono)">${curP} / ${maxP} max</strong></span>
                  <button data-action="team-max-delta" data-id="${t.id}" data-delta="-1" title="Réduire le max de joueurs" style="width:24px;height:24px;background:var(--bg);border:1px solid var(--line-strong);color:var(--text);font-weight:700;cursor:pointer">−</button>
                  <button data-action="team-max-delta" data-id="${t.id}" data-delta="1" title="Augmenter le max de joueurs" style="width:24px;height:24px;background:var(--accent);border:0;color:var(--on-accent);font-weight:700;cursor:pointer">+</button>
                </div>
              </div>

              <!-- Ajout rapide d'un joueur -->
              <div style="display:flex;gap:8px">
                <input
                  type="text"
                  data-field="newTeamPlayer"
                  data-team-id="${t.id}"
                  value="${esc(s.newPlayerInputs[t.id] || '')}"
                  placeholder="Prénom Nom d'un joueur à ajouter..."
                  style="flex:1;min-width:0;background:var(--bg);border:1px solid var(--line);color:var(--text);padding:8px 12px;font-size:13px;outline:none"
                >
                <button
                  type="button"
                  data-action="add-team-player"
                  data-id="${t.id}"
                  class="hover-accent"
                  style="background:var(--accent);color:var(--on-accent);border:0;padding:8px 14px;font:700 12px var(--font-body);cursor:pointer;white-space:nowrap"
                >
                  + Ajouter
                </button>
              </div>

              <!-- Liste des joueurs avec actions : Capitaine, Monter/Descendre, Déplacer vers une autre équipe, Supprimer -->
              <div style="display:flex;flex-direction:column;gap:6px">
                ${pDetails.length === 0 ? `
                  <div style="font-size:12px;color:var(--dim);font-style:italic;padding:8px 0">Aucun joueur inscrit dans cette équipe.</div>
                ` : pDetails.map((pl, idx) => {
                  const isCap = t.captain && pl.fullName.toLowerCase() === t.captain.toLowerCase();
                  return `
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 10px;background:var(--bg);border:1px solid ${isCap ? 'var(--accent)' : 'var(--line)'}">
                      <div style="display:flex;align-items:center;gap:8px;min-width:0;flex:1">
                        <span style="font:700 11px var(--font-mono);color:var(--accent)">#${idx + 1}</span>
                        <span style="font-size:13px;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(pl.fullName)}</span>
                        ${isCap ? `<span style="font-size:10px;background:var(--accent);color:var(--on-accent);padding:1px 5px;font-weight:700">CAP</span>` : ''}
                      </div>

                        <div style="display:flex;align-items:center;gap:4px;flex:none">
                          <button
                            type="button"
                            data-action="move-team-player"
                            data-id="${t.id}"
                            data-participant-id="${pl.id || idx + 1}"
                            data-player-index="${idx}"
                            data-make-captain="true"
                            title="Nommer Capitaine et placer en #1"
                            style="background:var(--surface);border:1px solid var(--line);color:${isCap ? 'var(--accent)' : 'var(--muted)'};padding:3px 6px;font-size:11px;cursor:pointer"
                          >★</button>
                          <button
                            type="button"
                            data-action="move-team-player"
                            data-id="${t.id}"
                            data-participant-id="${pl.id || idx + 1}"
                            data-player-index="${idx}"
                            data-dir="up"
                            ${idx === 0 ? 'disabled' : ''}
                            title="Monter dans la liste"
                            style="background:var(--surface);border:1px solid var(--line);color:var(--text-2);padding:3px 6px;font-size:11px;cursor:pointer;opacity:${idx === 0 ? 0.35 : 1}"
                          >↑</button>
                          <button
                            type="button"
                            data-action="move-team-player"
                            data-id="${t.id}"
                            data-participant-id="${pl.id || idx + 1}"
                            data-player-index="${idx}"
                            data-dir="down"
                            ${idx === pDetails.length - 1 ? 'disabled' : ''}
                            title="Descendre dans la liste"
                            style="background:var(--surface);border:1px solid var(--line);color:var(--text-2);padding:3px 6px;font-size:11px;cursor:pointer;opacity:${idx === pDetails.length - 1 ? 0.35 : 1}"
                          >↓</button>
                          ${otherTeams.length > 0 ? `
                            <select
                              data-field="transferPlayerTeam"
                              data-team-id="${t.id}"
                              data-participant-id="${pl.id || idx + 1}"
                              data-player-index="${idx}"
                              title="Déplacer ce joueur vers une autre équipe"
                              style="background:var(--surface);border:1px solid var(--line);color:var(--muted);padding:2px 4px;font-size:11px;max-width:92px;cursor:pointer"
                            >
                              <option value="">⇄ Déplacer</option>
                              ${otherTeams.map(ot => `<option value="${ot.id}">→ ${esc(ot.name || `${ot.p} ${ot.sport}`)}</option>`).join('')}
                            </select>
                          ` : ''}
                          <button
                            type="button"
                            data-action="remove-team-player"
                            data-id="${t.id}"
                            data-participant-id="${pl.id || idx + 1}"
                            data-player-index="${idx}"
                            title="Retirer ce joueur de l'équipe"
                            style="background:var(--surface);border:1px solid var(--line);color:var(--error);padding:3px 7px;font-size:12px;font-weight:700;cursor:pointer"
                          >×</button>
                        </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `}
  `;
}
