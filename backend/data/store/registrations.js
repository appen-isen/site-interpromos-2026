// Inscriptions des équipes via le formulaire public (/api/registrations).
import { pool, query } from '../db.js';
import { isUuid } from './constants.js';
import { upsertParticipant } from './participants.js';
import { ensureBaseReferences } from './schema.js';
import { dbGetTeams } from './teams.js';

export async function dbGetRegistrations() {
    const { rows } = await query(`
        SELECT
            e.id,
            e.nom AS team,
            p.code AS promo,
            s.nom AS sport,
            e.capitaine AS captain,
            e.email AS email,
            e.nb_joueurs AS players,
            e.date_inscription AS date,
            e.statut AS status,
            COALESCE(
                ARRAY_AGG(CONCAT_WS(' ', pa.prenom, pa.nom) ORDER BY pa.cree_le ASC) FILTER (WHERE pa.id IS NOT NULL),
                ARRAY[]::TEXT[]
            ) AS "playersList"
        FROM equipes e
        JOIN promos p ON p.id = e.id_promo
        JOIN sports s ON s.id = e.id_sport
        LEFT JOIN rejoindre_equipe re ON re.id_equipe = e.id
        LEFT JOIN participants pa ON pa.id = re.id_participant
        WHERE e.est_inscription = TRUE
        GROUP BY e.id, p.code, s.nom
        ORDER BY e.cree_le DESC
    `);

    return rows;
}

export async function dbCreateRegistration({ sportIndex, sportName, promo, team, captain, email, playersList, playerCount, date }) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await ensureBaseReferences(client);

        const promoRes = await client.query('SELECT id FROM promos WHERE code = $1', [promo]);
        const sportRes = await client.query(
            'SELECT id, nom FROM sports WHERE indice = $1 OR LOWER(nom) = LOWER($2) LIMIT 1',
            [sportIndex, sportName || '']
        );

        if (promoRes.rows.length === 0 || sportRes.rows.length === 0) {
            throw new Error('INVALID_PROMO_OR_SPORT');
        }

        const promoId = promoRes.rows[0].id;
        const sportId = sportRes.rows[0].id;

        const insertTeamRes = await client.query(
            `
            INSERT INTO equipes (id_promo, id_sport, nom, capitaine, email, nb_joueurs, date_inscription, statut, est_inscription, points)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'En attente', TRUE, 0)
            RETURNING id
            `,
            [promoId, sportId, team, captain, email, playerCount, date]
        );

        const equipeId = insertTeamRes.rows[0].id;

        for (const fullName of playersList || []) {
            const participantId = await upsertParticipant(client, promoId, fullName);

            await client.query(
                `
                INSERT INTO rejoindre_equipe (id_equipe, id_participant)
                VALUES ($1, $2)
                ON CONFLICT DO NOTHING
                `,
                [equipeId, participantId]
            );

            await client.query(
                `
                INSERT INTO participer_sport (id_sport, id_equipe, id_participant)
                VALUES ($1, $2, $3)
                ON CONFLICT DO NOTHING
                `,
                [sportId, equipeId, participantId]
            );
        }

        await client.query('COMMIT');

        const regs = await dbGetRegistrations();
        return {
            reg: regs.find(r => r.id === equipeId) || regs[0],
            regs
        };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

/**
 * Recherche les doublons d'une nouvelle inscription (équipes non refusées du même sport) :
 * - même nom d'équipe dans la même promo
 * - joueurs déjà engagés dans une autre équipe de ce sport
 */
export async function dbFindRegistrationConflicts({ promo, sportIndex, team, players }) {
    const sportRes = await query('SELECT id FROM sports WHERE indice = $1', [sportIndex]);
    const sportId = sportRes.rows[0]?.id;
    if (!sportId) return { teamTaken: false, playersTaken: [] };

    const [teamRes, playersRes] = await Promise.all([
        query(
            `SELECT 1 FROM equipes e JOIN promos p ON p.id = e.id_promo
             WHERE e.id_sport = $1 AND p.code = $2 AND LOWER(e.nom) = LOWER($3) AND e.statut <> 'Refusée'
             LIMIT 1`,
            [sportId, promo, team]
        ),
        query(
            `SELECT DISTINCT CONCAT_WS(' ', pa.prenom, pa.nom) AS name
             FROM rejoindre_equipe re
             JOIN equipes e ON e.id = re.id_equipe
             JOIN participants pa ON pa.id = re.id_participant
             WHERE e.id_sport = $1 AND e.statut <> 'Refusée'
               AND LOWER(CONCAT_WS(' ', pa.prenom, pa.nom)) = ANY($2::TEXT[])`,
            [sportId, players.map(p => p.toLowerCase())]
        )
    ]);

    return {
        teamTaken: teamRes.rowCount > 0,
        playersTaken: playersRes.rows.map(r => r.name)
    };
}

/**
 * Supprime une inscription : 'not_found' | 'has_matches' | { regs, teams }
 */
export async function dbDeleteRegistration(id) {
    if (!isUuid(id)) return 'not_found';
    const { rows } = await query(
        `SELECT e.id, EXISTS (SELECT 1 FROM matchups m WHERE m.id_equipe1 = e.id OR m.id_equipe2 = e.id) AS "hasMatches"
         FROM equipes e WHERE e.id = $1 AND e.est_inscription = TRUE`,
        [id]
    );
    if (rows.length === 0) return 'not_found';
    if (rows[0].hasMatches) return 'has_matches';

    const { rows: members } = await query('SELECT id_participant FROM rejoindre_equipe WHERE id_equipe = $1', [id]);
    await query('DELETE FROM equipes WHERE id = $1', [id]);
    // Joueurs créés par cette inscription et rattachés à aucune autre équipe
    await query(
        `DELETE FROM participants pa WHERE pa.id = ANY($1::UUID[])
         AND NOT EXISTS (SELECT 1 FROM rejoindre_equipe re WHERE re.id_participant = pa.id)`,
        [members.map(m => m.id_participant)]
    );
    const [regs, teams] = await Promise.all([dbGetRegistrations(), dbGetTeams()]);
    return { regs, teams };
}

export async function dbUpdateRegistrationStatus(id, status) {
    if (!isUuid(id)) return null;
    const { rowCount } = await query(
        'UPDATE equipes SET statut = $1 WHERE id = $2 AND est_inscription = TRUE',
        [status, id]
    );
    if (rowCount === 0) return null;

    const [regs, teams] = await Promise.all([dbGetRegistrations(), dbGetTeams()]);
    return {
        reg: regs.find(r => r.id === id),
        regs,
        teams
    };
}
