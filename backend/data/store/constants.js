// Valeurs par défaut (base vierge), correspondance des statuts de match, contrôle des identifiants.

// Édition par défaut, utilisée uniquement pour initialiser une base vierge (modifiable ensuite dans l'Espace BDS)
export const DEFAULT_EDITION = { annee: 2026, dateDebut: '2026-11-03', heureDebut: '13:00', lieu: 'ISEN Nantes' };

// Phases des 3 jours du tournoi : [phase, code court]
export const DAY_PHASES = [['Qualifs J1', 'J1'], ['Qualifs J2', 'J2'], ['Finales', 'J3']];

export const DEFAULT_PROMOS = [
    { code: 'A1', mascotte: 'Les Bits' },
    { code: 'A2', mascotte: 'Les Diodes' },
    { code: 'A3', mascotte: 'Les Ohms' },
    { code: 'A4', mascotte: 'Kernel Panic' },
    { code: 'A5', mascotte: 'Root Access' }
];

export const DEFAULT_SPORTS = [
    { indice: 0, nom: 'Football', nom_court: 'Foot', lieu: 'Terrain synthétique', min: 7, max: 10, poids: 1 },
    { indice: 1, nom: 'Basket', nom_court: 'Basket', lieu: 'Gymnase A', min: 5, max: 8, poids: 1 },
    { indice: 2, nom: 'Volley', nom_court: 'Volley', lieu: 'Gymnase B', min: 6, max: 9, poids: 1 },
    { indice: 3, nom: 'Handball', nom_court: 'Hand', lieu: 'Gymnase A', min: 7, max: 10, poids: 1 },
    { indice: 4, nom: 'Badminton', nom_court: 'Bad', lieu: 'Gymnase B', min: 2, max: 4, poids: 1 },
    { indice: 5, nom: 'Lutte', nom_court: 'Lutte', lieu: 'Terrain synthétique', min: 7, max: 10, poids: 1 }
];

// Albums créés uniquement sur une base vierge (l'admin peut ensuite les modifier ou les supprimer)
export const DEFAULT_ALBUMS = [
    { nom: 'Cérémonie & Ambiance', debut: 0, fin: 2 },
    { nom: 'Qualifications J1', debut: 0, fin: null },
    { nom: 'Qualifications J2', debut: 1, fin: null },
    { nom: 'Finales & Podiums', debut: 2, fin: null }
];

export const SQL_TO_API_STATUS = {
    en_attente: 'up',
    en_cours: 'live',
    joue: 'done',
    annule: 'up'
};

export const API_TO_SQL_STATUS = {
    up: 'en_attente',
    live: 'en_cours',
    done: 'joue',
    en_attente: 'en_attente',
    en_cours: 'en_cours',
    joue: 'joue',
    annule: 'annule'
};

// Identifiants des tables : UUID. Toute autre valeur est traitée comme « introuvable ».
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = value => UUID_RE.test(String(value ?? ''));
