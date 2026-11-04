// Joueurs d'une équipe : ajout, retrait, déplacement, capitaine.
import { pool } from '../db.js';
import { upsertParticipant } from './participants.js';
import { ensureBaseReferences } from './schema.js';
import { dbGetTeams } from './teams.js';

export async function dbAddPlayerToTeam(teamId, { fullName, autoIncreaseMax = false }) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await ensureBaseReferences(client);

        const cleanName = String(fullName || '').trim();
        if (!cleanName) throw new Error('EMPTY_PLAYER_NAME');

        const teamRes = await client.query(
            `SELECT e.id, e.id_promo, e.id_sport, COALESCE(e.nb_joueurs_max, s.joueurs_max, 10) AS max_players
             FROM equipes e
             JOIN sports s ON s.id = e.id_sport
             WHERE e.id = $1`,
            [teamId]
        );
        if (teamRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return null;
        }
        const teamRow = teamRes.rows[0];

        const countRes = await client.query(
            'SELECT COUNT(*)::INT AS c, COALESCE(MAX(ordre), -1)::INT AS max_ordre FROM rejoindre_equipe WHERE id_equipe = $1',
            [teamId]
        );
        const currentCount = countRes.rows[0]?.c || 0;
        const nextOrdre = (countRes.rows[0]?.max_ordre ?? -1) + 1;

        if (currentCount >= teamRow.max_players) {
            if (autoIncreaseMax) {
                await client.query('UPDATE equipes SET nb_joueurs_max = $1 WHERE id = $2', [currentCount + 1, teamId]);
            } else {
                throw new Error('MAX_PLAYERS_REACHED');
            }
        }

        const participantId = await upsertParticipant(client, teamRow.id_promo, cleanName);

        await client.query(
            `INSERT INTO rejoindre_equipe (id_equipe, id_participant, ordre)
             VALUES ($1, $2, $3)
             ON CONFLICT (id_equipe, id_participant) DO NOTHING`,
            [teamId, participantId, nextOrdre]
        );

        await client.query(
            `INSERT INTO participer_sport (id_sport, id_equipe, id_participant)
             VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING`,
            [teamRow.id_sport, teamId, participantId]
        );

        const newCountRes = await client.query('SELECT COUNT(*)::INT AS c FROM rejoindre_equipe WHERE id_equipe = $1', [teamId]);
        await client.query('UPDATE equipes SET nb_joueurs = $1 WHERE id = $2', [newCountRes.rows[0]?.c || 1, teamId]);

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

export async function dbRemovePlayerFromTeam(teamId, participantId) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(
            'DELETE FROM rejoindre_equipe WHERE id_equipe = $1 AND id_participant = $2',
            [teamId, participantId]
        );
        await client.query(
            'DELETE FROM participer_sport WHERE id_equipe = $1 AND id_participant = $2',
            [teamId, participantId]
        );

        const remainingRes = await client.query(
            `SELECT pa.id, CONCAT_WS(' ', pa.prenom, pa.nom) AS full_name
             FROM rejoindre_equipe re
             JOIN participants pa ON pa.id = re.id_participant
             WHERE re.id_equipe = $1
             ORDER BY re.ordre ASC, pa.cree_le ASC`,
            [teamId]
        );

        for (let i = 0; i < remainingRes.rows.length; i++) {
            await client.query(
                'UPDATE rejoindre_equipe SET ordre = $1 WHERE id_equipe = $2 AND id_participant = $3',
                [i, teamId, remainingRes.rows[i].id]
            );
        }

        await client.query(
            'UPDATE equipes SET nb_joueurs = $1 WHERE id = $2',
            [remainingRes.rows.length, teamId]
        );

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

export async function dbMovePlayer(teamId, { participantId, direction, targetTeamId, makeCaptain }) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await ensureBaseReferences(client);

        // Cas 1 : Transfert du joueur vers une autre équipe
        if (targetTeamId && String(targetTeamId) !== String(teamId)) {
            const destId = String(targetTeamId);
            const destRes = await client.query(
                `SELECT e.id, e.id_promo, e.id_sport, COALESCE(e.nb_joueurs_max, s.joueurs_max, 10) AS max_players,
                        (SELECT COUNT(*)::INT FROM rejoindre_equipe re WHERE re.id_equipe = e.id) AS current_count,
                        COALESCE((SELECT MAX(ordre) FROM rejoindre_equipe re WHERE re.id_equipe = e.id), -1)::INT AS max_ordre
                 FROM equipes e
                 JOIN sports s ON s.id = e.id_sport
                 WHERE e.id = $1`,
                [destId]
            );
            if (destRes.rows.length === 0) throw new Error('TARGET_TEAM_NOT_FOUND');
            const dest = destRes.rows[0];

            if (dest.current_count >= dest.max_players) {
                throw new Error('TARGET_MAX_PLAYERS_REACHED');
            }

            // Retirer de l'équipe d'origine
            await client.query('DELETE FROM rejoindre_equipe WHERE id_equipe = $1 AND id_participant = $2', [teamId, participantId]);
            await client.query('DELETE FROM participer_sport WHERE id_equipe = $1 AND id_participant = $2', [teamId, participantId]);

            // Mettre à jour la promo du participant et l'ajouter à l'équipe cible
            await client.query('UPDATE participants SET id_promo = $1 WHERE id = $2', [dest.id_promo, participantId]);
            await client.query(
                `INSERT INTO rejoindre_equipe (id_equipe, id_participant, ordre)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (id_equipe, id_participant) DO NOTHING`,
                [destId, participantId, dest.max_ordre + 1]
            );
            await client.query(
                `INSERT INTO participer_sport (id_sport, id_equipe, id_participant)
                 VALUES ($1, $2, $3)
                 ON CONFLICT DO NOTHING`,
                [dest.id_sport, destId, participantId]
            );

            // Recalculer nb_joueurs pour les deux équipes
            await client.query(
                'UPDATE equipes SET nb_joueurs = (SELECT COUNT(*)::INT FROM rejoindre_equipe WHERE id_equipe = $1) WHERE id = $1',
                [teamId]
            );
            await client.query(
                'UPDATE equipes SET nb_joueurs = (SELECT COUNT(*)::INT FROM rejoindre_equipe WHERE id_equipe = $1) WHERE id = $1',
                [destId]
            );

            await client.query('COMMIT');
            const teams = await dbGetTeams();
            return { teams };
        }

        // Cas 2 : Réordonnancement dans la même équipe (haut / bas / définir comme capitaine)
        const rosterRes = await client.query(
            `SELECT pa.id, CONCAT_WS(' ', pa.prenom, pa.nom) AS full_name
             FROM rejoindre_equipe re
             JOIN participants pa ON pa.id = re.id_participant
             WHERE re.id_equipe = $1
             ORDER BY re.ordre ASC, pa.cree_le ASC`,
            [teamId]
        );

        const roster = rosterRes.rows;
        const idx = roster.findIndex(r => String(r.id) === String(participantId));
        if (idx === -1) {
            await client.query('ROLLBACK');
            return null;
        }

        if (makeCaptain) {
            const [picked] = roster.splice(idx, 1);
            roster.unshift(picked);
            await client.query('UPDATE equipes SET capitaine = $1 WHERE id = $2', [picked.full_name, teamId]);
        } else if (direction === 'up' && idx > 0) {
            [roster[idx - 1], roster[idx]] = [roster[idx], roster[idx - 1]];
        } else if (direction === 'down' && idx < roster.length - 1) {
            [roster[idx + 1], roster[idx]] = [roster[idx], roster[idx + 1]];
        }

        for (let i = 0; i < roster.length; i++) {
            await client.query(
                'UPDATE rejoindre_equipe SET ordre = $1 WHERE id_equipe = $2 AND id_participant = $3',
                [i, teamId, roster[i].id]
            );
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
