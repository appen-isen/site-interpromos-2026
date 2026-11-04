// Connexion à l'Espace BDS, mot de passe oublié, nouveau mot de passe.
import { state, EDITION } from '../state.js';
import { renderThemeToggle } from '../theme.js';
import { esc } from '../utils.js';
import { R, L } from './ui.js';

function loginField({ id, label, type, field, value, placeholder, autocomplete, error }) {
  return `
    <label style="display:flex;flex-direction:column;gap:8px">
      <span style="font-size:13px;font-weight:600">${label}</span>
      <input
        id="${id}"
        type="${type}"
        data-field="${field}"
        value="${esc(value)}"
        placeholder="${placeholder}"
        autocomplete="${autocomplete}"
        class="input-focus"
        style="background:var(--bg);border:1px solid ${error ? R : L};color:var(--text);padding:14px 16px;font:15px var(--font-body);outline:none"
      >
    </label>
  `;
}

function loginButton(action, label, loading) {
  return `
    <button type="button" data-action="${action}" ${loading ? 'disabled' : ''} class="hover-accent ${loading ? 'is-loading' : ''}"
      style="background:${loading ? 'var(--line-strong)' : 'var(--accent)'};color:var(--on-accent);border:0;padding:15px 20px;font:700 15px var(--font-body);cursor:pointer;text-align:left">
      ${loading ? 'Patientez…' : label}
    </button>
  `;
}

const linkButton = (attrs, label) => `
  <button type="button" ${attrs} style="background:none;border:0;padding:0;color:var(--muted);font:600 13px var(--font-body);cursor:pointer;text-align:left">${label}</button>
`;

export function renderLogin() {
  const s = state;
  const error = s.loginError ? `<span role="alert" style="font-size:13px;color:var(--error)">${esc(s.loginError)}</span>` : '';
  let body;

  if (s.loginMode === 'reset') {
    body = `
      <p style="font-size:14px;color:var(--text-2);line-height:1.6;margin:0">Choisissez un nouveau mot de passe pour votre compte BDS (10 caractères minimum).</p>
      ${loginField({ id: 'admin-new-password', label: 'Nouveau mot de passe', type: 'password', field: 'newPassword', value: s.newPassword, placeholder: '10 caractères minimum', autocomplete: 'new-password', error: s.loginError })}
      ${loginField({ id: 'admin-new-password-2', label: 'Confirmation', type: 'password', field: 'newPasswordConfirm', value: s.newPasswordConfirm, placeholder: 'Saisissez-le à nouveau', autocomplete: 'new-password', error: s.loginError })}
      ${error}
      ${loginButton('save-new-password', 'Enregistrer le mot de passe →', s.loginLoading)}
    `;
  } else if (s.loginMode === 'recover') {
    body = s.recoverySent ? `
      <p style="font-size:14px;color:var(--success-text);line-height:1.6;margin:0;padding:12px 14px;border:1px solid var(--success-line);background:var(--success-bg)">
        Si un compte BDS correspond à cette adresse, un e-mail avec un lien de réinitialisation vient d'être envoyé.
      </p>
      ${linkButton('data-action="login-mode" data-mode="login"', '← Retour à la connexion')}
    ` : `
      <p style="font-size:14px;color:var(--text-2);line-height:1.6;margin:0">Saisissez l'adresse de votre compte BDS : vous recevrez un lien pour choisir un nouveau mot de passe.</p>
      ${loginField({ id: 'admin-login-email', label: 'Adresse e-mail', type: 'email', field: 'loginEmail', value: s.loginEmail, placeholder: 'prenom.nom@…', autocomplete: 'email', error: s.loginError })}
      ${error}
      ${loginButton('send-recovery', 'Envoyer le lien →', s.loginLoading)}
      ${linkButton('data-action="login-mode" data-mode="login"', '← Retour à la connexion')}
    `;
  } else {
    body = `
      <p style="font-size:14px;color:var(--text-2);line-height:1.6;margin:0">
        Connectez-vous avec votre compte BDS pour gérer les scores en direct, les matchs, les équipes et les inscriptions.
      </p>
      ${s.loginNotice ? `<p style="font-size:14px;color:var(--success-text);margin:0;padding:12px 14px;border:1px solid var(--success-line);background:var(--success-bg)">${esc(s.loginNotice)}</p>` : ''}
      ${loginField({ id: 'admin-login-email', label: 'Adresse e-mail', type: 'email', field: 'loginEmail', value: s.loginEmail, placeholder: 'Votre adresse e-mail', autocomplete: 'email', error: s.loginError })}
      ${loginField({ id: 'admin-login-password', label: 'Mot de passe', type: 'password', field: 'loginPassword', value: s.loginPassword, placeholder: 'Votre mot de passe', autocomplete: 'current-password', error: s.loginError })}
      ${error}
      ${loginButton('admin-login', "Se connecter à l'Espace BDS →", s.loginLoading)}
      ${linkButton('data-action="login-mode" data-mode="recover"', 'Mot de passe oublié ?')}
    `;
  }

  return `
    <div style="min-height:100vh;display:grid;place-items:center;padding:20px;background:var(--bg-deep)">
      <div style="background:var(--surface);border:1px solid var(--line);padding:48px;max-width:440px;width:100%;display:flex;flex-direction:column;gap:18px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
          <span style="width:48px;height:48px;background:var(--logo-bg);display:grid;place-items:center">
            <img src="/assets/logo_bds.svg" alt="BDS" style="width:36px;height:36px">
          </span>
          <div>
            <div style="font:italic 800 28px/1 'Barlow Condensed',sans-serif;text-transform:uppercase">Espace BDS</div>
            <div style="font-size:13px;color:var(--muted);margin-top:2px">Administration Interpromos ${esc(EDITION.year)}</div>
          </div>
          ${renderThemeToggle('margin-left:auto')}
        </div>
        ${body}
        <div style="margin-top:4px">${linkButton('data-action="nav" data-page="home"', '← Retour au site public')}</div>
      </div>
    </div>
  `;
}
