import crypto from 'node:crypto';
import { query } from './db.js';

export function getVaultSecretName() {
    const name = String(process.env.VAULT_SESSION_SECRET_NAME || '').trim();
    if (!name) return null;
    if (!/^[A-Za-z0-9_.-]{1,128}$/.test(name)) {
        console.warn('VAULT_SESSION_SECRET_NAME invalide (lettres, chiffres, _ . - uniquement) : Vault ignoré.');
        return null;
    }
    return name;
}

const IS_PRODUCTION = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';

let sessionKeyPromise = null;

function toKey(secret) {
    return crypto.createHash('sha256').update(secret).digest();
}

async function readVaultSecret(name) {
    const { rows } = await query(
        'SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = $1 LIMIT 1',
        [name]
    );
    return rows[0]?.decrypted_secret || null;
}

/**
 * Lit le secret de session dans Supabase Vault et le crée s'il n'existe pas encore.
 * Retourne null si VAULT_SESSION_SECRET_NAME n'est pas définie
 */
export async function getOrCreateVaultSessionSecret() {
    const name = getVaultSecretName();
    if (!name) return null;
    try {
        const existing = await readVaultSecret(name);
        if (existing) return existing;

        const generated = crypto.randomBytes(48).toString('hex');
        try {
            await query('SELECT vault.create_secret($1, $2, $3)', [
                generated,
                name,
                'Clé de signature des sessions de l’Espace BDS (Interpromos)'
            ]);
            return generated;
        } catch (err) {
            // Deux instances ont pu le créer en même temps : on relit celui qui a gagné
            const winner = await readVaultSecret(name);
            if (winner) return winner;
            throw err;
        }
    } catch (err) {
        console.warn(`Supabase Vault indisponible (${err.message}).`);
        return null;
    }
}

async function resolveSessionKey() {
    // 1. Variable d'environnement explicite 
    const envSecret = String(process.env.SESSION_SECRET || '').trim();
    if (envSecret.length >= 32) return toKey(envSecret);
    if (envSecret) console.warn('SESSION_SECRET trop court (32 caractères minimum) : ignoré.');

    // 2. Supabase Vault : secret géré par Supabase, partagé par toutes les instances Vercel
    const vaultSecret = await getOrCreateVaultSessionSecret();
    if (vaultSecret) return toKey(vaultSecret);

    // 3. Développement uniquement : clé aléatoire (sessions perdues au redémarrage)
    if (IS_PRODUCTION) {
        throw new Error('SESSION_KEY_UNAVAILABLE');
    }
    console.warn('Ni SESSION_SECRET ni Supabase Vault (VAULT_SESSION_SECRET_NAME) : clé de session aléatoire (développement).');
    return crypto.randomBytes(32);
}

/**
 * Clé HMAC des jetons BDS, résolue une seule fois par instance.
 */
export function getSessionKey() {
    if (!sessionKeyPromise) {
        sessionKeyPromise = resolveSessionKey().catch(err => {
            sessionKeyPromise = null; // nouvelle tentative à la requête suivante
            throw err;
        });
    }
    return sessionKeyPromise;
}
