// Onglet « Édition » : année, dates, lieu, contact.
import { DAYS, EDITION } from '../state.js';
import { esc, mapLink } from '../utils.js';
import { R, T, M, L } from './ui.js';

export function renderAdminEdition(s) {
  const f = s.editionForm || { year: String(EDITION.year), start: EDITION.start, time: EDITION.time, venue: EDITION.venue, contact: EDITION.contact || '', instagram: EDITION.instagram || '' };
  const input = `background:var(--bg);border:1px solid ${L};color:${T};padding:11px 12px;font:15px var(--font-body);color-scheme:var(--scheme)`;
  return `
    <h1 style="font:italic 900 56px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;margin:0">Édition du tournoi</h1>
    <p style="font-size:14px;color:${M};margin:8px 0 28px;max-width:720px">
      L'année et les dates s'affichent partout sur le site : en-tête, compte à rebours, jours du planning, inscription et numéros de dossier.
      Le tournoi dure ${DAYS.length} jours à partir de la date du premier jour.
    </p>

    <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:28px;align-items:start;max-width:1100px">
      <div style="background:var(--surface);border:1px solid ${L};padding:24px;display:flex;flex-direction:column;gap:16px">
        <div style="display:grid;grid-template-columns:140px minmax(0,1fr) 120px;gap:12px">
          <label style="display:flex;flex-direction:column;gap:6px;font-size:12px;color:${M}">
            Année
            <input data-field="editionForm-year" type="number" min="2000" max="2100" value="${esc(f.year)}" style="${input}">
          </label>
          <label style="display:flex;flex-direction:column;gap:6px;font-size:12px;color:${M}">
            Premier jour
            <input data-field="editionForm-start" type="date" value="${esc(f.start)}" style="${input}">
          </label>
          <label style="display:flex;flex-direction:column;gap:6px;font-size:12px;color:${M}">
            Coup d'envoi
            <input data-field="editionForm-time" type="time" value="${esc(f.time)}" style="${input}">
          </label>
        </div>
        <label style="display:flex;flex-direction:column;gap:6px;font-size:12px;color:${M}">
          Lieu (nom ou adresse : le site ouvre la carte de ce lieu)
          <input data-field="editionForm-venue" maxlength="80" value="${esc(f.venue)}" placeholder="Ex : ISEN Nantes" style="${input}">
        </label>
        <label style="display:flex;flex-direction:column;gap:6px;font-size:12px;color:${M}">
          E-mail de contact affiché sur le site (facultatif)
          <input data-field="editionForm-contact" type="email" maxlength="120" value="${esc(f.contact)}" placeholder="Laisser vide pour ne rien afficher" style="${input}">
        </label>
        <label style="display:flex;flex-direction:column;gap:6px;font-size:12px;color:${M}">
          Compte Instagram du BDS (bouton « Suivre » et pied de page, facultatif)
          <input data-field="editionForm-instagram" maxlength="80" value="${esc(f.instagram)}" placeholder="Ex : @bds_isen_nantes ou lien du profil" style="${input}">
        </label>
        <p style="font-size:12px;color:${M};margin:0">Changer l'année décale automatiquement la date du premier jour sur la même date de la nouvelle année.</p>
        ${f.error ? `<div role="alert" style="padding:10px 12px;border:1px solid ${R};background:var(--error-bg);color:var(--error-text);font-size:13px">${esc(f.error)}</div>` : ''}
        ${f.success ? `<div style="padding:10px 12px;border:1px solid var(--success-line);background:var(--success-bg);color:var(--success-text);font-size:13px">${esc(f.success)}</div>` : ''}
        <button data-action="save-edition" class="hover-accent ${f.loading ? 'is-loading' : ''}" ${f.loading ? 'disabled' : ''} style="align-self:flex-start;background:${f.loading ? 'var(--line-strong)' : R};color:var(--on-accent);border:0;padding:13px 20px;font:700 14px var(--font-body);cursor:pointer">
          ${f.loading ? 'Enregistrement…' : "Enregistrer l'édition"}
        </button>
      </div>

      <div style="background:var(--surface);border:1px solid ${L};padding:24px">
        <div style="font-size:12px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:${R};margin-bottom:8px">Édition en ligne</div>
        <div style="font:italic 900 44px/1 'Barlow Condensed',sans-serif;text-transform:uppercase">Interpromos ${esc(EDITION.year)}</div>
        <div style="font-size:15px;color:var(--text-2);margin:8px 0 18px">${esc(EDITION.range)} · ${mapLink(EDITION.venue)} · coup d'envoi ${esc(EDITION.time)}${EDITION.contact ? ` · ${esc(EDITION.contact)}` : ''}</div>
        ${DAYS.map(day => `
          <div style="display:flex;justify-content:space-between;padding:10px 0;border-top:1px solid ${L};font-size:14px">
            <span>${esc(day[0])}</span><span style="color:${M}">${esc(day[1])} · ${esc(day[2])}</span>
          </div>
        `).join('')}
        <p style="font-size:12px;color:${M};margin:16px 0 0">Les matchs, équipes, inscriptions et albums existants ne sont pas modifiés : les matchs restent rattachés à leur jour (J1, J2, J3).</p>
      </div>
    </div>
  `;
}
