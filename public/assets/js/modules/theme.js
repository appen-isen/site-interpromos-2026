// Thème clair / sombre.
// Par défaut, le site est en thème clair ; un choix fait avec le bouton ☀ / ☾ est mémorisé.
// Le thème est appliqué dès le chargement par un petit script dans <head> (pas de flash au démarrage).

const STORAGE_KEY = 'ip_theme';

function savedTheme() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch (e) {
    return null;
  }
}

export function currentTheme() {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  // Couleur de la barre du navigateur sur mobile
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
}

export function toggleTheme() {
  const next = currentTheme() === 'light' ? 'dark' : 'light';
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch (e) {}
  const root = document.documentElement;
  root.classList.add('theme-transition');
  applyTheme(next);
  setTimeout(() => root.classList.remove('theme-transition'), 300);
}

/** Applique le thème mémorisé, sinon le thème clair. */
export function initTheme() {
  applyTheme(savedTheme() || 'light');
}

/** Bouton ☀ / ☾ affiché dans l'en-tête et dans l'Espace BDS. */
export function renderThemeToggle(extraStyle = '') {
  const light = currentTheme() === 'light';
  const label = light ? 'Passer en mode sombre' : 'Passer en mode clair';
  return `
    <button type="button" data-action="toggle-theme" class="theme-toggle" aria-label="${label}" title="${label}" aria-pressed="${light}" style="${extraStyle}">
      <span aria-hidden="true">${light ? '☾' : '☀'}</span>
    </button>
  `;
}
