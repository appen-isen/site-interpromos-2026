// Matchs (/api/matches) : lecture, création, modification, suppression.
// Chaque match oppose deux équipes, chacune rattachée à sa promo.
import { pool, query } from '../db.js';
import { SQL_TO_API_STATUS, API_TO_SQL_STATUS, isUuid } from './constants.js';
import { ensureBaseReferences } from './schema.js';

/**
 * Vérifie qu'une équipe peut jouer un match de ce sport (équipe officielle ou inscription validée).
 * Renvoie { id, promo }. Lève INVALID_TEAM / TEAM_SPORT_MISMATCH.
 */
async function resolveMatchTeam(client, teamId, sportId, { alreadyInMatch = false } = {}) {
    if (!isUuid(teamId)) throw new Error('INVALID_TEAM');
    const { rows } = await client.query(
        `SELECT e.id, e.id_sport, e.est_inscription, e.statut, p.code AS promo
         FROM equipes e JOIN promos p ON p.id = e.id_promo
         WHERE e.id = $1`,
        [teamId]
    );
    const team = rows[0];
    // Une équipe déjà programmée reste modifiable même si son inscription a été refusée depuis
    if (!team || (team.est_inscription && team.statut !== 'Validée' && !alreadyInMatch)) throw new Error('INVALID_TEAM');
    if (team.id_sport !== sportId) throw new Error('TEAM_SPORT_MISMATCH');
    return { id: team.id, promo: team.promo };
}

/**
 * Recalcule la colonne points de la table equipes à partir des matchs joués
 */
export async function recomputeTeamPoints(client = pool) {
    await client.query(`
        UPDATE equipes e
        SET points = COALESCE((
            SELECT SUM(
                CASE
                    WHEN (m.id_equipe1 = e.id AND m.score_equipe1 > m.score_equipe2)
                      OR (m.id_equipe2 = e.id AND m.score_equipe2 > m.score_equipe1)
                    THEN 3 * s.poids
                    WHEN (m.id_equipe1 = e.id OR m.id_equipe2 = e.id)
                      AND m.score_equipe1 = m.score_equipe2
                    THEN 1 * s.poids
                    ELSE 0
                END
            )
            FROM matchups m
            JOIN sports s ON s.id = m.id_sport
            WHERE m.statut = 'joue'
              AND (m.id_equipe1 = e.id OR m.id_equipe2 = e.id)
        ), 0);
    `);
}

export async function dbGetMatches(filters = {}) {
    const conditions = [];
    const params = [];

    if (filters.day !== undefined && filters.day !== '') {
        const dNum = Number(filters.day);
        if (!Number.isNaN(dNum)) {
            params.push(dNum);
            conditions.push(`m.jour = $${params.length}`);
        }
    }
    if (filters.sport && filters.sport !== 'Tous') {
        params.push(filters.sport);
        conditions.push(`LOWER(s.nom) = LOWER($${params.length})`);
    }
    if (filters.status) {
        const targetSqlStatus = API_TO_SQL_STATUS[filters.status] || filters.status;
        params.push(targetSqlStatus);
        conditions.push(`m.statut = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await query(
        `
        SELECT
            m.id AS "dbId",
            m.code_match AS id,
            m.jour AS d,
            s.indice AS si,
            m.creneau AS k,
            s.nom AS sport,
            m.heure AS t,
            p1.code AS a,
            p2.code AS b,
            e1.id AS "teamAId",
            e2.id AS "teamBId",
            e1.nom AS "teamAName",
            e2.nom AS "teamBName",
            m.lieu AS venue,
            m.phase AS phase,
            m.statut AS "statutSql",
            m.score_equipe1 AS "scoreA",
            m.score_equipe2 AS "scoreB",
            m.gagnant AS gagnant
        FROM matchups m
        JOIN sports s ON s.id = m.id_sport
        JOIN equipes e1 ON e1.id = m.id_equipe1
        JOIN promos p1 ON p1.id = e1.id_promo
        JOIN equipes e2 ON e2.id = m.id_equipe2
        JOIN promos p2 ON p2.id = e2.id_promo
        ${whereClause}
        ORDER BY m.jour ASC, m.heure ASC, s.indice ASC, m.cree_le ASC
        `,
        params
    );

    return rows.map(r => ({
        id: r.id,
        dbId: r.dbId,
        d: r.d,
        si: r.si,
        k: r.k,
        sport: r.sport,
        t: r.t,
        a: r.a,
        b: r.b,
        teamAId: r.teamAId,
        teamBId: r.teamBId,
        teamAName: r.teamAName,
        teamBName: r.teamBName,
        venue: r.venue,
        phase: r.phase,
        status: SQL_TO_API_STATUS[r.statutSql] || 'up',
        statutSql: r.statutSql,
        scores: [r.scoreA, r.scoreB],
        gagnant: r.gagnant
    }));
}

export async function dbCreateMatch({ d = 0, t = '13:00', si = 0, teamA, teamB, venue = '', phase = 'Qualification', status = 'up', scoreA = 0, scoreB = 0 }) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await ensureBaseReferences(client);

        const dayNum = Math.min(2, Math.max(0, Number(d) || 0));
        const sportIdx = Number(si) || 0;

        const sportRes = await client.query('SELECT id, nom, nom_court, lieu, joueurs_min FROM sports WHERE indice = $1', [sportIdx]);
        if (sportRes.rows.length === 0) throw new Error('INVALID_SPORT');
        const sportRow = sportRes.rows[0];

        if (!teamA || !teamB) throw new Error('MISSING_TEAMS');
        if (teamA === teamB) throw new Error('SAME_TEAM');
        const team1 = await resolveMatchTeam(client, teamA, sportRow.id);
        const team2 = await resolveMatchTeam(client, teamB, sportRow.id);
        const team1Id = team1.id;
        const team2Id = team2.id;
        const promoACode = team1.promo;
        const promoBCode = team2.promo;

        const validPhases = ['Qualification', 'Petite finale', 'Finale'];
        const matchPhase = validPhases.includes(phase) ? phase : 'Qualification';
        const matchVenue = String(venue || '').trim() || sportRow.lieu;
        const matchTime = String(t || '13:00').trim() || '13:00';
        const sqlStatus = API_TO_SQL_STATUS[status] || 'en_attente';
        const s1 = Math.max(0, Number(scoreA) || 0);
        const s2 = Math.max(0, Number(scoreB) || 0);

        let gagnant = null;
        if (sqlStatus === 'joue') {
            if (s1 > s2) gagnant = team1Id;
            else if (s2 > s1) gagnant = team2Id;
        }

        const countRes = await client.query('SELECT COUNT(*)::INT AS c FROM matchups');
        const nextNum = (countRes.rows[0]?.c || 0) + 1;
        const uniqueSuffix = `${Date.now().toString(36).slice(-4)}${nextNum}`;
        const codeMatch = `J${dayNum + 1}-${sportRow.nom_court.toUpperCase().slice(0, 4)}-${promoACode}${promoBCode}-${uniqueSuffix}`.slice(0, 32);

        const insertRes = await client.query(
            `INSERT INTO matchups (code_match, id_sport, id_equipe1, id_equipe2, jour, creneau, heure, phase, lieu, score_equipe1, score_equipe2, statut, gagnant)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
             RETURNING id`,
            [codeMatch, sportRow.id, team1Id, team2Id, dayNum, nextNum, matchTime, matchPhase, matchVenue, s1, s2, sqlStatus, gagnant]
        );

        if (sqlStatus === 'joue') {
            await recomputeTeamPoints(client);
        }

        await client.query('COMMIT');

        const matches = await dbGetMatches();
        const match = matches.find(m => m.dbId === insertRes.rows[0].id);
        return { match, matches };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

export async function dbUpdateMatch(codeMatch, { d, t, si, teamA, teamB, venue, phase, status, scoreA, scoreB }) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await ensureBaseReferences(client);

        const existingRes = await client.query(
            `SELECT m.*, s.indice AS si_current
             FROM matchups m
             JOIN sports s ON s.id = m.id_sport
             WHERE m.code_match = $1 OR m.id::TEXT = $1`,
            [String(codeMatch)]
        );
        if (existingRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return null;
        }
        const row = existingRes.rows[0];

        const dayNum = d !== undefined ? Math.min(2, Math.max(0, Number(d))) : row.jour;
        const sportIdx = si !== undefined ? Number(si) : row.si_current;

        const sportRes = await client.query('SELECT id, nom, lieu, joueurs_min FROM sports WHERE indice = $1', [sportIdx]);
        const sportRow = sportRes.rows[0];
        if (!sportRow) throw new Error('INVALID_SPORT');

        // Équipes choisies, sinon celles du match (qui doivent alors appartenir au sport choisi)
        const pick1 = teamA || row.id_equipe1;
        const pick2 = teamB || row.id_equipe2;
        const inMatch = id => id === row.id_equipe1 || id === row.id_equipe2;
        const team1Id = (await resolveMatchTeam(client, pick1, sportRow.id, { alreadyInMatch: inMatch(pick1) })).id;
        const team2Id = (await resolveMatchTeam(client, pick2, sportRow.id, { alreadyInMatch: inMatch(pick2) })).id;
        if (team1Id === team2Id) throw new Error('SAME_TEAM');

        const validPhases = ['Qualification', 'Petite finale', 'Finale'];
        const matchPhase = phase && validPhases.includes(phase) ? phase : row.phase;
        const matchVenue = venue !== undefined && String(venue).trim() !== '' ? String(venue).trim() : (sportRow.id !== row.id_sport ? sportRow.lieu : row.lieu);
        const matchTime = t !== undefined && String(t).trim() !== '' ? String(t).trim() : row.heure;
        const sqlStatus = status ? (API_TO_SQL_STATUS[status] || row.statut) : row.statut;
        const s1 = scoreA !== undefined ? Math.max(0, Number(scoreA) || 0) : row.score_equipe1;
        const s2 = scoreB !== undefined ? Math.max(0, Number(scoreB) || 0) : row.score_equipe2;

        let gagnant = null;
        if (sqlStatus === 'joue') {
            if (s1 > s2) gagnant = team1Id;
            else if (s2 > s1) gagnant = team2Id;
        }

        await client.query(
            `UPDATE matchups
             SET id_sport = $1, id_equipe1 = $2, id_equipe2 = $3, jour = $4, heure = $5,
                 phase = $6, lieu = $7, score_equipe1 = $8, score_equipe2 = $9, statut = $10, gagnant = $11
             WHERE id = $12`,
            [sportRow.id, team1Id, team2Id, dayNum, matchTime, matchPhase, matchVenue, s1, s2, sqlStatus, gagnant, row.id]
        );

        await recomputeTeamPoints(client);
        await client.query('COMMIT');

        const matches = await dbGetMatches();
        const match = matches.find(m => m.dbId === row.id);
        return { match, matches };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

export async function dbDeleteMatch(codeMatch) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { rowCount } = await client.query(
            `DELETE FROM matchups WHERE code_match = $1 OR id::TEXT = $1`,
            [String(codeMatch)]
        );
        if (rowCount === 0) {
            await client.query('ROLLBACK');
            return null;
        }
        await recomputeTeamPoints(client);
        await client.query('COMMIT');

        const matches = await dbGetMatches();
        return { matches };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}
