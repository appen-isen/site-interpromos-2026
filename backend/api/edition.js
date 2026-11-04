import { dbGetEdition, dbUpdateEdition, dbUpdateRegistrationSettings, dbUpdateTvSettings } from '../data/store.js';

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

const REGISTRATION_SETTINGS_ERRORS = {
    INVALID_OPEN: '« open » doit valoir true ou false.',
    INVALID_DEADLINE: 'Échéance invalide (format attendu : AAAA-MM-JJTHH:MM, heure de Paris).'
};

/**
 * PUT /api/edition/registrations (admin) — { open?, deadline? } : ouvre / ferme les inscriptions et règle l'échéance
 */
export async function api_put_registration_settings(request, response) {
    try {
        const { open, deadline } = request.body || {};
        response.json(await dbUpdateRegistrationSettings({ open, deadline }));
    } catch (err) {
        if (REGISTRATION_SETTINGS_ERRORS[err.message]) {
            return response.status(400).json({ error: REGISTRATION_SETTINGS_ERRORS[err.message] });
        }
        console.error('Erreur PUT /api/edition/registrations :', err);
        response.status(500).json({ error: 'Erreur lors de la mise à jour des inscriptions.' });
    }
}

const TV_ERRORS = {
    INVALID_TV_SPORT: 'Sport introuvable.',
    INVALID_TV_MESSAGE: 'Message trop long (200 caractères max).'
};

/**
 * PUT /api/edition/tv (admin) — { sport?, message? } : réglages de l'écran TV des scores
 */
export async function api_put_tv_settings(request, response) {
    try {
        const { sport, message } = request.body || {};
        response.json(await dbUpdateTvSettings({ sport, message }));
    } catch (err) {
        if (TV_ERRORS[err.message]) {
            return response.status(400).json({ error: TV_ERRORS[err.message] });
        }
        console.error('Erreur PUT /api/edition/tv :', err);
        response.status(500).json({ error: "Erreur lors de la mise à jour du mode TV." });
    }
}
