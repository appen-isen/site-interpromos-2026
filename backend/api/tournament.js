import {
    dbGetConfig,
    dbGetPromos,
    dbGetSports,
    dbGetMatches,
    dbGetStandings,
    dbGetTeams,
    dbGetRegistrations,
    dbGetGallery
} from '../data/store.js';
import { isAdminRequest } from '../auth/session.js';

// Données personnelles retirées des réponses publiques (e-mails des capitaines)
export function publicTeam({ email, ...team }) {
    return team;
}

export async function api_state(request, response) {
    try {
        const [config, matches, standings, teams, regs, gallery] = await Promise.all([
            dbGetConfig(),
            dbGetMatches(),
            dbGetStandings(),
            dbGetTeams(),
            dbGetRegistrations(),
            dbGetGallery(undefined, { publicOnly: true })
        ]);

        const admin = await isAdminRequest(request);

        response.json({
            config,
            matches,
            standings,
            teams: admin ? teams : teams.map(publicTeam),
            // Le public ne voit que les inscriptions validées, sans e-mail
            regs: admin ? regs : regs.filter(r => r.status === 'Validée').map(publicTeam),
            albums: gallery.albums,
            pub: gallery.pub,
            photos: gallery.photos,
            slots: gallery.slots
        });
    } catch (err) {
        console.error('Erreur GET /api/state :', err);
        response.status(500).json({ error: "Les données du tournoi n'ont pas pu être chargées. Réessayez dans un instant." });
    }
}

export async function api_sports(request, response) {
    try {
        const sports = await dbGetSports();
        response.json(sports);
    } catch (err) {
        console.error('Erreur GET /api/sports :', err);
        response.status(500).json({ error: 'Erreur lors de la récupération des sports.' });
    }
}

export async function api_promos(request, response) {
    try {
        const promos = await dbGetPromos();
        response.json(promos);
    } catch (err) {
        console.error('Erreur GET /api/promos :', err);
        response.status(500).json({ error: 'Erreur lors de la récupération des promotions.' });
    }
}

export async function api_standings(request, response) {
    try {
        const standings = await dbGetStandings();
        response.json(standings);
    } catch (err) {
        console.error('Erreur GET /api/standings :', err);
        response.status(500).json({ error: 'Erreur lors du calcul des classements.' });
    }
}
