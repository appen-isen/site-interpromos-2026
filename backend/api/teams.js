import {
    dbGetTeams,
    dbCreateTeam,
    dbUpdateTeam,
    dbUpdateTeamMaxPlayers,
    dbAddPlayerToTeam,
    dbRemovePlayerFromTeam,
    dbMovePlayer,
    dbDeleteTeam
} from '../data/store.js';
import { isAdminRequest } from '../auth/session.js';
import { publicTeam } from './tournament.js';

export async function api_get_teams(request, response) {
    try {
        const { promo, sport } = request.query;
        const teams = await dbGetTeams({ promo, sport });
        response.json((await isAdminRequest(request)) ? teams : teams.map(publicTeam));
    } catch (err) {
        console.error('Erreur GET /api/teams :', err);
        response.status(500).json({ error: 'Erreur lors de la récupération des équipes.' });
    }
}

export async function api_post_team(request, response) {
    try {
        const result = await dbCreateTeam(request.body || {});
        response.status(201).json(result);
    } catch (err) {
        if (err.message === 'INVALID_PROMO' || err.message === 'INVALID_SPORT') {
            return response.status(400).json({ error: 'Promotion ou sport invalide.' });
        }
        console.error('Erreur POST /api/teams :', err);
        response.status(500).json({ error: "Erreur lors de la création de l'équipe." });
    }
}

export async function api_put_team(request, response) {
    try {
        const id = request.params.id;
        const result = await dbUpdateTeam(id, request.body || {});
        if (!result) {
            return response.status(404).json({ error: 'Équipe introuvable.' });
        }
        response.json(result);
    } catch (err) {
        if (err.message === 'INVALID_PROMO' || err.message === 'INVALID_SPORT') {
            return response.status(400).json({ error: 'Promotion ou sport invalide.' });
        }
        console.error('Erreur PUT /api/teams/:id :', err);
        response.status(500).json({ error: "Erreur lors de la modification de l'équipe." });
    }
}

export async function api_patch_team_max_players(request, response) {
    try {
        const id = request.params.id;
        const { maxPlayers, delta } = request.body || {};
        const result = await dbUpdateTeamMaxPlayers(id, { maxPlayers, delta });
        if (!result) {
            return response.status(404).json({ error: 'Équipe introuvable.' });
        }
        response.json(result);
    } catch (err) {
        console.error('Erreur PATCH /api/teams/:id/max-players :', err);
        response.status(500).json({ error: 'Erreur lors de la mise à jour du nombre max de joueurs.' });
    }
}

export async function api_post_team_player(request, response) {
    try {
        const id = request.params.id;
        const { fullName, autoIncreaseMax } = request.body || {};
        const result = await dbAddPlayerToTeam(id, { fullName, autoIncreaseMax: Boolean(autoIncreaseMax) });
        if (!result) {
            return response.status(404).json({ error: 'Équipe introuvable.' });
        }
        response.status(201).json(result);
    } catch (err) {
        if (err.message === 'EMPTY_PLAYER_NAME') {
            return response.status(400).json({ error: 'Veuillez saisir le prénom et le nom du joueur.' });
        }
        if (err.message === 'MAX_PLAYERS_REACHED') {
            return response.status(400).json({
                error: "Nombre maximum de joueurs atteint pour cette équipe. Augmentez la capacité max (+) de l'équipe pour en ajouter davantage."
            });
        }
        console.error('Erreur POST /api/teams/:id/players :', err);
        response.status(500).json({ error: "Erreur lors de l'ajout du joueur." });
    }
}

export async function api_delete_team_player(request, response) {
    try {
        const id = request.params.id;
        const participantId = request.params.participantId;
        const result = await dbRemovePlayerFromTeam(id, participantId);
        if (!result) {
            return response.status(404).json({ error: 'Équipe ou joueur introuvable.' });
        }
        response.json(result);
    } catch (err) {
        console.error('Erreur DELETE /api/teams/:id/players/:participantId :', err);
        response.status(500).json({ error: 'Erreur lors de la suppression du joueur.' });
    }
}

export async function api_move_team_player(request, response) {
    try {
        const id = request.params.id;
        const { participantId, direction, targetTeamId, makeCaptain } = request.body || {};
        const result = await dbMovePlayer(id, {
            participantId,
            direction,
            targetTeamId: targetTeamId || null,
            makeCaptain: Boolean(makeCaptain)
        });
        if (!result) {
            return response.status(404).json({ error: 'Équipe ou joueur introuvable.' });
        }
        response.json(result);
    } catch (err) {
        if (err.message === 'TARGET_MAX_PLAYERS_REACHED') {
            return response.status(400).json({
                error: "L'équipe de destination a atteint son nombre maximum de joueurs. Augmentez sa capacité max (+) avant de transférer ce joueur."
            });
        }
        if (err.message === 'TARGET_TEAM_NOT_FOUND') {
            return response.status(404).json({ error: 'Équipe de destination introuvable.' });
        }
        console.error('Erreur POST /api/teams/:id/players/move :', err);
        response.status(500).json({ error: 'Erreur lors du déplacement du joueur.' });
    }
}

export async function api_delete_team(request, response) {
    try {
        const id = request.params.id;
        const result = await dbDeleteTeam(id);
        if (!result) {
            return response.status(404).json({ error: 'Équipe introuvable.' });
        }
        response.json(result);
    } catch (err) {
        console.error('Erreur DELETE /api/teams/:id :', err);
        response.status(500).json({ error: "Erreur lors de la suppression de l'équipe." });
    }
}
