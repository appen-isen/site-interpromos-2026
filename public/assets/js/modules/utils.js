export function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Nom d'équipe suivi de sa promo : « FC Les Bits  A1 »
export function teamTag(name, promo) {
  const label = String(name || promo || '').trim();
  const showPromo = promo && label.toUpperCase() !== String(promo).toUpperCase();
  return `${esc(label)}${showPromo ? ` <span class="promo-tag">${esc(promo)}</span>` : ''}`;
}

// Lien vers la carte (sur téléphone, ouvre l'application Google Maps)
export function mapUrl(place) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
}

// Adresse cliquable qui ouvre la carte dans un nouvel onglet
export function mapLink(place, style = 'color:inherit;text-decoration:underline;text-underline-offset:3px') {
  return `<a href="${esc(mapUrl(place))}" target="_blank" rel="noopener noreferrer" title="Voir ${esc(place)} sur la carte" style="${style}">${esc(place)}</a>`;
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Situe un album daté par rapport à aujourd'hui : 'present' | 'future' | 'past' | 'none' (sans date)
 */
export function albumPeriod(album) {
  if (!album?.start) return 'none';
  const today = todayIso();
  const end = album.end || album.start;
  if (album.start > today) return 'future';
  if (end < today) return 'past';
  return 'present';
}

export const PERIOD_LABELS = {
  present: 'En cours',
  future: 'À venir',
  past: 'Passés',
  none: 'Autres'
};

const DATE_FMT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

export function formatAlbumDates(album) {
  if (!album?.start) return '';
  const fmt = iso => DATE_FMT.format(new Date(`${iso}T12:00:00`));
  return album.end && album.end !== album.start ? `${fmt(album.start)} → ${fmt(album.end)}` : fmt(album.start);
}

/**
 * Regroupe les albums par période ; à venir / en cours du plus proche au plus lointain, passés du plus récent au plus ancien
 */
export function groupAlbumsByPeriod(albums) {
  const groups = { present: [], future: [], past: [], none: [] };
  for (const a of albums) groups[albumPeriod(a)].push(a);
  groups.past.sort((a, b) => (b.end || b.start).localeCompare(a.end || a.start));
  return ['present', 'future', 'past', 'none']
    .filter(key => groups[key].length > 0)
    .map(key => ({ key, label: PERIOD_LABELS[key], albums: groups[key] }));
}

// « 3 novembre à 13:00 » (heure de Paris)
const PARIS_DATETIME = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
export function formatParisDateTime(iso) {
  return iso ? PARIS_DATETIME.format(new Date(iso)) : '';
}

export function getAuthHeaders(extraHeaders = {}) {
  const headers = { ...extraHeaders };
  const token = sessionStorage.getItem('ip_bds_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Classement par équipe, calculé localement (secours si l'API des classements ne répond pas)
 */
export function calcTeamStandings(doneMatches, teams) {
  const st = new Map(teams.map(t => [String(t.id), { id: t.id, team: t.name, p: t.p, si: t.si, sport: t.sport, pts: 0, v: 0, n: 0, l: 0 }]));
  for (const m of doneMatches) {
    const A = st.get(String(m.teamAId));
    const B = st.get(String(m.teamBId));
    if (!A || !B) continue;
    const [x, y] = m.scores || [0, 0];
    if (x > y) { A.v++; B.l++; A.pts += 3; }
    else if (x < y) { B.v++; A.l++; B.pts += 3; }
    else { A.n++; B.n++; A.pts++; B.pts++; }
  }
  return [...st.values()]
    .sort((a, b) => b.pts - a.pts || b.v - a.v || a.l - b.l || String(a.team).localeCompare(String(b.team)))
    .map((r, i) => ({ ...r, pos: i + 1 }));
}
