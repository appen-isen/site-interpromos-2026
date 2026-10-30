import {
    dbGetSports,
    dbGetPromos,
    dbGetRegistrations,
    dbCreateRegistration,
    dbUpdateRegistrationStatus,
    dbFindRegistrationConflicts,
    dbDeleteRegistration
} from '../data/store.js';
import { createRateLimit } from './rate-limit.js';

// Anti-spam : 20 inscriptions max par adresse IP sur 10 minutes
export const registrationRateLimit = createRateLimit({
    name: 'inscription',
    windowMs: 10 * 60 * 1000,
    max: 20,
    message: 'Trop de tentatives depuis cet appareil. Réessayez dans quelques minutes.'
});

const cleanName = value => String(value || '').trim().replace(/\s+/g, ' ');

export async function api_get_registrations(request, response) {
    try {
        const regs = await dbGetRegistrations();
        const counts = {
            pending: regs.filter(r => r.status === 'En attente').length,
            ok: regs.filter(r => r.status === 'Validée').length,
            no: regs.filter(r => r.status === 'Refusée').length
        };
        response.json({ regs, counts });
    } catch (err) {
        console.error('Erreur GET /api/registrations :', err);
        response.status(500).json({ error: 'Erreur lors de la récupération des inscriptions.' });
    }
}

export async function api_post_registration(request, response) {
    try {
        const body = request.body || {};
        const [sports, promos] = await Promise.all([dbGetSports(), dbGetPromos()]);

        const sportObj =
            sports.find(s => s.indice === body.sportIndex) ||
            sports.find(s => s.name.toLowerCase() === String(body.sport || '').toLowerCase()) ||
            sports[0];

        const sportName = sportObj ? sportObj.name : String(body.sport || 'Football');
        const sportIndex = sportObj ? sportObj.indice : Number(body.sportIndex || 0);
        const minP = sportObj ? sportObj.minPlayers : 5;
        const maxP = sportObj ? sportObj.maxPlayers : minP + 3;

        const validPromos = promos.map(p => p.code);
        const promo = validPromos.includes(body.promo) ? body.promo : (validPromos[0] || String(body.promo || 'A1'));

        const team = cleanName(body.team);
        const captain = cleanName(body.captain);
        const email = String(body.email || '').trim().toLowerCase();
        const rules = Boolean(body.rules);

        const rawPlayers = Array.isArray(body.players) ? body.players : [];
        const filledPlayers = rawPlayers.map(cleanName).filter(Boolean);
        const playerCount = filledPlayers.length;

        const errors = {};
        if (!team) errors.team = 'Donnez un nom à votre équipe.';
        else if (team.length > 60) errors.team = "Nom d'équipe trop long (60 caractères max).";
        if (!captain) errors.captain = 'Indiquez le nom du capitaine.';
        else if (captain.length > 80) errors.captain = 'Nom du capitaine trop long.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) errors.email = 'Adresse e-mail invalide.';

        const lowerPlayers = filledPlayers.map(p => p.toLowerCase());
        const duplicates = filledPlayers.filter((p, i) => lowerPlayers.indexOf(p.toLowerCase()) !== i);
        const incomplete = filledPlayers.filter(p => p.split(' ').length < 2 || p.length > 80);
        if (incomplete.length > 0) {
            errors.players = `Indiquez le prénom et le nom de chaque joueur (${incomplete.slice(0, 3).join(', ')}).`;
        } else if (duplicates.length > 0) {
            errors.players = `Joueur saisi deux fois : ${[...new Set(duplicates)].join(', ')}.`;
        } else if (playerCount < minP) {
            errors.players = `${minP} joueurs minimum pour le ${sportName.toLowerCase()} (${playerCount} renseigné${playerCount > 1 ? 's' : ''}).`;
        } else if (playerCount > maxP) {
            errors.players = `${maxP} joueurs maximum (3 remplaçants max) pour le ${sportName.toLowerCase()}.`;
        }
        if (!rules) errors.rules = 'Acceptez le règlement pour continuer.';

        if (Object.keys(errors).length > 0) {
            return response.status(400).json({ errors });
        }

        // Doublons avec les inscriptions déjà enregistrées (hors inscriptions refusées)
        const conflicts = await dbFindRegistrationConflicts({ promo, sportIndex, team, players: filledPlayers });
        if (conflicts.teamTaken) {
            errors.team = `Une équipe « ${team} » est déjà inscrite en ${sportName.toLowerCase()} pour la promo ${promo}.`;
        }
        if (conflicts.playersTaken.length > 0) {
            errors.players = `Déjà inscrit(s) dans une autre équipe de ${sportName.toLowerCase()} : ${conflicts.playersTaken.join(', ')}.`;
        }
        if (Object.keys(errors).length > 0) {
            return response.status(409).json({ errors });
        }

        const now = new Date();
        const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
        const dateStr = body.date || `${now.getDate()} ${months[now.getMonth()]}`;

        const result = await dbCreateRegistration({
            sportIndex,
            sportName,
            promo,
            team,
            captain,
            email,
            playersList: filledPlayers,
            playerCount,
            date: dateStr
        });

        // Seul le dossier créé est renvoyé (la liste complète contient les e-mails des autres équipes)
        response.status(201).json({ reg: result.reg });
    } catch (err) {
        if (err.message === 'INVALID_PROMO_OR_SPORT') {
            return response.status(400).json({ error: 'Promo ou sport introuvable dans la base de données.' });
        }
        console.error('Erreur POST /api/registrations :', err);
        response.status(500).json({ error: "Erreur lors de l'enregistrement de l'inscription." });
    }
}

export async function api_patch_registration(request, response) {
    try {
        const id = request.params.id;
        const { status } = request.body || {};

        if (!['En attente', 'Validée', 'Refusée'].includes(status)) {
            return response.status(400).json({ error: 'Statut invalide.' });
        }

        const result = await dbUpdateRegistrationStatus(id, status);
        if (!result) {
            return response.status(404).json({ error: 'Inscription introuvable.' });
        }

        response.json(result);
    } catch (err) {
        console.error('Erreur PATCH /api/registrations/:id :', err);
        response.status(500).json({ error: "Erreur lors de la mise à jour de l'inscription." });
    }
}

/**
 * DELETE /api/registrations/:id (admin) — supprime une inscription (impossible si l'équipe a déjà des matchs)
 */
export async function api_delete_registration(request, response) {
    try {
        const result = await dbDeleteRegistration(request.params.id);
        if (result === 'not_found') {
            return response.status(404).json({ error: 'Inscription introuvable.' });
        }
        if (result === 'has_matches') {
            return response.status(409).json({ error: "Cette équipe a déjà des matchs programmés : supprimez-les d'abord ou refusez simplement l'inscription." });
        }
        response.json(result);
    } catch (err) {
        console.error('Erreur DELETE /api/registrations/:id :', err);
        response.status(500).json({ error: "Erreur lors de la suppression de l'inscription." });
    }
}
