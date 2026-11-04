// Migrations du schéma et référentiels de base (promos, sports, albums, édition).
import { pool } from '../db.js';
import { getDatabaseRole, setDatabaseRole } from '../environment.js';
import { DEFAULT_EDITION, DEFAULT_PROMOS, DEFAULT_SPORTS, DEFAULT_ALBUMS } from './constants.js';
import { addDays } from './edition.js';

let baseRefsPromise = null;

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

    await client.query(
        `INSERT INTO edition (annee, date_debut, heure_debut, lieu) VALUES ($1, $2, $3, $4) ON CONFLICT (unique_ligne) DO NOTHING`,
        [DEFAULT_EDITION.annee, DEFAULT_EDITION.dateDebut, DEFAULT_EDITION.heureDebut, DEFAULT_EDITION.lieu]
    );
    const { rows: editionRows } = await client.query(`SELECT TO_CHAR(date_debut, 'YYYY-MM-DD') AS debut FROM edition LIMIT 1`);
    const firstDay = editionRows[0].debut;

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
