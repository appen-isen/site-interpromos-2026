
import { pool } from '../backend/data/db.js';

const ROLE = 'bds';
const args = process.argv.slice(2);
const email = args.find(a => !a.startsWith('--'))?.trim().toLowerCase();

try {
    if (args.includes('--list')) {
        const { rows } = await pool.query(
            `SELECT email, last_sign_in_at FROM auth.users WHERE raw_app_meta_data->>'role' = $1 ORDER BY email`,
            [ROLE]
        );
        console.log(rows.length ? rows.map(r => `- ${r.email} (dernière connexion : ${r.last_sign_in_at?.toISOString().slice(0, 16) || 'jamais'})`).join('\n') : 'Aucun compte BDS.');
    } else if (!email) {
        console.error('Usage : npm run admin:grant -- <e-mail> [--revoke]   ou   npm run admin:grant -- --list');
        process.exitCode = 1;
    } else {
        const revoke = args.includes('--revoke');
        const { rowCount } = await pool.query(
            revoke
                ? `UPDATE auth.users SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) - 'role'
                   WHERE LOWER(email) = $1 AND raw_app_meta_data->>'role' = '${ROLE}'`
                : `UPDATE auth.users SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', '${ROLE}')
                   WHERE LOWER(email) = $1`,
            [email]
        );
        if (!rowCount) {
            console.error(revoke
                ? `${email} n'avait pas l'accès BDS (ou n'existe pas).`
                : `Aucun compte Supabase pour ${email} : créez-le d'abord dans Authentication → Users.`);
            process.exitCode = 1;
        } else {
            console.log(revoke ? `Accès BDS retiré à ${email}.` : `Accès BDS donné à ${email}. Il prend effet à sa prochaine connexion.`);
        }
    }
} catch (err) {
    console.error(err.code === '42P01' || err.code === '3F000'
        ? 'Table auth.users introuvable : cette base n’est pas une base Supabase.'
        : `Erreur : ${err.message}`);
    process.exitCode = 1;
} finally {
    await pool.end();
}
