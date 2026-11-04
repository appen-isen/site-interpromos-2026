// Onglet « Inscriptions » : ouverture / clôture et validation des dossiers.
import { EDITION, registrationStatus } from '../state.js';
import { esc, formatParisDateTime } from '../utils.js';
import { R, T, M, L } from './ui.js';

// Ouverture / clôture du formulaire public : interrupteur du BDS + échéance (à défaut, le coup d'envoi)
function renderRegistrationControl(s) {
  const st = registrationStatus();
  const f = s.regSettings;
  const deadlineValue = f.deadline ?? st.deadlineLocal ?? '';
  const when = formatParisDateTime(st.closesAt);
  const statusText = st.open
    ? `Ouvertes · clôture automatique le ${esc(when)}${st.deadline ? '' : " (coup d'envoi)"}`
    : st.reason === 'manual' ? 'Fermées par le BDS'
    : st.reason === 'deadline' ? `Closes depuis l'échéance du ${esc(when)}`
    : `Closes depuis le coup d'envoi (${esc(when)})`;
  const tone = st.open ? 'var(--success)' : R;
  const input = `background:var(--bg);border:1px solid ${L};color:${T};padding:10px 12px;font:14px var(--font-body);color-scheme:var(--scheme)`;
  const ghost = `background:none;border:1px solid var(--line-strong);color:${T};padding:10px 14px;font:600 13px var(--font-body);cursor:pointer`;

  return `
    <section style="background:var(--surface);border:1px solid ${L};border-left:4px solid ${tone};padding:20px 24px;margin-bottom:28px;display:flex;flex-direction:column;gap:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap">
        <div>
          <div style="font-size:12px;color:${M};margin-bottom:4px">Formulaire d'inscription public</div>
          <div style="display:flex;align-items:center;gap:10px;font-weight:700;font-size:16px">
            <span aria-hidden="true" style="width:10px;height:10px;border-radius:50%;background:${tone}"></span>
            ${statusText}
          </div>
          ${!st.open && st.reason !== 'manual' ? `<div style="font-size:12px;color:${M};margin-top:6px">Pour rouvrir, choisissez une échéance plus tardive.</div>` : ''}
        </div>
        <button data-action="reg-toggle-open" ${f.loading ? 'disabled' : ''} class="${st.manualOpen ? '' : 'hover-accent'} ${f.loading ? 'is-loading' : ''}" style="${st.manualOpen ? ghost : `background:${R};color:var(--on-accent);border:0;padding:11px 16px;font:700 13px var(--font-body);cursor:pointer`}">
          ${st.manualOpen ? 'Fermer les inscriptions' : 'Rouvrir les inscriptions'}
        </button>
      </div>
      <div style="display:flex;align-items:flex-end;gap:10px;flex-wrap:wrap;border-top:1px solid ${L};padding-top:16px">
        <label style="display:flex;flex-direction:column;gap:6px;font-size:12px;color:${M}">
          Clôture automatique le (heure de Paris)
          <input data-field="regSettings-deadline" type="datetime-local" value="${esc(deadlineValue)}" style="${input}">
        </label>
        <button data-action="reg-save-deadline" ${f.loading ? 'disabled' : ''} class="hover-accent" style="background:${R};color:var(--on-accent);border:0;padding:11px 16px;font:700 13px var(--font-body);cursor:pointer">Enregistrer l'échéance</button>
        ${st.deadline ? `<button data-action="reg-clear-deadline" ${f.loading ? 'disabled' : ''} style="${ghost}">Clôturer au coup d'envoi</button>` : ''}
      </div>
      <p style="font-size:12px;color:${M};margin:0">Sans échéance, les inscriptions se ferment automatiquement au coup d'envoi du tournoi (${esc(formatParisDateTime(EDITION.startsAt))}).</p>
      ${f.error ? `<div role="alert" style="padding:10px 12px;border:1px solid ${R};background:var(--error-bg);color:var(--error-text);font-size:13px">${esc(f.error)}</div>` : ''}
      ${f.success ? `<div style="padding:10px 12px;border:1px solid var(--success-line);background:var(--success-bg);color:var(--success-text);font-size:13px">${esc(f.success)}</div>` : ''}
    </section>
  `;
}

export function renderAdminInscriptions(s, regTone) {
  const pending = s.regs.filter(r => r.status === 'En attente').length;

  return `
    <h1 style="font:italic 900 52px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;margin:0 0 24px">Inscriptions reçues</h1>
    ${renderRegistrationControl(s)}
    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border:1px solid var(--line);margin-bottom:28px;background:var(--surface)">
      <div style="padding:20px 24px;border-right:1px solid var(--line)">
        <div style="font-size:12px;color:var(--muted);margin-bottom:4px">En attente</div>
        <div style="font:italic 800 32px/1 'Barlow Condensed',sans-serif;color:var(--accent)">${pending}</div>
      </div>
      <div style="padding:20px 24px;border-right:1px solid var(--line)">
        <div style="font-size:12px;color:var(--muted);margin-bottom:4px">Validées</div>
        <div style="font:italic 800 32px/1 'Barlow Condensed',sans-serif">${s.regs.filter(r => r.status === 'Validée').length}</div>
      </div>
      <div style="padding:20px 24px">
        <div style="font-size:12px;color:var(--muted);margin-bottom:4px">Refusées</div>
        <div style="font:italic 800 32px/1 'Barlow Condensed',sans-serif">${s.regs.filter(r => r.status === 'Refusée').length}</div>
      </div>
    </div>

    ${s.regActionError ? `
      <div role="alert" style="padding:12px 16px;margin-bottom:16px;border:1px solid ${R};background:var(--error-bg);color:var(--error-text);font-size:14px">${esc(s.regActionError)}</div>
    ` : ''}

    ${s.regs.length === 0 ? `
      <div style="padding:36px;background:var(--surface);border:1px solid var(--line);text-align:center;color:var(--muted)">
        Aucune inscription soumise via le formulaire public pour le moment.
      </div>
    ` : `
      <div style="display:grid;grid-template-columns:70px minmax(0,1.4fr) 110px minmax(0,1.6fr) 90px 110px 160px;gap:14px;padding:10px 16px;font-size:12px;color:var(--muted);border-bottom:2px solid var(--line)">
        <span>Promo</span><span>Équipe &amp; Capitaine</span><span>Sport</span><span>Joueurs inscrits</span><span>Date</span><span>Statut</span><span>Actions</span>
      </div>

      ${s.regs.map(r => {
        const [bg, fg, bd] = regTone[r.status] || [T, 'var(--bg)', T];
        const pList = Array.isArray(r.playersList) ? r.playersList : [];
        return `
          <div style="display:grid;grid-template-columns:70px minmax(0,1.4fr) 110px minmax(0,1.6fr) 90px 110px 160px;gap:14px;align-items:center;padding:14px 16px;border-bottom:1px solid var(--line);background:var(--surface)">
            <span style="font-weight:700;color:var(--accent)">${esc(r.promo)}</span>
            <div>
              <div style="font-weight:700;color:var(--text)">${esc(r.team)}</div>
              <div style="font-size:12px;color:var(--muted)">${esc(r.captain)}${r.email ? ` · ${esc(r.email)}` : ''}</div>
            </div>
            <span style="color:var(--text)">${esc(r.sport)}</span>
            <div style="font-size:12px;color:var(--text-2)">
              <strong>${r.players} j.</strong> : ${pList.length > 0 ? esc(pList.join(', ')) : '—'}
            </div>
            <span style="font-size:12px;color:var(--muted)">${esc(r.date || '')}</span>
            <span style="justify-self:start;padding:3px 9px;font-size:12px;font-weight:700;background:${bg};color:${fg};border:1px solid ${bd}">${esc(r.status)}</span>
            <div style="display:flex;gap:6px">
              ${r.status !== 'Validée' ? `
                <button data-action="reg-status" data-id="${r.id}" data-status="Validée" class="hover-accent" style="background:var(--accent);border:0;color:var(--on-accent);padding:7px 12px;font:700 12px var(--font-body);cursor:pointer">Valider</button>
              ` : ''}
              ${r.status !== 'Refusée' ? `
                <button data-action="reg-status" data-id="${r.id}" data-status="Refusée" style="background:none;border:1px solid var(--line-strong);color:var(--text);padding:6px 12px;font:600 12px var(--font-body);cursor:pointer">Refuser</button>
              ` : ''}
              ${r.status === 'Refusée' ? `
                <button data-action="delete-registration" data-id="${r.id}" data-team="${esc(r.team)}" title="Supprimer l'inscription" style="background:none;border:1px solid ${R};color:${R};padding:6px 10px;font:600 12px var(--font-body);cursor:pointer">Suppr.</button>
              ` : ''}
            </div>
          </div>
        `;
      }).join('')}
    `}
  `;
}
