export let SPORTS = ['Football', 'Basket', 'Volley', 'Handball', 'Badminton', 'Lutte'];
export let SHORT = ['Foot', 'Basket', 'Volley', 'Hand', 'Bad', 'Lutte'];
export let VENUE = ['Terrain synthétique', 'Gymnase A', 'Gymnase B', 'Gymnase A', 'Gymnase B', 'Terrain synthétique'];
export let SIZE = [7, 5, 6, 7, 2, 7];
export let PROMOS = ['A1', 'A2', 'A3', 'A4', 'A5'];
export let MASCOT = { A1: 'Les Bits', A2: 'Les Diodes', A3: 'Les Ohms', A4: 'Kernel Panic', A5: 'Root Access' };
// Jours du tournoi : remplacés au chargement par ceux de l'édition configurée dans l'Espace BDS
export let DAYS = [
  ['Jour 1', 'Qualifs J1', 'J1'],
  ['Jour 2', 'Qualifs J2', 'J2'],
  ['Jour 3', 'Finales', 'J3']
];

// Édition en cours (année, dates, lieu), fournie par l'API (config.edition)
export let EDITION = {
  year: new Date().getFullYear(),
  shortYear: String(new Date().getFullYear()).slice(-2),
  start: '',
  end: '',
  time: '13:00',
  venue: 'ISEN Nantes',
  contact: null,
  instagram: null,
  startsAt: '',
  range: '',
  days: DAYS
};
export let ALBUMS = [
  'Cérémonie & Ambiance',
  'Qualifications J1',
  'Qualifications J2',
  'Finales & Podiums'
];

export const VALID_PAGES = ['home', 'planning', 'resultats', 'equipes', 'inscription', 'galerie', 'admin'];

// Page d'entrée du fichier HTML ouvert (index.html = accueil, tournoi.html = planning…)
export function entryPage() {
  const bodyPage = document.body?.dataset?.initialPage;
  return VALID_PAGES.includes(bodyPage) ? bodyPage : 'home';
}

/**
 * Page à afficher d'après l'adresse : #planning, #galerie… ou la page d'entrée du fichier HTML.
 * L'Espace BDS ne s'ouvre que via l'adresse #admin (bouton « Espace BDS »), jamais par défaut.
 */
export function pageFromLocation() {
  const hash = window.location.hash.replace('#', '').trim();
  return VALID_PAGES.includes(hash) ? hash : entryPage();
}

function detectInitialPage() {
  // Ancienne mémorisation de la dernière page (pouvait rouvrir la connexion BDS à chaque visite)
  try {
    localStorage.removeItem('ip_page');
  } catch (e) {}
  return pageFromLocation();
}

function getStoredToken() {
  try {
    return sessionStorage.getItem('ip_bds_token') || null;
  } catch (e) {
    return null;
  }
}

function emptyForm() {
  return {
    sport: 0,
    promo: PROMOS[0] || 'A1',
    team: '',
    captain: '',
    email: '',
    players: Array(SIZE[0] || 5).fill(''),
    rules: false
  };
}

export function emptyMatchForm() {
  return {
    editingId: null,
    d: 0,
    t: '13:30',
    si: 0,
    a: PROMOS[0] || 'A1',
    b: PROMOS[1] || 'A2',
    venue: VENUE[0] || 'Terrain synthétique',
    phase: 'Qualification',
    status: 'up',
    scoreA: 0,
    scoreB: 0,
    error: '',
    success: '',
    loading: false
  };
}

export function emptyTeamForm() {
  return {
    editingId: null,
    promo: PROMOS[0] || 'A1',
    si: 0,
    name: '',
    captain: '',
    email: '',
    maxPlayers: (SIZE[0] || 7) + 3,
    playersText: '',
    error: '',
    success: '',
    loading: false
  };
}

export const state = {
  page: detectInitialPage(),
  liveTicker: true,
  now: Date.now(),
  day: 0,
  sport: 'Tous',
  resSport: 0,
  promoF: 'Toutes',
  sportF: 'Tous',
  album: 'Tout',
  adminTab: 'live',
  adminDay: 0,
  adminMatchDayF: 'Tous',
  adminMatchSportF: 'Tous',
  adminMatchStatusF: 'Tous',
  adminTeamPromoF: 'Toutes',
  adminTeamSportF: 'Tous',
  matchForm: emptyMatchForm(),
  teamForm: emptyTeamForm(),
  newPlayerInputs: {},
  teamActionError: '',
  teamActionSuccess: '',
  authToken: getStoredToken(),
  isAdminAuthenticated: false,
  loginEmail: '',
  loginPassword: '',
  loginError: '',
  loginLoading: false,
  loginMode: 'login',          // 'login' | 'recover' (mot de passe oublié) | 'reset' (lien reçu par e-mail)
  loginNotice: '',
  recoverySent: false,
  recoveryToken: null,
  newPassword: '',
  newPasswordConfirm: '',
  importPromo: 'A1',
  importFileName: '',
  importCsvContent: '',
  importError: '',
  importSuccess: '',
  importLoading: false,
  lastImportedTeams: [],
  matches: [],
  teams: [],
  regs: [],
  pub: {},
  photos: [],
  standings: null,
  albums: [],
  albumForm: emptyAlbumForm(),
  editionForm: null,
  // Barre latérale de l'Espace BDS : ouverte par-dessus la page sur téléphone, réduite aux icônes sur ordinateur
  sideOpen: false,
  sideCollapsed: false,
  // Posts et reels Instagram affichés sur le site, et formulaire d'ajout de l'Espace BDS
  instagramPosts: [],
  igForm: { url: '', error: '', success: '', loading: false, uploading: null },
  slots: {},
  adminPhotos: [],
  adminSlots: {},
  mediaAlbum: '',
  mediaUploading: null,
  uploadConfig: null,
  mediaError: '',
  mediaSuccess: '',
  form: emptyForm(),
  formLoading: false,
  regActionError: '',
  err: {},
  sent: null,
};

export function normalizeTeamObject(t) {
  const si = typeof t.si === 'number' ? t.si : Math.max(0, SPORTS.findIndex(sp => sp.toLowerCase() === String(t.sport || '').toLowerCase()));
  const minP = SIZE[si] || 5;
  const pList = Array.isArray(t.playersList) ? t.playersList.map(x => String(x || '').trim()).filter(Boolean) : [];
  const pDetails = Array.isArray(t.playersDetails) && t.playersDetails.length === pList.length && pList.length > 0
    ? t.playersDetails.map((d, idx) => ({
        id: d.id ?? idx + 1,
        fullName: d.fullName || pList[idx],
        ordre: idx
      }))
    : pList.map((fullName, idx) => ({
        id: idx + 1,
        fullName,
        ordre: idx
      }));

  return {
    ...t,
    si,
    sport: t.sport || SPORTS[si] || 'Football',
    maxPlayers: Math.max(1, Number(t.maxPlayers) || minP + 3, pList.length),
    name: t.name || t.team || `${t.p || t.promo || 'A1'} ${t.sport || SPORTS[si] || 'Football'}`,
    p: t.p || t.promo || 'A1',
    captain: t.captain || pList[0] || '',
    players: pList.length > 0 ? pList.length : (t.players || 0),
    playersList: pList,
    playersDetails: pDetails,
    rec: t.rec || '0V 0N 0D'
  };
}

export function syncTeamsAndRegistrations() {
  const byId = new Map();

  for (const rawTeam of state.teams || []) {
    const idNum = String(rawTeam.id);
    byId.set(idNum, normalizeTeamObject(rawTeam));
  }

  for (const reg of state.regs || []) {
    if (reg.status !== 'Validée') continue;
    const idNum = String(reg.id);
    if (byId.has(idNum)) continue;

    const baseFromReg = {
      id: reg.id,
      p: reg.promo,
      si: reg.sportIndex,
      sport: reg.sport,
      name: reg.team,
      captain: reg.captain,
      email: reg.email,
      players: reg.playerCount || reg.players?.length || 0,
      playersList: reg.players || [],
      playersDetails: (reg.players || []).map((fullName, idx) => ({ id: idx + 1, fullName, ordre: idx }))
    };
    byId.set(idNum, normalizeTeamObject(baseFromReg));
  }

  state.teams = Array.from(byId.values());
}

export function updateConfig(data) {
  if (data.config) {
    if (Array.isArray(data.config.sports) && data.config.sports.length > 0) {
      SPORTS = data.config.sports;
      SHORT = data.config.short || SPORTS;
      VENUE = data.config.venue || SPORTS.map(() => '');
      SIZE = data.config.size || SPORTS.map(() => 5);
    }
    if (Array.isArray(data.config.promos) && data.config.promos.length > 0) {
      PROMOS = data.config.promos;
      MASCOT = data.config.mascot || {};
    }
    if (Array.isArray(data.config.days) && data.config.days.length > 0) {
      DAYS = data.config.days;
    }
    if (data.config.edition) {
      EDITION = data.config.edition;
    }
    if (Array.isArray(data.config.albums)) {
      ALBUMS = data.config.albums;
    }
  }

  if (Array.isArray(data.matches)) state.matches = data.matches;
  if (data.standings?.general) state.standings = data.standings;
  if (Array.isArray(data.teams)) state.teams = data.teams;
  if (Array.isArray(data.regs)) state.regs = data.regs;
  if (data.pub) state.pub = data.pub;
  if (Array.isArray(data.photos)) state.photos = data.photos;
  if (Array.isArray(data.albums)) setAlbums(data.albums);
  if (data.slots) state.slots = data.slots;
  if (Array.isArray(data.instagram)) state.instagramPosts = data.instagram;

  syncTeamsAndRegistrations();

  const minP = SIZE[state.form.sport] || 5;
  if (state.form.players.length < minP) {
    state.form.players = Array(minP).fill('');
  }
  if (!PROMOS.includes(state.form.promo) && PROMOS.length > 0) {
    state.form.promo = PROMOS[0];
  }
}

export function emptyAlbumForm() {
  return { editingId: null, name: '', start: '', end: '', published: true, error: '' };
}

export function resetAlbumForm() {
  state.albumForm = emptyAlbumForm();
}

// Albums (objets complets) : la liste des noms ALBUMS est déduite pour les sélecteurs
export function setAlbums(albums) {
  state.albums = albums;
  ALBUMS = albums.map(a => a.name);
}

export function resetForm() {
  state.form = emptyForm();
  state.err = {};
  state.sent = null;
}

export function resetMatchForm() {
  state.matchForm = emptyMatchForm();
}

export function resetTeamForm() {
  state.teamForm = emptyTeamForm();
}
