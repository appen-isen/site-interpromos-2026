import { query } from './db.js';


export const DATABASE_ROLES = ['production', 'preview', 'development', 'test'];

/** Rôle de la base, ou null si elle n'est pas encore marquée (ou si la table n'existe pas encore). */
export async function getDatabaseRole(client = { query }) {
    try {
        const { rows } = await client.query(`SELECT valeur FROM meta_base WHERE cle = 'environnement'`);
        return rows[0]?.valeur || null;
    } catch (err) {
        if (err.code === '42P01') return null; // table absente : base antérieure à ce garde-fou
        throw err;
    }
}


export async function setDatabaseRole(role, { client = { query }, force = false } = {}) {
    if (!DATABASE_ROLES.includes(role)) throw new Error(`Rôle de base inconnu : ${role} (${DATABASE_ROLES.join(', ')})`);
    const current = await getDatabaseRole(client);
    if (current === role) return current;
    // Une base déjà marquée ne change jamais de rôle toute seule (seulement via npm run db:role -- <rôle> --force)
    if (current && !force) {
        throw new Error(`Cette base est marquée « ${current} » : elle ne peut pas devenir « ${role} » automatiquement (vérifiez DATABASE_URL, ou npm run db:role -- ${role} --force).`);
    }
    await client.query(
        `INSERT INTO meta_base (cle, valeur) VALUES ('environnement', $1)
         ON CONFLICT (cle) DO UPDATE SET valeur = EXCLUDED.valeur, modifie_le = clock_timestamp()`,
        [role]
    );
    return role;
}

/**
 * Arrête l'opération si la base est la base de production. À appeler avant tout test qui écrit en base.
 */
export async function assertNotProductionDatabase(operation) {
    if ((await getDatabaseRole()) === 'production') {
        throw new Error(
            `Refusé : « ${operation} » ne peut pas s'exécuter sur la base de production. ` +
            'Vérifiez DATABASE_URL (elle doit pointer vers une base de test ou de développement).'
        );
    }
}
