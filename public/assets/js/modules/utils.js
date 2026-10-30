export function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

export function getAuthHeaders(extraHeaders = {}) {
  const headers = { ...extraHeaders };
  const token = sessionStorage.getItem('ip_bds_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export function calcStandings(doneMatches, SPORTS, PROMOS, MASCOT) {
  const st = {};
  PROMOS.forEach(p => {
    st[p] = { p, pts: 0, v: 0, n: 0, l: 0, per: SPORTS.map(() => 0) };
  });
  doneMatches.forEach(m => {
    const [x, y] = m.scores;
    const A = st[m.a];
    const B = st[m.b];
    if (!A || !B) return;
    if (x > y) {
      A.v++;
      B.l++;
      A.pts += 3;
      if (A.per[m.si] !== undefined) A.per[m.si] += 3;
    } else if (x < y) {
      B.v++;
      A.l++;
      B.pts += 3;
      if (B.per[m.si] !== undefined) B.per[m.si] += 3;
    } else {
      A.n++;
      B.n++;
      A.pts++;
      B.pts++;
      if (A.per[m.si] !== undefined) A.per[m.si]++;
      if (B.per[m.si] !== undefined) B.per[m.si]++;
    }
  });
  const rank = Object.values(st).sort((a, b) => b.pts - a.pts || b.v - a.v);
  const max = Math.max(1, rank[0]?.pts || 0);
  return rank.map((r, i) => ({
    ...r,
    pos: i + 1,
    mascot: MASCOT[r.p] || '',
    rec: `${r.v} · ${r.n} · ${r.l}`,
    w: `${Math.round((r.pts / max) * 100)}%`,
    col: i === 0 && r.pts > 0 ? 'var(--accent)' : 'var(--text)',
    per: r.per.map(v => ({ v, col: v ? 'var(--text)' : 'var(--dim)' }))
  }));
}
