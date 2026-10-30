import {
    dbGetMatches,
    dbCreateMatch,
    dbUpdateMatch,
    dbDeleteMatch,
    dbGenerateSchedule,
    dbUpdateMatchScore,
    dbUpdateMatchStatus,
    dbGetStandings
} from '../data/store.js';

export async function api_get_matches(request, response) {
    try {
        const { day, sport, status } = request.query;
        const list = await dbGetMatches({ day, sport, status });
        response.json(list);
    } catch (err) {
        console.error('Erreur GET /api/matches :', err);
        response.status(500).json({ error: 'Erreur lors de la récupération des matchs.' });
    }
}

export async function api_post_match(request, response) {
    try {
        const body = request.body || {};
        const { match, matches } = await dbCreateMatch(body);
        const standings = await dbGetStandings();
        response.status(201).json({ match, matches, standings });
    } catch (err) {
        if (err.message === 'SAME_PROMO') {
            return response.status(400).json({ error: 'Une promotion ne peut pas jouer contre elle-même.' });
        }
        if (err.message === 'INVALID_SPORT' || err.message === 'INVALID_PROMO') {
            return response.status(400).json({ error: 'Sport ou promotion invalide.' });
        }
        console.error('Erreur POST /api/matches :', err);
        response.status(500).json({ error: 'Erreur lors de la création du match.' });
    }
}

export async function api_put_match(request, response) {
    const { id } = request.params;
    try {
        const result = await dbUpdateMatch(id, request.body || {});
        if (!result) {
            return response.status(404).json({ error: 'Match introuvable.' });
        }
        const standings = await dbGetStandings();
        response.json({ ...result, standings });
    } catch (err) {
        if (err.message === 'SAME_PROMO') {
            return response.status(400).json({ error: 'Une promotion ne peut pas jouer contre elle-même.' });
        }
        if (err.message === 'INVALID_SPORT' || err.message === 'INVALID_PROMO') {
            return response.status(400).json({ error: 'Sport ou promotion invalide.' });
        }
        console.error('Erreur PUT /api/matches/:id :', err);
        response.status(500).json({ error: 'Erreur lors de la modification du match.' });
    }
}

export async function api_delete_match(request, response) {
    const { id } = request.params;
    try {
        const result = await dbDeleteMatch(id);
        if (!result) {
            return response.status(404).json({ error: 'Match introuvable.' });
        }
        const standings = await dbGetStandings();
        response.json({ ...result, standings });
    } catch (err) {
        console.error('Erreur DELETE /api/matches/:id :', err);
        response.status(500).json({ error: 'Erreur lors de la suppression du match.' });
    }
}

export async function api_generate_matches(request, response) {
    try {
        const { clearExisting } = request.body || {};
        const { createdCount, matches } = await dbGenerateSchedule({ clearExisting: Boolean(clearExisting) });
        const standings = await dbGetStandings();
        response.json({ createdCount, matches, standings });
    } catch (err) {
        console.error('Erreur POST /api/matches/generate :', err);
        response.status(500).json({ error: 'Erreur lors de la génération automatique des matchs.' });
    }
}

export async function api_patch_match_score(request, response) {
    const { id } = request.params;
    const { teamIndex, delta, scoreA, scoreB } = request.body || {};

    try {
        const match = await dbUpdateMatchScore(id, { teamIndex, delta, scoreA, scoreB });
        if (!match) {
            return response.status(404).json({ error: 'Match introuvable.' });
        }
        const standings = await dbGetStandings();
        response.json({ match, standings });
    } catch (err) {
        if (err.message === 'INVALID_TEAM_INDEX') {
            return response.status(400).json({ error: 'Indice équipe invalide (0 ou 1 attendu).' });
        }
        if (err.message === 'INVALID_SCORE_PARAMS') {
            return response.status(400).json({ error: 'Paramètres de score invalides.' });
        }
        console.error('Erreur PATCH /api/matches/:id/score :', err);
        return response.status(500).json({ error: 'Erreur lors de la mise à jour du score.' });
    }
}

export async function api_patch_match_status(request, response) {
    const { id } = request.params;
    const { status, resetScores } = request.body || {};

    try {
        const match = await dbUpdateMatchStatus(id, { status, resetScores: Boolean(resetScores) });
        if (!match) {
            return response.status(404).json({ error: 'Match introuvable.' });
        }
        const standings = await dbGetStandings();
        response.json({ match, standings });
    } catch (err) {
        if (err.message === 'INVALID_STATUS') {
            return response.status(400).json({ error: "Statut invalide ('up', 'live' ou 'done' attendu)." });
        }
        console.error('Erreur PATCH /api/matches/:id/status :', err);
        return response.status(500).json({ error: 'Erreur lors de la mise à jour du statut.' });
    }
}
