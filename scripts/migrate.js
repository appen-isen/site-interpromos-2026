// Met à jour le schéma de la base (tables, vues, référentiels par défaut).
// Développement (base de .env) :              npm run db:migrate
// Production (base de .env.production) :      npm run db:migrate:prod   (marque aussi la base « production »)

import { pool, readSql } from '../backend/data/db.js';
import { runMigrations } from '../backend/data/store.js';
import { getDatabaseRole, setDatabaseRole } from '../backend/data/environment.js';

const production = process.argv.includes('--production');
const target = production ? 'production' : process.env.DATABASE_ROLE || null;

try {
    const host = (() => { try { return new URL(process.env.DATABASE_URL).host; } catch (e) { return '?'; } })();
    const current = await getDatabaseRole();
    console.log(`Base visée : ${host} · rôle actuel : ${current || 'non marquée'}${production ? ' · migration de PRODUCTION' : ''}`);

    // Vérifications avant de toucher au schéma
    if (current === 'production' && !production) {
        throw new Error('cette base est la base de production. Utilisez npm run db:migrate:prod (fichier .env.production).');
    }
    if (current === 'production' && process.env.NODE_ENV === 'test') {
        throw new Error('migration de test refusée sur la base de production.');
    }
    if (target && current && current !== target) {
        throw new Error(`cette base est marquée « ${current} », pas « ${target} ». Vérifiez DATABASE_URL (ou npm run db:role).`);
    }

    console.log('Migration du schéma...');
    await runMigrations(readSql);
    if (target) await setDatabaseRole(target);
    console.log(`Schéma à jour. Rôle de la base : ${(await getDatabaseRole()) || 'non marquée'}.`);
} catch (err) {
    console.error('Migration refusée :', err.message);
    process.exitCode = 1;
} finally {
    await pool.end();
}
