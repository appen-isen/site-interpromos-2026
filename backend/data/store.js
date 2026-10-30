import { pool, query } from './db.js';
import { getDatabaseRole, setDatabaseRole } from './environment.js';

// Édition par défaut, utilisée uniquement pour initialiser une base vierge (modifiable ensuite dans l'Espace BDS)
export const DEFAULT_EDITION = { annee: 2026, dateDebut: '2026-11-03', heureDebut: '13:00', lieu: 'ISEN Nantes' };

// Phases des 3 jours du tournoi : [phase, code court]
const DAY_PHASES = [['Qualifs J1', 'J1'], ['Qualifs J2', 'J2'], ['Finales', 'J3']];

export const DEFAULT_PROMOS = [
    { code: 'A1', mascotte: 'Les Bits' },
    { code: 'A2', mascotte: 'Les Diodes' },
    { code: 'A3', mascotte: 'Les Ohms' },
    { code: 'A4', mascotte: 'Kernel Panic' },
    { code: 'A5', mascotte: 'Root Access' }
];

export const DEFAULT_SPORTS = [
    { indice: 0, nom: 'Football', nom_court: 'Foot', lieu: 'Terrain synthétique', min: 7, max: 10, poids: 1 },
    { indice: 1, nom: 'Basket', nom_court: 'Basket', lieu: 'Gymnase A', min: 5, max: 8, poids: 1 },
    { indice: 2, nom: 'Volley', nom_court: 'Volley', lieu: 'Gymnase B', min: 6, max: 9, poids: 1 },
    { indice: 3, nom: 'Handball', nom_court: 'Hand', lieu: 'Gymnase A', min: 7, max: 10, poids: 1 },
    { indice: 4, nom: 'Badminton', nom_court: 'Bad', lieu: 'Gymnase B', min: 2, max: 4, poids: 1 },
    { indice: 5, nom: 'Ultimate', nom_court: 'Ultimate', lieu: 'Terrain synthétique', min: 7, max: 10, poids: 1 }
];

// Albums créés uniquement sur une base vierge (l'admin peut ensuite les modifier ou les supprimer)
export const DEFAULT_ALBUMS = [
    { nom: 'Cérémonie & Ambiance', debut: 0, fin: 2 },
    { nom: 'Qualifications J1', debut: 0, fin: null },
    { nom: 'Qualifications J2', debut: 1, fin: null },
    { nom: 'Finales & Podiums', debut: 2, fin: null }
];

const SQL_TO_API_STATUS = {
    en_attente: 'up',
    en_cours: 'live',
    joue: 'done',
    annule: 'up'
};

const API_TO_SQL_STATUS = {
    up: 'en_attente',
    live: 'en_cours',
    done: 'joue',
    en_attente: 'en_attente',
    en_cours: 'en_cours',
    joue: 'joue',
    annule: 'annule'
};

let baseRefsPromise = null;

// Identifiants des tables : UUID. Toute autre valeur est traitée comme « introuvable ».
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = value => UUID_RE.test(String(value ?? ''));

/**
 * S'assure que les référentiels de base (promos A1-A5, 6 sports, albums) existent en base
 * afin que l'import CSV, la création de matchs et les inscriptions fonctionnent même sur une base vierge.
 */
export async function ensureBaseReferences(client = pool) {
    if (client === pool) {
        if (!baseRefsPromise) {
            baseRefsPromise = runEnsureBaseReferences(pool).catch(err => {
                baseRefsPromise = null;
                console.warn('Avertissement ensureBaseReferences :', err.message);
            });
        }
        return baseRefsPromise;
    }
    return runEnsureBaseReferences(client);
}

async function runEnsureBaseReferences(client, { backfillAlbumDates = false } = {}) {
    // Production : marque sa base « production » (la protège ensuite de tout test).
    // Prévisualisations Vercel (une par branche) : utilisent la base de développement ; on vérifie
    // seulement qu'elles ne tournent pas sur la base de production.
    if (process.env.VERCEL_ENV === 'production') {
        await setDatabaseRole('production', { client }).catch(err => {
            console.error(`ATTENTION : la base du site de production est mal configurée. ${err.message}`);
        });
    } else if (process.env.VERCEL_ENV === 'preview' && (await getDatabaseRole(client)) === 'production') {
        console.error('ATTENTION : ce déploiement de prévisualisation utilise la base de PRODUCTION. Donnez-lui la base de développement dans Vercel (variables « Preview »).');
    }

    for (const p of DEFAULT_PROMOS) {
        await client.query(
            `INSERT INTO promos (code, mascotte) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING`,
            [p.code, p.mascotte]
        );
    }
    for (const s of DEFAULT_SPORTS) {
        await client.query(
            `INSERT INTO sports (indice, nom, nom_court, lieu, joueurs_min, joueurs_max, poids)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (indice) DO NOTHING`,
            [s.indice, s.nom, s.nom_court, s.lieu, s.min, s.max, s.poids]
        );
    }
    const { rows: albumCount } = await client.query('SELECT COUNT(*)::INT AS c FROM albums');
    for (const album of DEFAULT_ALBUMS) {
        if (albumCount[0].c === 0) {
            await client.query(
                `INSERT INTO albums (nom, publie, date_debut, date_fin) VALUES ($1, TRUE, $2, $3) ON CONFLICT (nom) DO NOTHING`,
                [album.nom, addDays(firstDay, album.debut), album.fin === null ? null : addDays(firstDay, album.fin)]
            );
        } else if (backfillAlbumDates) {
            // Base existante sans dates : on date une seule fois les albums par défaut encore présents
            await client.query(
                'UPDATE albums SET date_debut = $2, date_fin = $3 WHERE nom = $1 AND date_debut IS NULL',
                [album.nom, addDays(firstDay, album.debut), album.fin === null ? null : addDays(firstDay, album.fin)]
            );
        }
    }
}

/**
 * Migration complète (npm run db:migrate, ou démarrage local) : schéma, mise à niveau et référentiels par défaut.
 * Jamais exécutée par les fonctions Vercel, pour ne pas verrouiller les tables à chaque démarrage à froid.
 */
export async function runMigrations(readSql) {
    const client = await pool.connect();
    try {
        const { rowCount: albumDatesExisted } = await client.query(
            `SELECT 1 FROM information_schema.columns WHERE table_name = 'albums' AND column_name = 'date_debut'`
        );

        // Ancienne base à identifiants entiers : conversion en UUID, en une seule transaction
        const { rows: idType } = await client.query(
            `SELECT data_type FROM information_schema.columns
             WHERE table_schema = current_schema() AND table_name = 'equipes' AND column_name = 'id'`
        );
        if (idType[0]?.data_type === 'integer') {
            console.log('Conversion des identifiants INT -> UUID...');
            await client.query('BEGIN');
            try {
                await client.query(readSql('upgrade-uuid.sql'));
                await client.query('COMMIT');
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            }
            console.log('Identifiants convertis en UUID.');
        }

        await client.query(readSql('init.sql'));
        // Anciens médias fictifs (sans fichier ou image de remplacement placehold.co)
        await client.query(`DELETE FROM photos WHERE url IS NULL OR url LIKE 'https://placehold.co/%'`);
        await runEnsureBaseReferences(client, { backfillAlbumDates: !albumDatesExisted });
    } finally {
        client.release();
    }
}

/**
 * Découpe « Prénom Nom » ; un seul mot donne un prénom sans nom de famille (jamais de nom inventé).
 */
export function splitFullName(fullName) {
    const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
    return { prenom: parts[0] || '', nom: parts.slice(1).join(' ') || null };
}

/**
 * Retrouve ou crée un participant à partir de son nom complet et retourne son id.
 * Avec nom et prénom, le même étudiant est réutilisé d'une équipe à l'autre ; avec un prénom seul,
 * on ne peut pas savoir qui c'est : un nouveau participant est créé (les orphelins sont supprimés ensuite).
 */
export async function upsertParticipant(client, promoId, fullName) {
    const { prenom, nom } = splitFullName(fullName);
    const { rows } = nom
        ? await client.query(
            `INSERT INTO participants (id_promo, nom, prenom) VALUES ($1, $2, $3)
             ON CONFLICT (nom, prenom) DO UPDATE SET id_promo = EXCLUDED.id_promo
             RETURNING id`,
            [promoId, nom, prenom]
        )
        : await client.query(
            'INSERT INTO participants (id_promo, nom, prenom) VALUES ($1, NULL, $2) RETURNING id',
            [promoId, prenom]
        );
    return rows[0].id;
}

/** Supprime les participants qui ne font plus partie d'aucune équipe. */
export async function deleteOrphanParticipants(client) {
    await client.query(
        'DELETE FROM participants pa WHERE NOT EXISTS (SELECT 1 FROM rejoindre_equipe re WHERE re.id_participant = pa.id)'
    );
}

/**
 * Trouve ou crée une équipe officielle pour un couple (id_promo, id_sport)
 */
export async function findOrCreatePromoSportTeam(client, promoId, promoCode, sportId, sportName, playersMin = 5) {
    const existing = await client.query(
        `SELECT id FROM equipes
         WHERE id_promo = $1 AND id_sport = $2 AND est_inscription = FALSE
         ORDER BY cree_le ASC LIMIT 1`,
        [promoId, sportId]
    );
    if (existing.rows.length > 0) {
        return existing.rows[0].id;
    }

    const created = await client.query(
        `INSERT INTO equipes (id_promo, id_sport, nom, capitaine, nb_joueurs, date_inscription, statut, est_inscription, points)
         VALUES ($1, $2, $3, $4, $5, NOW()::TEXT, 'Validée', FALSE, 0)
         RETURNING id`,
        [promoId, sportId, `${promoCode} ${sportName}`, `Capitaine ${promoCode}`, playersMin]
    );
    return created.rows[0].id;
}

/**
 * Recalcule la colonne points de la table equipes à partir des matchs joués
 */
async function recomputeTeamPoints(client = pool) {
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
        ), 0)
        WHERE e.est_inscription = FALSE;
    `);
}

// ============================================================================
// Référentiels : Promos & Sports
// ============================================================================

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

// ============================================================================
// Matchs & Scores en direct
// ============================================================================

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

export async function dbCreateMatch({ d = 0, t = '13:00', si = 0, a = 'A1', b = 'A2', venue = '', phase = 'Qualification', status = 'up', scoreA = 0, scoreB = 0 }) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await ensureBaseReferences(client);

        const dayNum = Math.min(2, Math.max(0, Number(d) || 0));
        const sportIdx = Number(si) || 0;
        const promoACode = String(a || 'A1').trim().toUpperCase();
        const promoBCode = String(b || 'A2').trim().toUpperCase();

        if (promoACode === promoBCode) {
            throw new Error('SAME_PROMO');
        }

        const sportRes = await client.query('SELECT id, nom, nom_court, lieu, joueurs_min FROM sports WHERE indice = $1', [sportIdx]);
        if (sportRes.rows.length === 0) throw new Error('INVALID_SPORT');
        const sportRow = sportRes.rows[0];

        const promoARes = await client.query('SELECT id, code FROM promos WHERE code = $1', [promoACode]);
        const promoBRes = await client.query('SELECT id, code FROM promos WHERE code = $1', [promoBCode]);
        if (promoARes.rows.length === 0 || promoBRes.rows.length === 0) {
            throw new Error('INVALID_PROMO');
        }

        const team1Id = await findOrCreatePromoSportTeam(client, promoARes.rows[0].id, promoACode, sportRow.id, sportRow.nom, sportRow.joueurs_min);
        const team2Id = await findOrCreatePromoSportTeam(client, promoBRes.rows[0].id, promoBCode, sportRow.id, sportRow.nom, sportRow.joueurs_min);

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

export async function dbUpdateMatch(codeMatch, { d, t, si, a, b, venue, phase, status, scoreA, scoreB }) {
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

        let team1Id = row.id_equipe1;
        let team2Id = row.id_equipe2;

        if (a) {
            const promoARes = await client.query('SELECT id, code FROM promos WHERE code = $1', [String(a).trim().toUpperCase()]);
            if (promoARes.rows.length === 0) throw new Error('INVALID_PROMO');
            team1Id = await findOrCreatePromoSportTeam(client, promoARes.rows[0].id, promoARes.rows[0].code, sportRow.id, sportRow.nom, sportRow.joueurs_min);
        } else if (sportRow.id !== row.id_sport) {
            const p1Res = await client.query('SELECT p.id, p.code FROM equipes e JOIN promos p ON p.id = e.id_promo WHERE e.id = $1', [row.id_equipe1]);
            if (p1Res.rows.length > 0) {
                team1Id = await findOrCreatePromoSportTeam(client, p1Res.rows[0].id, p1Res.rows[0].code, sportRow.id, sportRow.nom, sportRow.joueurs_min);
            }
        }

        if (b) {
            const promoBRes = await client.query('SELECT id, code FROM promos WHERE code = $1', [String(b).trim().toUpperCase()]);
            if (promoBRes.rows.length === 0) throw new Error('INVALID_PROMO');
            team2Id = await findOrCreatePromoSportTeam(client, promoBRes.rows[0].id, promoBRes.rows[0].code, sportRow.id, sportRow.nom, sportRow.joueurs_min);
        } else if (sportRow.id !== row.id_sport) {
            const p2Res = await client.query('SELECT p.id, p.code FROM equipes e JOIN promos p ON p.id = e.id_promo WHERE e.id = $1', [row.id_equipe2]);
            if (p2Res.rows.length > 0) {
                team2Id = await findOrCreatePromoSportTeam(client, p2Res.rows[0].id, p2Res.rows[0].code, sportRow.id, sportRow.nom, sportRow.joueurs_min);
            }
        }

        if (team1Id === team2Id) {
            throw new Error('SAME_PROMO');
        }

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

export async function dbGenerateSchedule({ clearExisting = false } = {}) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await ensureBaseReferences(client);

        if (clearExisting) {
            await client.query('DELETE FROM matchups');
        }

        const promosRes = await client.query('SELECT id, code FROM promos ORDER BY code ASC');
        const sportsRes = await client.query('SELECT id, indice, nom, nom_court, lieu, joueurs_min FROM sports ORDER BY indice ASC');

        const promos = promosRes.rows;
        const sports = sportsRes.rows;

        const pairsJ1 = [[0, 1], [2, 3], [0, 4]];
        const pairsJ2 = [[1, 2], [3, 4], [0, 2]];
        const pairsJ3 = [[1, 3], [2, 4]];
        const times = ['13:30', '14:30', '15:30', '16:30', '17:30'];

        let createdCount = 0;

        const schedulePlan = [
            { day: 0, pairs: pairsJ1, phase: 'Qualification' },
            { day: 1, pairs: pairsJ2, phase: 'Qualification' },
            { day: 2, pairs: pairsJ3, phase: 'Finale' }
        ];

        for (const sp of sports) {
            for (const block of schedulePlan) {
                for (let pi = 0; pi < block.pairs.length; pi++) {
                    const [ia, ib] = block.pairs[pi];
                    const pa = promos[ia % promos.length];
                    const pb = promos[ib % promos.length];
                    if (!pa || !pb || pa.id === pb.id) continue;

                    const t1 = await findOrCreatePromoSportTeam(client, pa.id, pa.code, sp.id, sp.nom, sp.joueurs_min);
                    const t2 = await findOrCreatePromoSportTeam(client, pb.id, pb.code, sp.id, sp.nom, sp.joueurs_min);
                    const timeStr = times[(pi + sp.indice) % times.length];
                    const code = `G-J${block.day + 1}-S${sp.indice}-${pa.code}${pb.code}-${pi}`;

                    const res = await client.query(
                        `INSERT INTO matchups (code_match, id_sport, id_equipe1, id_equipe2, jour, creneau, heure, phase, lieu, score_equipe1, score_equipe2, statut)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, 0, 'en_attente')
                         ON CONFLICT (code_match) DO NOTHING`,
                        [code, sp.id, t1, t2, block.day, pi + 1, timeStr, block.phase, sp.lieu]
                    );
                    createdCount += res.rowCount;
                }
            }
        }

        await recomputeTeamPoints(client);
        await client.query('COMMIT');

        const matches = await dbGetMatches();
        return { createdCount, matches };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

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

// ============================================================================
// Classements (via les vues SQL v_classement_sport et v_classement_general)
// ============================================================================

export async function dbGetStandings() {
    const [genRes, sportRes, sportsList] = await Promise.all([
        // Départage : points, puis victoires, puis code de promo (ordre stable)
        query('SELECT id_promo, p, mascot, v, n, l, pts FROM v_classement_general ORDER BY pts DESC, v DESC, p ASC'),
        query('SELECT id_promo, promo AS p, mascotte AS mascot, id_sport, si, sport, v, n, l, pts FROM v_classement_sport ORDER BY si ASC, pts DESC, v DESC, promo ASC'),
        dbGetSports()
    ]);

    const maxGenPts = Math.max(1, genRes.rows[0]?.pts || 0);

    const general = genRes.rows.map((r, i) => {
        const per = sportsList.map(sp => {
            const spRow = sportRes.rows.find(x => x.p === r.p && x.si === sp.indice);
            return spRow ? spRow.pts : 0;
        });
        return {
            p: r.p,
            mascot: r.mascot,
            v: r.v,
            n: r.n,
            l: r.l,
            pts: r.pts,
            pos: i + 1,
            rec: `${r.v} · ${r.n} · ${r.l}`,
            w: `${Math.round((r.pts / maxGenPts) * 100)}%`,
            per
        };
    });

    const bySport = sportsList.map(sp => {
        const rowsForSport = sportRes.rows.filter(x => x.si === sp.indice);
        const maxSpPts = Math.max(1, rowsForSport[0]?.pts || 0);
        return {
            sport: sp.name,
            si: sp.indice,
            coef: Number(sp.poids) || 1,
            standings: rowsForSport.map((r, i) => ({
                p: r.p,
                mascot: r.mascot,
                v: r.v,
                n: r.n,
                l: r.l,
                pts: r.pts,
                pos: i + 1,
                rec: `${r.v} · ${r.n} · ${r.l}`,
                w: `${Math.round((r.pts / maxSpPts) * 100)}%`
            }))
        };
    });

    return { general, bySport };
}

// ============================================================================
// Équipes & Participants (/api/teams)
// ============================================================================

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
        query('SELECT promo AS p, si, v, n, l FROM v_classement_sport')
    ]);

    return rows.map(row => {
        const st = standRows.find(x => x.p === row.p && x.si === row.si) || { v: 0, n: 0, l: 0 };
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

// ============================================================================
// Inscriptions & Participants (/api/registrations)
// ============================================================================

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

// ============================================================================
// Galerie & Albums (/api/gallery)
// ============================================================================

const MEDIA_COLUMNS = `
    p.id,
    p.ordre AS i,
    a.nom AS album,
    a.publie AS "albumPublished",
    p.legende AS caption,
    p.url,
    p.grand_format AS big,
    COALESCE(p.type_media, 'image') AS type,
    p.emplacement AS slot
`;

// Emplacements du site pouvant afficher un média mis en avant
export const MEDIA_SLOTS = ['hero'];

/**
 * Galerie : albums, médias et médias mis en avant (slots).
 * publicOnly = true : uniquement les médias des albums publiés (site public).
 */
export async function dbGetGallery(albumFilter, { publicOnly = false } = {}) {
    await ensureBaseReferences();

    const albumRes = await query(`
        SELECT a.id, a.nom, a.publie,
               TO_CHAR(a.date_debut, 'YYYY-MM-DD') AS debut,
               TO_CHAR(a.date_fin, 'YYYY-MM-DD') AS fin,
               COUNT(p.id) FILTER (WHERE p.url IS NOT NULL)::INT AS count
        FROM albums a
        LEFT JOIN photos p ON p.id_album = a.id
        GROUP BY a.id
        ORDER BY a.date_debut ASC NULLS LAST, a.cree_le ASC
    `);

    const pub = {};
    const albums = albumRes.rows.map(a => {
        pub[a.nom] = Boolean(a.publie);
        return {
            id: a.id,
            name: a.nom,
            published: Boolean(a.publie),
            start: a.debut,
            end: a.fin,
            count: a.count
        };
    });

    // Les anciennes entrées sans fichier (url NULL) ne sont plus affichées
    const conditions = ['p.url IS NOT NULL'];
    const params = [];
    if (publicOnly) {
        conditions.push('a.publie = TRUE');
        // Le média mis en avant sur l'accueil n'est pas répété dans la galerie publique
        conditions.push('p.emplacement IS NULL');
    }
    if (albumFilter && albumFilter !== 'Tout') {
        params.push(albumFilter);
        conditions.push(`a.nom = $${params.length}`);
    }

    const [photoRes, slotRes] = await Promise.all([
        query(
            `SELECT ${MEDIA_COLUMNS}
             FROM photos p
             JOIN albums a ON a.id = p.id_album
             WHERE ${conditions.join(' AND ')}
             ORDER BY p.ordre ASC, p.cree_le ASC`,
            params
        ),
        query(
            `SELECT ${MEDIA_COLUMNS}
             FROM photos p
             JOIN albums a ON a.id = p.id_album
             WHERE p.emplacement IS NOT NULL AND p.url IS NOT NULL`
        )
    ]);

    const slots = {};
    for (const row of slotRes.rows) {
        slots[row.slot] = row;
    }

    return { albums, pub, photos: photoRes.rows, slots };
}

export async function dbCreateMedia({ album, caption, url, type = 'image', storagePath = null }) {
    await ensureBaseReferences();

    let albumRow = null;
    if (album) {
        albumRow = (await query('SELECT id, nom FROM albums WHERE nom = $1', [album])).rows[0] || null;
    }
    if (!albumRow) {
        albumRow = (await query('SELECT id, nom FROM albums ORDER BY cree_le ASC LIMIT 1')).rows[0] || null;
    }
    if (!albumRow) throw new Error('NO_ALBUM');

    const legende = String(caption || '').trim().slice(0, 200) || albumRow.nom;
    const { rows } = await query(
        `INSERT INTO photos (id_album, ordre, legende, url, grand_format, type_media, chemin_stockage)
         VALUES ($1, (SELECT COALESCE(MAX(ordre), -1) + 1 FROM photos), $2, $3, FALSE, $4, $5)
         RETURNING id`,
        [albumRow.id, legende, url, type === 'video' ? 'video' : 'image', storagePath]
    );
    return rows[0].id;
}

export async function dbUpdateMedia(id, { caption, album, big }) {
    if (!isUuid(id)) return false;
    const sets = [];
    const params = [];

    if (caption !== undefined) {
        params.push(String(caption).trim().slice(0, 200));
        sets.push(`legende = $${params.length}`);
    }
    if (big !== undefined) {
        params.push(Boolean(big));
        sets.push(`grand_format = $${params.length}`);
    }
    if (album !== undefined) {
        const albumRes = await query('SELECT id FROM albums WHERE nom = $1', [album]);
        if (albumRes.rows.length === 0) throw new Error('INVALID_ALBUM');
        params.push(albumRes.rows[0].id);
        sets.push(`id_album = $${params.length}`);
    }

    if (sets.length === 0) {
        const { rowCount } = await query('SELECT 1 FROM photos WHERE id = $1', [id]);
        return rowCount > 0;
    }

    params.push(id);
    const { rowCount } = await query(`UPDATE photos SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
    return rowCount > 0;
}

export async function dbDeleteMedia(id) {
    if (!isUuid(id)) return null;
    const { rows } = await query(
        'DELETE FROM photos WHERE id = $1 RETURNING chemin_stockage AS "storagePath"',
        [id]
    );
    return rows[0] || null;
}

/**
 * Place un média dans un emplacement du site (ex : 'hero' = en-tête de l'accueil).
 * mediaId = null retire le média actuellement placé.
 */
export async function dbSetMediaSlot(slot, mediaId) {
    if (mediaId && !isUuid(mediaId)) return false;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('UPDATE photos SET emplacement = NULL WHERE emplacement = $1', [slot]);
        if (mediaId) {
            const { rowCount } = await client.query(
                'UPDATE photos SET emplacement = $1 WHERE id = $2 AND url IS NOT NULL',
                [slot, mediaId]
            );
            if (rowCount === 0) {
                await client.query('ROLLBACK');
                return false;
            }
        }
        await client.query('COMMIT');
        return true;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

export async function dbUpdateAlbumVisibility(name, published) {
    const { rows } = await query('SELECT id, publie FROM albums WHERE nom = $1', [name]);
    if (rows.length === 0) return null;

    const nextVal = typeof published === 'boolean' ? published : !rows[0].publie;
    await query('UPDATE albums SET publie = $1 WHERE id = $2', [nextVal, rows[0].id]);

    const { pub } = await dbGetGallery();
    return { name, published: nextVal, pub };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function parseAlbumDate(value) {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    const str = String(value);
    if (!ISO_DATE.test(str) || Number.isNaN(Date.parse(`${str}T00:00:00Z`))) throw new Error('INVALID_DATE');
    return str;
}

/**
 * Valide les champs d'un album (nom, dates). Lève INVALID_NAME / INVALID_DATE / INVALID_RANGE.
 */
function normalizeAlbumInput({ name, start, end, published }) {
    const out = {};
    if (name !== undefined) {
        out.name = String(name || '').trim().slice(0, 80);
        if (!out.name) throw new Error('INVALID_NAME');
    }
    out.start = parseAlbumDate(start);
    out.end = parseAlbumDate(end);
    if (out.end && out.start === null) throw new Error('INVALID_RANGE');
    if (out.start && out.end && out.end < out.start) throw new Error('INVALID_RANGE');
    if (published !== undefined) out.published = Boolean(published);
    return out;
}

/**
 * Crée un album (catégorie de la galerie), éventuellement daté pour un événement passé, en cours ou à venir.
 * Retourne null si un album du même nom existe déjà.
 */
export async function dbCreateAlbum(input) {
    const { name, start = null, end = null, published = true } = normalizeAlbumInput({
        ...input,
        name: input.name ?? '',
        start: input.start ?? null,
        end: input.end ?? null
    });
    const { rows } = await query(
        `INSERT INTO albums (nom, publie, date_debut, date_fin) VALUES ($1, $2, $3, $4)
         ON CONFLICT (nom) DO NOTHING RETURNING id`,
        [name, published, start, end]
    );
    return rows[0]?.id ?? null;
}

/**
 * Modifie un album. Retourne false s'il n'existe pas ; lève DUPLICATE_NAME si le nom est déjà pris.
 */
export async function dbUpdateAlbum(id, input) {
    if (!isUuid(id)) return false;
    const { name, start, end, published } = normalizeAlbumInput(input);
    const sets = [];
    const params = [];
    const add = (col, val) => {
        params.push(val);
        sets.push(`${col} = $${params.length}`);
    };
    if (name !== undefined) add('nom', name);
    if (start !== undefined) add('date_debut', start);
    if (end !== undefined) add('date_fin', end);
    if (published !== undefined) add('publie', published);

    if (sets.length === 0) {
        const { rowCount } = await query('SELECT 1 FROM albums WHERE id = $1', [id]);
        return rowCount > 0;
    }

    params.push(id);
    try {
        const { rowCount } = await query(`UPDATE albums SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
        return rowCount > 0;
    } catch (err) {
        if (err.code === '23505') throw new Error('DUPLICATE_NAME');
        throw err;
    }
}

/**
 * Supprime un album vide. Retourne 'not_found', 'not_empty' ou 'deleted'.
 */
export async function dbDeleteAlbum(id) {
    if (!isUuid(id)) return 'not_found';
    const { rows } = await query(
        `SELECT a.id, COUNT(p.id)::INT AS count FROM albums a LEFT JOIN photos p ON p.id_album = a.id
         WHERE a.id = $1 GROUP BY a.id`,
        [id]
    );
    if (rows.length === 0) return 'not_found';
    if (rows[0].count > 0) return 'not_empty';
    await query('DELETE FROM albums WHERE id = $1', [id]);
    return 'deleted';
}

// ============================================================================
// Édition du tournoi (/api/edition)
// ============================================================================

function addDays(isoDate, days) {
    const d = new Date(`${isoDate}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);
const DAY_LABEL = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const DAY_MONTH = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' });

// Décalage horaire de Paris à une date donnée (+01:00 en hiver, +02:00 en été)
function parisOffset(isoDate, time) {
    const probe = new Date(`${isoDate}T${time}:00Z`);
    const part = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', timeZoneName: 'longOffset' })
        .formatToParts(probe)
        .find(p => p.type === 'timeZoneName')?.value || 'GMT+01:00';
    return part === 'GMT' ? '+00:00' : part.replace('GMT', '');
}

// Plage lisible : « 3 – 5 novembre », ou « 30 octobre – 1 novembre » si le tournoi change de mois
function formatRange(start, end) {
    const [a, b] = [DAY_MONTH.format(new Date(`${start}T12:00:00Z`)), DAY_MONTH.format(new Date(`${end}T12:00:00Z`))];
    const [dayA, ...monthA] = a.split(' ');
    const [dayB, ...monthB] = b.split(' ');
    return monthA.join(' ') === monthB.join(' ') ? `${dayA} – ${dayB} ${monthB.join(' ')}` : `${a} – ${b}`;
}

function buildEdition(row) {
    const start = row.debut;
    const dates = DAY_PHASES.map((_, i) => addDays(start, i));
    return {
        year: row.annee,
        shortYear: String(row.annee).slice(-2),
        start,
        end: dates[dates.length - 1],
        time: row.heure,
        venue: row.lieu,
        contact: row.contact || null,
        startsAt: `${start}T${row.heure}:00${parisOffset(start, row.heure)}`,
        range: formatRange(start, dates[dates.length - 1]),
        days: dates.map((iso, i) => [
            capitalize(DAY_LABEL.format(new Date(`${iso}T12:00:00Z`))),
            DAY_PHASES[i][0],
            DAY_PHASES[i][1]
        ])
    };
}

export async function dbGetEdition() {
    await ensureBaseReferences();
    const { rows } = await query(
        `SELECT annee, TO_CHAR(date_debut, 'YYYY-MM-DD') AS debut, heure_debut AS heure, lieu, contact_email AS contact
         FROM edition LIMIT 1`
    );
    const row = rows[0] || {
        annee: DEFAULT_EDITION.annee,
        debut: DEFAULT_EDITION.dateDebut,
        heure: DEFAULT_EDITION.heureDebut,
        lieu: DEFAULT_EDITION.lieu,
        contact: null
    };
    return buildEdition(row);
}

/**
 * Modifie l'édition. Lève INVALID_YEAR / INVALID_DATE / YEAR_MISMATCH / INVALID_TIME / INVALID_VENUE / INVALID_CONTACT.
 */
export async function dbUpdateEdition({ year, start, time, venue, contact }) {
    const annee = Number(year);
    if (!Number.isInteger(annee) || annee < 2000 || annee > 2100) throw new Error('INVALID_YEAR');
    const debut = String(start || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(debut) || Number.isNaN(Date.parse(`${debut}T00:00:00Z`))) throw new Error('INVALID_DATE');
    if (Number(debut.slice(0, 4)) !== annee) throw new Error('YEAR_MISMATCH');
    const heure = String(time || '13:00');
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(heure)) throw new Error('INVALID_TIME');
    const lieu = String(venue ?? DEFAULT_EDITION.lieu).trim().slice(0, 80);
    if (!lieu) throw new Error('INVALID_VENUE');
    const contactEmail = String(contact ?? '').trim().toLowerCase().slice(0, 120) || null;
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) throw new Error('INVALID_CONTACT');

    await ensureBaseReferences();
    await query(
        `UPDATE edition SET annee = $1, date_debut = $2, heure_debut = $3, lieu = $4, contact_email = $5, modifie_le = clock_timestamp()`,
        [annee, debut, heure, lieu, contactEmail]
    );
    return dbGetEdition();
}
