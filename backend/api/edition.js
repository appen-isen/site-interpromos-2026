import { dbGetEdition, dbUpdateEdition } from '../data/store.js';

const EDITION_ERRORS = {
    INVALID_YEAR: 'Année invalide (entre 2000 et 2100).',
    INVALID_DATE: 'Date de début invalide (format attendu : AAAA-MM-JJ).',
    YEAR_MISMATCH: "La date de début doit tomber pendant l'année de l'édition.",
    INVALID_TIME: 'Heure du coup d’envoi invalide (format HH:MM).',
    INVALID_VENUE: 'Indiquez le lieu du tournoi.',
    INVALID_CONTACT: 'Adresse e-mail de contact invalide.',
    INVALID_INSTAGRAM: 'Compte Instagram invalide (lettres, chiffres, points et _ ; 30 caractères au plus).'
};

/**
 * GET /api/edition — année, dates et lieu de l'édition en cours (public)
 */
export async function api_get_edition(request, response) {
    try {
        response.json(await dbGetEdition());
    } catch (err) {
        console.error('Erreur GET /api/edition :', err);
        response.status(500).json({ error: "Erreur lors de la récupération de l'édition." });
    }
}

/**
 * PUT /api/edition (admin) — { year, start, time?, venue? }
 */
export async function api_put_edition(request, response) {
    try {
        response.json(await dbUpdateEdition(request.body || {}));
    } catch (err) {
        if (EDITION_ERRORS[err.message]) {
            return response.status(400).json({ error: EDITION_ERRORS[err.message] });
        }
        console.error('Erreur PUT /api/edition :', err);
        response.status(500).json({ error: "Erreur lors de la mise à jour de l'édition." });
    }
}
