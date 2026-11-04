// Scores en direct et statut des matchs (à venir, en direct, terminé).
import { query } from '../db.js';
import { API_TO_SQL_STATUS } from './constants.js';
import { recomputeTeamPoints, dbGetMatches } from './matches.js';

export async function dbUpdateMatchScore(codeMatch, { teamIndex, delta, scoreA, scoreB }) {
    const { rows } = await query(
        `
        SELECT id, code_match, id_equipe1, id_equipe2, score_equipe1, score_equipe2, statut
        FROM matchups
        WHERE code_match = $1 OR id::TEXT = $1
        `,
        [String(codeMatch)]
    );

    const row = rows[0];
    if (!row) return null;

    let newA = row.score_equipe1;
    let newB = row.score_equipe2;

    if (typeof teamIndex === 'number' && typeof delta === 'number') {
        if (teamIndex === 0) newA = Math.max(0, newA + delta);
        else if (teamIndex === 1) newB = Math.max(0, newB + delta);
        else throw new Error('INVALID_TEAM_INDEX');
    } else if (typeof scoreA === 'number' && typeof scoreB === 'number') {
        newA = Math.max(0, scoreA);
        newB = Math.max(0, scoreB);
    } else {
        throw new Error('INVALID_SCORE_PARAMS');
    }

    let gagnant = null;
    if (row.statut === 'joue') {
        if (newA > newB) gagnant = row.id_equipe1;
        else if (newB > newA) gagnant = row.id_equipe2;
    }

    await query(
        `
        UPDATE matchups
        SET score_equipe1 = $1, score_equipe2 = $2, gagnant = $3
        WHERE id = $4
        `,
        [newA, newB, gagnant, row.id]
    );

    if (row.statut === 'joue') {
        await recomputeTeamPoints();
    }

    const updated = await dbGetMatches();
    return updated.find(m => m.dbId === row.id);
}

export async function dbUpdateMatchStatus(codeMatch, { status, resetScores }) {
    const { rows } = await query(
        `
        SELECT id, code_match, id_equipe1, id_equipe2, score_equipe1, score_equipe2
        FROM matchups
        WHERE code_match = $1 OR id::TEXT = $1
        `,
        [String(codeMatch)]
    );

    const row = rows[0];
    if (!row) return null;

    const sqlStatus = API_TO_SQL_STATUS[status];
    if (!sqlStatus) {
        throw new Error('INVALID_STATUS');
    }

    const s1 = resetScores ? 0 : row.score_equipe1;
    const s2 = resetScores ? 0 : row.score_equipe2;

    let gagnant = null;
    if (sqlStatus === 'joue') {
        if (s1 > s2) gagnant = row.id_equipe1;
        else if (s2 > s1) gagnant = row.id_equipe2;
    }

    await query(
        `
        UPDATE matchups
        SET statut = $1, score_equipe1 = $2, score_equipe2 = $3, gagnant = $4
        WHERE id = $5
        `,
        [sqlStatus, s1, s2, gagnant, row.id]
    );

    await recomputeTeamPoints();

    const updated = await dbGetMatches();
    return updated.find(m => m.dbId === row.id);
}
