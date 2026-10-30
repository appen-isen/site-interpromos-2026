// Change volontairement le rôle d'une base (development, production, preview, test).
// Sert à corriger un marquage erroné ; affiche la base visée avant d'agir.
//
//   npm run db:role                          affiche le rôle de la base de .env
//   npm run db:role -- development --force   reclasse la base de .env en développement
//   npm run db:role:prod                     affiche le rôle de la base de .env.production
import { pool } from '../backend/data/db.js';
import { DATABASE_ROLES, getDatabaseRole, setDatabaseRole } from '../backend/data/environment.js';

const role = process.argv.slice(2).find(arg => !arg.startsWith('--'));
const force = process.argv.includes('--force');

try {
    const url = new URL(process.env.DATABASE_URL);
    const current = await getDatabaseRole();
    console.log(`Base visée : ${url.host}${url.pathname}`);
    console.log(`Rôle actuel : ${current || 'non marquée'}`);

    if (role) {
        if (!DATABASE_ROLES.includes(role)) throw new Error(`Rôle inconnu « ${role} » (${DATABASE_ROLES.join(', ')}).`);
        if (current && current !== role && !force) {
            throw new Error(`Pour passer de « ${current} » à « ${role} », relancez avec --force après avoir vérifié la base visée ci-dessus.`);
        }
        await setDatabaseRole(role, { force });
        console.log(`Nouveau rôle : ${role}`);
    }
} catch (err) {
    console.error(err.code === '42P01' ? 'Table meta_base absente : lancez d’abord la migration.' : err.message);
    process.exitCode = 1;
} finally {
    await pool.end();
}
