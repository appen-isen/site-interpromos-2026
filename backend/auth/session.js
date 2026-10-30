import crypto from 'node:crypto';
import { query } from '../data/db.js'; // charge aussi .env
import * as supabase from './supabase.js';


export const ADMIN_ROLE = 'bds';

const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
const forceLocal = process.env.AUTH_PROVIDER === 'local';
if (forceLocal && isProduction) {
    console.error('AUTH_PROVIDER=local est ignoré en production : la connexion BDS passe par Supabase Auth.');
}

const useSupabase = supabase.isConfigured && !(forceLocal && !isProduction);
const localAccount = !useSupabase && !isProduction ? await import('./local-account.js') : null;

if (localAccount && !localAccount.isConfigured && (process.env.ADMIN_EMAIL || process.env.ADMIN_PASSWORD)) {
    console.warn('ADMIN_EMAIL / ADMIN_PASSWORD ne sont plus utilisés : renommez-les en LOCAL_ADMIN_EMAIL / LOCAL_ADMIN_PASSWORD dans .env.');
}


export const provider = useSupabase
    ? supabase
    : localAccount?.isConfigured ? localAccount : null;

export const providerName = provider === supabase ? 'supabase' : provider ? 'local' : 'aucun';

export const hasAdminRole = appMetadata => appMetadata?.role === ADMIN_ROLE;

export const fingerprint = token => crypto.createHash('sha256').update(token).digest('hex');

export function extractBearerToken(request) {
    const header = request.headers?.authorization || '';
    return header.startsWith('Bearer ') ? header.slice(7).trim() : null;
}

/**
 * Retourne l'utilisateur BDS du jeton, ou null
 */
export async function getAdminFromToken(token) {
    if (!token || !provider) return null;
    let user;
    try {
        user = await provider.verify(token);
    } catch (err) {
        return null;
    }
    if (!hasAdminRole(user.appMetadata)) return null;

    try {
        const { rowCount } = await query('SELECT 1 FROM sessions_revoquees WHERE empreinte = $1', [fingerprint(token)]);
        if (rowCount) return null;
    } catch (err) { /* signature, expiration et rôle restent vérifiés */ }
    return user;
}

/** Bloque un jeton jusqu'à son expiration */
export async function revokeToken(token, exp) {
    await query(
        `INSERT INTO sessions_revoquees (empreinte, expire_le) VALUES ($1, TO_TIMESTAMP($2))
         ON CONFLICT (empreinte) DO NOTHING`,
        [fingerprint(token), exp || Math.floor(Date.now() / 1000) + 3600]
    );
    await query('DELETE FROM sessions_revoquees WHERE expire_le < NOW()');
}


export async function isAdminRequest(request) {
    return Boolean(await getAdminFromToken(extractBearerToken(request)));
}


export async function requireAdminAuth(request, response, next) {
    const user = await getAdminFromToken(extractBearerToken(request));
    if (!user) {
        return response.status(401).json({ error: 'Session BDS expirée ou non authentifiée. Veuillez vous reconnecter.' });
    }
    request.admin = user;
    next();
}
