// Équipes (/api/teams) : lecture, création, modification, suppression.
import { pool, query } from '../db.js';
import { recomputeTeamPoints, dbGetMatches } from './matches.js';
import { upsertParticipant, deleteOrphanParticipants } from './participants.js';
import { ensureBaseReferences } from './schema.js';

export async function dbGetTeams(filters = {}) {
    await ensureBaseReferences();
    const conditions = ["(e.est_inscription = FALSE OR e.statut = 'Validée')"];
    const params = [];

    if (filters.promo && filters.promo !== 'Toutes') {
        params.push(filters.promo);
        conditions.push(`p.code = $${params.length}`);
    }
    if (filters.sport && filters.sport !== 'Tous') {
        params.push(filters.sport);
        conditions.push(`LOWER(s.nom) = LOWER($${params.length})`);
    }

    const [{ rows }, { rows: standRows }] = await Promise.all([
        query(
            `
            SELECT
                e.id,
                p.code AS p,
                s.indice AS si,
                s.nom AS sport,
                s.joueurs_min AS "minPlayers",
                COALESCE(e.nb_joueurs_max, s.joueurs_max, 10) AS "maxPlayers",
                e.nom AS name,
                e.capitaine AS captain,
                e.email AS email,
                e.nb_joueurs AS players,
                e.points AS points,
                e.statut AS status,
                e.est_inscription AS "isRegistration",
                COALESCE(
                    ARRAY_AGG(CONCAT_WS(' ', pa.prenom, pa.nom) ORDER BY re.ordre ASC, pa.cree_le ASC) FILTER (WHERE pa.id IS NOT NULL),
                    ARRAY[]::TEXT[]
                ) AS "playersList",
                COALESCE(
                    JSON_AGG(
                        JSON_BUILD_OBJECT(
                            'id', pa.id,
                            'prenom', pa.prenom,
                            'nom', pa.nom,
                            'fullName', CONCAT_WS(' ', pa.prenom, pa.nom),
                            'ordre', re.ordre
                        ) ORDER BY re.ordre ASC, pa.cree_le ASC
                    ) FILTER (WHERE pa.id IS NOT NULL),
                    '[]'::JSON
                ) AS "playersDetails"
            FROM equipes e
            JOIN promos p ON p.id = e.id_promo
            JOIN sports s ON s.id = e.id_sport
            LEFT JOIN rejoindre_equipe re ON re.id_equipe = e.id
            LEFT JOIN participants pa ON pa.id = re.id_participant
            WHERE ${conditions.join(' AND ')}
            GROUP BY e.id, p.code, p.id, s.indice, s.nom, s.joueurs_min, s.joueurs_max
            ORDER BY p.code ASC, s.indice ASC, e.cree_le ASC
            `,
            params
        ),
        query('SELECT id_equipe AS id, v, n, l FROM v_classement_equipe')
    ]);

    return rows.map(row => {
        const st = standRows.find(x => x.id === row.id) || { v: 0, n: 0, l: 0 };
        const pList = row.playersList || [];
        return {
            id: row.id,
            p: row.p,
            si: row.si,
            sport: row.sport,
            minPlayers: row.minPlayers || 5,
            maxPlayers: row.maxPlayers || 10,
            name: row.name,
            captain: row.captain,
            email: row.email,
            players: pList.length > 0 ? pList.length : row.players,
            playersList: pList,
            playersDetails: row.playersDetails || [],
            points: row.points,
            status: row.status,
            isRegistration: row.isRegistration,
            rec: `${st.v}V ${st.n}N ${st.l}D`
        };
    });
}

async function syncTeamPlayersList(client, teamId, promoId, sportId, playersList) {
    await client.query('DELETE FROM rejoindre_equipe WHERE id_equipe = $1', [teamId]);
    await client.query('DELETE FROM participer_sport WHERE id_equipe = $1', [teamId]);

    const cleanPlayers = (playersList || []).map(p => String(p || '').trim()).filter(Boolean);
    for (let i = 0; i < cleanPlayers.length; i++) {
        const participantId = await upsertParticipant(client, promoId, cleanPlayers[i]);

        await client.query(
            `INSERT INTO rejoindre_equipe (id_equipe, id_participant, ordre)
             VALUES ($1, $2, $3)
             ON CONFLICT (id_equipe, id_participant) DO UPDATE SET ordre = EXCLUDED.ordre`,
            [teamId, participantId, i]
        );

        await client.query(
            `INSERT INTO participer_sport (id_sport, id_equipe, id_participant)
             VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING`,
            [sportId, teamId, participantId]
        );
    }

    await client.query('UPDATE equipes SET nb_joueurs = $1 WHERE id = $2', [cleanPlayers.length, teamId]);
    await deleteOrphanParticipants(client);
}

export async function dbCreateTeam({ promo = 'A1', si = 0, name, captain, email = '', maxPlayers, playersList = [] }) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await ensureBaseReferences(client);

        const promoCode = String(promo || 'A1').trim().toUpperCase();
        const promoRes = await client.query('SELECT id, code FROM promos WHERE code = $1', [promoCode]);
        if (promoRes.rows.length === 0) throw new Error('INVALID_PROMO');
        const promoId = promoRes.rows[0].id;

        const sportIdx = Number(si) || 0;
        const sportRes = await client.query('SELECT id, nom, joueurs_min, joueurs_max FROM sports WHERE indice = $1', [sportIdx]);
        if (sportRes.rows.length === 0) throw new Error('INVALID_SPORT');
        const sportRow = sportRes.rows[0];

        const cleanPlayers = Array.isArray(playersList) ? playersList.map(p => String(p || '').trim()).filter(Boolean) : [];
        const teamName = String(name || '').trim() || `${promoCode} ${sportRow.nom}`;
        const teamCaptain = String(captain || '').trim() || cleanPlayers[0] || `Capitaine ${promoCode}`;
        const maxP = Math.max(1, Number(maxPlayers) || sportRow.joueurs_max || 10, cleanPlayers.length);
        const nowStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

        const insertRes = await client.query(
            `INSERT INTO equipes (id_promo, id_sport, nom, capitaine, email, nb_joueurs, nb_joueurs_max, date_inscription, statut, est_inscription, points)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Validée', FALSE, 0)
             RETURNING id`,
            [promoId, sportRow.id, teamName, teamCaptain, String(email || '').trim() || null, cleanPlayers.length || sportRow.joueurs_min, maxP, nowStr]
        );

        const teamId = insertRes.rows[0].id;
        if (cleanPlayers.length > 0) {
            await syncTeamPlayersList(client, teamId, promoId, sportRow.id, cleanPlayers);
        }

        await client.query('COMMIT');
        const teams = await dbGetTeams();
        return { team: teams.find(t => t.id === teamId), teams };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

export async function dbUpdateTeam(teamId, { promo, si, name, captain, email, maxPlayers, playersList }) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await ensureBaseReferences(client);

        const existingRes = await client.query('SELECT * FROM equipes WHERE id = $1', [teamId]);
        if (existingRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return null;
        }
        const row = existingRes.rows[0];

        let promoId = row.id_promo;
        if (promo) {
            const pRes = await client.query('SELECT id FROM promos WHERE code = $1', [String(promo).trim().toUpperCase()]);
            if (pRes.rows.length === 0) throw new Error('INVALID_PROMO');
            promoId = pRes.rows[0].id;
        }

        let sportId = row.id_sport;
        if (si !== undefined) {
            const sRes = await client.query('SELECT id FROM sports WHERE indice = $1', [Number(si)]);
            if (sRes.rows.length === 0) throw new Error('INVALID_SPORT');
            sportId = sRes.rows[0].id;
        }

        const nextName = name !== undefined && String(name).trim() ? String(name).trim() : row.nom;
        const nextCaptain = captain !== undefined && String(captain).trim() ? String(captain).trim() : row.capitaine;
        const nextEmail = email !== undefined ? (String(email).trim() || null) : row.email;
        const nextMax = maxPlayers !== undefined ? Math.max(1, Number(maxPlayers) || 10) : (row.nb_joueurs_max || 10);

        await client.query(
            `UPDATE equipes
             SET id_promo = $1, id_sport = $2, nom = $3, capitaine = $4, email = $5, nb_joueurs_max = $6
             WHERE id = $7`,
            [promoId, sportId, nextName, nextCaptain, nextEmail, nextMax, teamId]
        );

        if (Array.isArray(playersList)) {
            await syncTeamPlayersList(client, teamId, promoId, sportId, playersList);
        }

        await client.query('COMMIT');
        const teams = await dbGetTeams();
        return { team: teams.find(t => t.id === teamId), teams };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

export async function dbUpdateTeamMaxPlayers(teamId, { maxPlayers, delta }) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await ensureBaseReferences(client);

        const res = await client.query(
            `SELECT e.id, COALESCE(e.nb_joueurs_max, s.joueurs_max, 10) AS current_max,
                    (SELECT COUNT(*)::INT FROM rejoindre_equipe re WHERE re.id_equipe = e.id) AS player_count
             FROM equipes e
             JOIN sports s ON s.id = e.id_sport
             WHERE e.id = $1`,
            [teamId]
        );
        if (res.rows.length === 0) {
            await client.query('ROLLBACK');
            return null;
        }

        const { current_max, player_count } = res.rows[0];
        let nextMax = current_max;
        if (typeof delta === 'number') {
            nextMax = Math.max(1, player_count, current_max + delta);
        } else if (typeof maxPlayers === 'number') {
            nextMax = Math.max(1, player_count, maxPlayers);
        }

        await client.query('UPDATE equipes SET nb_joueurs_max = $1 WHERE id = $2', [nextMax, teamId]);
        await client.query('COMMIT');

        const teams = await dbGetTeams();
        return { team: teams.find(t => t.id === teamId), teams };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

export async function dbDeleteTeam(teamId) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM matchups WHERE id_equipe1 = $1 OR id_equipe2 = $1 OR gagnant = $1', [teamId]);
        const { rowCount } = await client.query('DELETE FROM equipes WHERE id = $1', [teamId]);
        if (rowCount === 0) {
            await client.query('ROLLBACK');
            return null;
        }
        await recomputeTeamPoints(client);
        await client.query('COMMIT');

        const [teams, matches] = await Promise.all([dbGetTeams(), dbGetMatches()]);
        return { teams, matches };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}
