// Onglet « Matchs » : programmer un match entre deux équipes, liste et filtres.
import { DAYS, SPORTS, PROMOS, MASCOT, VENUE } from '../state.js';
import { esc, teamTag } from '../utils.js';

// Équipes du sport choisi, regroupées par promo (les inscriptions refusées ou en attente ne sont pas proposées)
function renderTeamSelect(s, mf, key, label) {
  const other = key === 'teamA' ? mf.teamB : mf.teamA;
  const teams = s.teams.filter(t => Number(t.si) === Number(mf.si));
  const byPromo = PROMOS.map(p => [p, teams.filter(t => t.p === p)]).filter(([, list]) => list.length > 0);
  return `
    <label style="display:flex;flex-direction:column;gap:6px">
      <span style="font-size:12px;color:var(--muted);font-weight:600">${label}</span>
      <select data-field="match-${key}" style="background:var(--bg);border:1px solid ${mf.error && !mf[key] ? 'var(--accent)' : 'var(--line)'};color:var(--text);padding:10px 12px;font:14px var(--font-body)">
        <option value="" ${!mf[key] ? 'selected' : ''}>${teams.length ? 'Choisir une équipe…' : 'Aucune équipe dans ce sport'}</option>
        ${byPromo.map(([promo, list]) => `
          <optgroup label="${esc(promo)}${MASCOT[promo] ? ` · ${esc(MASCOT[promo])}` : ''}">
            ${list.map(t => `<option value="${esc(t.id)}" ${mf[key] === String(t.id) ? 'selected' : ''} ${other === String(t.id) ? 'disabled' : ''}>${esc(t.name)} (${esc(promo)})</option>`).join('')}
          </optgroup>
        `).join('')}
      </select>
    </label>
  `;
}

export function renderAdminMatches(d) {
  const { s, ms, byTime } = d;
  const mf = s.matchForm;

  const filteredMatches = ms
    .filter(m => {
      if (s.adminMatchDayF !== 'Tous' && m.d !== Number(s.adminMatchDayF)) return false;
      if (s.adminMatchSportF !== 'Tous' && m.sport !== s.adminMatchSportF) return false;
      if (s.adminMatchStatusF !== 'Tous' && m.status !== s.adminMatchStatusF) return false;
      return true;
    })
    .sort(byTime);

  return `
    <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:24px;flex-wrap:wrap">
      <div>
        <h1 style="font:italic 900 52px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;margin:0">Gestion des matchs</h1>
        <p style="font-size:14px;color:var(--muted);margin:8px 0 0">Programmez, modifiez ou supprimez les rencontres du tournoi Interpromos.</p>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button data-action="generate-matches" ${mf.loading ? 'disabled' : ''} style="background:var(--surface-2);border:1px solid var(--line-strong);color:var(--text);padding:11px 16px;font:600 13px var(--font-body);cursor:pointer">
          ⚡ Générer les qualifications (équipes inscrites)
        </button>
      </div>
    </div>

    <!-- Formulaire de création / édition de match -->
    <div style="background:var(--surface);border:1px solid ${mf.editingId ? 'var(--accent)' : 'var(--line)'};padding:24px;margin-bottom:32px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px">
        <div style="font:italic 800 24px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;color:${mf.editingId ? 'var(--accent)' : 'var(--text)'}">
          ${mf.editingId ? `Modifier le match (${esc(mf.editingId)})` : 'Programmer un nouveau match'}
        </div>
        ${mf.editingId ? `
          <button data-action="cancel-edit-match" style="background:none;border:1px solid var(--line-strong);color:var(--muted);padding:6px 12px;font:600 12px var(--font-body);cursor:pointer">
            Annuler la modification
          </button>
        ` : ''}
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;margin-bottom:16px">
        <label style="display:flex;flex-direction:column;gap:6px">
          <span style="font-size:12px;color:var(--muted);font-weight:600">Jour</span>
          <select data-field="match-d" style="background:var(--bg);border:1px solid var(--line);color:var(--text);padding:10px 12px;font:14px var(--font-body)">
            ${DAYS.map((day, idx) => `<option value="${idx}" ${Number(mf.d) === idx ? 'selected' : ''}>${esc(day[2])} · ${esc(day[0])}</option>`).join('')}
          </select>
        </label>

        <label style="display:flex;flex-direction:column;gap:6px">
          <span style="font-size:12px;color:var(--muted);font-weight:600">Heure</span>
          <input type="time" data-field="match-t" value="${esc(mf.t)}" style="background:var(--bg);border:1px solid var(--line);color:var(--text);padding:10px 12px;font:14px var(--font-body)">
        </label>

        <label style="display:flex;flex-direction:column;gap:6px">
          <span style="font-size:12px;color:var(--muted);font-weight:600">Sport</span>
          <select data-field="match-si" style="background:var(--bg);border:1px solid var(--line);color:var(--text);padding:10px 12px;font:14px var(--font-body)">
            ${SPORTS.map((sp, idx) => `<option value="${idx}" ${Number(mf.si) === idx ? 'selected' : ''}>${esc(sp)}</option>`).join('')}
          </select>
        </label>

        ${renderTeamSelect(s, mf, 'teamA', 'Équipe A')}
        ${renderTeamSelect(s, mf, 'teamB', 'Équipe B')}

        <label style="display:flex;flex-direction:column;gap:6px">
          <span style="font-size:12px;color:var(--muted);font-weight:600">Phase</span>
          <select data-field="match-phase" style="background:var(--bg);border:1px solid var(--line);color:var(--text);padding:10px 12px;font:14px var(--font-body)">
            ${['Qualification', 'Petite finale', 'Finale'].map(ph => `<option value="${ph}" ${mf.phase === ph ? 'selected' : ''}>${ph}</option>`).join('')}
          </select>
        </label>

        <label style="display:flex;flex-direction:column;gap:6px">
          <span style="font-size:12px;color:var(--muted);font-weight:600">Lieu / Terrain</span>
          <input type="text" data-field="match-venue" value="${esc(mf.venue)}" placeholder="${esc(VENUE[mf.si] || 'Gymnase')}" style="background:var(--bg);border:1px solid var(--line);color:var(--text);padding:10px 12px;font:14px var(--font-body)">
        </label>

        <label style="display:flex;flex-direction:column;gap:6px">
          <span style="font-size:12px;color:var(--muted);font-weight:600">Statut</span>
          <select data-field="match-status" style="background:var(--bg);border:1px solid var(--line);color:var(--text);padding:10px 12px;font:14px var(--font-body)">
            <option value="up" ${mf.status === 'up' ? 'selected' : ''}>À venir</option>
            <option value="live" ${mf.status === 'live' ? 'selected' : ''}>En direct</option>
            <option value="done" ${mf.status === 'done' ? 'selected' : ''}>Terminé</option>
          </select>
        </label>

        <label style="display:flex;flex-direction:column;gap:6px">
          <span style="font-size:12px;color:var(--muted);font-weight:600">Score (A - B)</span>
          <div style="display:flex;gap:6px;align-items:center">
            <input type="number" min="0" data-field="match-scoreA" value="${mf.scoreA}" style="width:100%;background:var(--bg);border:1px solid var(--line);color:var(--text);padding:10px;font:14px var(--font-body)">
            <span style="color:var(--muted)">-</span>
            <input type="number" min="0" data-field="match-scoreB" value="${mf.scoreB}" style="width:100%;background:var(--bg);border:1px solid var(--line);color:var(--text);padding:10px;font:14px var(--font-body)">
          </div>
        </label>
      </div>

      ${mf.error ? `<div style="margin-bottom:12px;font-size:13px;color:var(--error)">${esc(mf.error)}</div>` : ''}
      ${mf.success ? `<div style="margin-bottom:12px;font-size:13px;color:var(--success)">${esc(mf.success)}</div>` : ''}

      <button data-action="save-match" ${mf.loading ? 'disabled' : ''} class="hover-accent" style="background:var(--accent);color:var(--on-accent);border:0;padding:12px 22px;font:700 14px var(--font-body);cursor:pointer">
        ${mf.loading ? 'Enregistrement...' : mf.editingId ? 'Enregistrer les modifications' : '+ Programmer ce match'}
      </button>
    </div>

    <!-- Filtres de la liste des matchs -->
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px;flex-wrap:wrap">
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <select data-field="adminMatchDayF" style="padding:8px 14px;background:var(--bg);border:1px solid var(--line);color:var(--text);font:13px var(--font-body)">
          <option value="Tous" ${s.adminMatchDayF === 'Tous' ? 'selected' : ''}>Tous les jours</option>
          ${DAYS.map((day, idx) => `<option value="${idx}" ${String(s.adminMatchDayF) === String(idx) ? 'selected' : ''}>${esc(day[2])} · ${esc(day[0])}</option>`).join('')}
        </select>

        <select data-field="adminMatchSportF" style="padding:8px 14px;background:var(--bg);border:1px solid var(--line);color:var(--text);font:13px var(--font-body)">
          <option value="Tous" ${s.adminMatchSportF === 'Tous' ? 'selected' : ''}>Tous les sports</option>
          ${SPORTS.map(sp => `<option value="${esc(sp)}" ${s.adminMatchSportF === sp ? 'selected' : ''}>${esc(sp)}</option>`).join('')}
        </select>

        <select data-field="adminMatchStatusF" style="padding:8px 14px;background:var(--bg);border:1px solid var(--line);color:var(--text);font:13px var(--font-body)">
          <option value="Tous" ${s.adminMatchStatusF === 'Tous' ? 'selected' : ''}>Tous les statuts</option>
          <option value="up" ${s.adminMatchStatusF === 'up' ? 'selected' : ''}>À venir</option>
          <option value="live" ${s.adminMatchStatusF === 'live' ? 'selected' : ''}>En direct</option>
          <option value="done" ${s.adminMatchStatusF === 'done' ? 'selected' : ''}>Terminé</option>
        </select>
      </div>
      <div style="font-size:13px;color:var(--muted)">${filteredMatches.length} match(s) affiché(s)</div>
    </div>

    ${filteredMatches.length === 0 ? `
      <div style="padding:36px;background:var(--surface);border:1px solid var(--line);text-align:center;color:var(--muted)">
        Aucun match ne correspond aux filtres sélectionnés. Utilisez le formulaire ci-dessus ou cliquez sur « Générer les qualifications ».
      </div>
    ` : `
      <div style="display:grid;gap:8px">
        ${filteredMatches.map(m => `
          <div style="display:grid;grid-template-columns:85px 140px minmax(0,1fr) 110px 100px 210px;gap:14px;align-items:center;padding:14px 18px;background:var(--surface);border:1px solid var(--line)">
            <div>
              <div style="font-size:14px;font-weight:700;color:var(--text)">${esc(m.dayShort)} · ${esc(m.t)}</div>
              <div style="font-size:11px;color:var(--muted)">${esc(m.phase || 'Qualification')}</div>
            </div>
            <div>
              <div style="font-size:14px;font-weight:600;color:var(--text)">${esc(m.sport)}</div>
              <div style="font-size:11px;color:var(--muted)">${esc(m.venue || '')}</div>
            </div>
            <div style="font-size:15px;font-weight:700;color:var(--text)">
              ${teamTag(m.teamAName, m.a)} <span style="color:var(--muted);font-weight:400">vs</span> ${teamTag(m.teamBName, m.b)}
            </div>
            <div style="font:italic 800 22px/1 'Barlow Condensed',sans-serif;color:${m.scCol}">
              ${m.sa} – ${m.sb}
            </div>
            <div>
              <span style="display:inline-block;padding:4px 8px;font-size:11px;font-weight:700;text-transform:uppercase;background:${m.tagBg};color:${m.tagFg};border:1px solid ${m.tagBd}">
                ${esc(m.tag)}
              </span>
            </div>
            <div style="display:flex;gap:6px;justify-content:flex-end">
              <button data-action="edit-match" data-id="${esc(m.id)}" style="padding:6px 10px;background:var(--surface-2);border:1px solid var(--line-strong);color:var(--text);font:600 12px var(--font-body);cursor:pointer">
                Modifier
              </button>
              <button data-action="match-status" data-id="${esc(m.id)}" data-status="${m.status === 'live' ? 'done' : 'live'}" style="padding:6px 10px;background:${m.status === 'live' ? 'var(--line)' : 'var(--accent)'};border:0;color:${m.status === 'live' ? 'var(--text)' : 'var(--on-accent)'};font:600 12px var(--font-body);cursor:pointer">
                ${m.status === 'live' ? 'Terminer' : 'Live'}
              </button>
              <button data-action="delete-match" data-id="${esc(m.id)}" style="padding:6px 10px;background:transparent;border:1px solid var(--line-strong);color:var(--error);font:600 12px var(--font-body);cursor:pointer">
                Suppr.
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `}
  `;
}
