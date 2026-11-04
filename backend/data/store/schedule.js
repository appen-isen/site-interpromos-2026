// Génération automatique des matchs de qualification.
import { pool } from '../db.js';
import { recomputeTeamPoints, dbGetMatches } from './matches.js';
import { ensureBaseReferences } from './schema.js';

// Heure « HH:MM » décalée de n minutes
function addMinutes(time, minutes) {
    const [h, m] = time.split(':').map(Number);
    const total = Math.min(23 * 60 + 59, h * 60 + m + minutes);
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * Planning type : dans chaque sport, chaque équipe rencontre une fois chaque équipe d'une autre promo
 * (qualifications réparties sur J1 et J2, un créneau toutes les 45 minutes par terrain).
 * Les phases finales se programment à la main une fois les qualifications jouées.
 */
export async function dbGenerateSchedule({ clearExisting = false } = {}) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await ensureBaseReferences(client);

        if (clearExisting) {
            await client.query('DELETE FROM matchups');
        }

        const { rows: sports } = await client.query('SELECT id, indice, nom, lieu FROM sports ORDER BY indice ASC');
        const { rows: teams } = await client.query(
            `SELECT e.id, e.id_sport, e.id_promo
             FROM equipes e JOIN promos p ON p.id = e.id_promo
             WHERE e.est_inscription = FALSE OR e.statut = 'Validée'
             ORDER BY p.code ASC, e.cree_le ASC`
        );
        const { rows: existing } = await client.query('SELECT id_equipe1, id_equipe2 FROM matchups');
        const alreadyPlayed = new Set(existing.flatMap(m => [`${m.id_equipe1}|${m.id_equipe2}`, `${m.id_equipe2}|${m.id_equipe1}`]));
        const { rows: editionRows } = await client.query('SELECT heure_debut FROM edition LIMIT 1');
        const firstSlot = addMinutes(editionRows[0]?.heure_debut || '13:00', 30);

        let createdCount = 0;
        let skippedSports = 0;

        for (const sp of sports) {
            const sportTeams = teams.filter(t => t.id_sport === sp.id);
            const pairs = [];
            for (let i = 0; i < sportTeams.length; i++) {
                for (let j = i + 1; j < sportTeams.length; j++) {
                    const [x, y] = [sportTeams[i], sportTeams[j]];
                    if (x.id_promo === y.id_promo || alreadyPlayed.has(`${x.id}|${y.id}`)) continue;
                    pairs.push([x, y]);
                }
            }
            if (sportTeams.length < 2) skippedSports++;

            // Première moitié le jour 1, seconde moitié le jour 2
            const half = Math.ceil(pairs.length / 2);
            for (let k = 0; k < pairs.length; k++) {
                const [x, y] = pairs[k];
                const day = k < half ? 0 : 1;
                const slot = day === 0 ? k : k - half;
                const code = `G-S${sp.indice}-${x.id.slice(0, 8)}-${y.id.slice(0, 8)}`;
                const res = await client.query(
                    `INSERT INTO matchups (code_match, id_sport, id_equipe1, id_equipe2, jour, creneau, heure, phase, lieu, score_equipe1, score_equipe2, statut)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, 'Qualification', $8, 0, 0, 'en_attente')
                     ON CONFLICT (code_match) DO NOTHING`,
                    [code, sp.id, x.id, y.id, day, slot + 1, addMinutes(firstSlot, slot * 45), sp.lieu]
                );
                createdCount += res.rowCount;
            }
        }

        await recomputeTeamPoints(client);
        await client.query('COMMIT');

        const matches = await dbGetMatches();
        return { createdCount, skippedSports, matches };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}
