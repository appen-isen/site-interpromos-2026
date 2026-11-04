// Référentiels : promos, sports et configuration publique du site.
import { query } from '../db.js';
import { dbGetEdition } from './edition.js';
import { ensureBaseReferences } from './schema.js';

export async function dbGetPromos() {
    const { rows } = await query(`
        SELECT id, code, mascotte AS mascot
        FROM promos
        ORDER BY code ASC
    `);
    return rows;
}

export async function dbGetSports() {
    const { rows } = await query(`
        SELECT id, indice, nom AS name, nom_court AS short, lieu AS venue,
               joueurs_min AS "minPlayers", joueurs_max AS "maxPlayers", poids
        FROM sports
        ORDER BY indice ASC
    `);
    return rows;
}

export async function dbGetConfig() {
    await ensureBaseReferences();
    const [promos, sports, albumsRes, edition] = await Promise.all([
        dbGetPromos(),
        dbGetSports(),
        query('SELECT nom FROM albums ORDER BY date_debut ASC NULLS LAST, cree_le ASC'),
        dbGetEdition()
    ]);

    const mascot = {};
    promos.forEach(p => {
        mascot[p.code] = p.mascot;
    });

    return {
        sports: sports.map(s => s.name),
        short: sports.map(s => s.short),
        venue: sports.map(s => s.venue),
        size: sports.map(s => s.minPlayers),
        promos: promos.map(p => p.code),
        mascot,
        days: edition.days,
        edition,
        albums: albumsRes.rows.map(a => a.nom)
    };
}
