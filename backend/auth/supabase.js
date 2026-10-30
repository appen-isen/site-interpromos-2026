import crypto from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';


const SUPABASE_URL = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const AUTH_URL = `${SUPABASE_URL}/auth/v1`;
const JWKS_URL = `${AUTH_URL}/.well-known/jwks.json`;

export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

async function call(path, { method = 'POST', body, token } = {}) {
    const res = await fetch(`${AUTH_URL}${path}`, {
        method,
        headers: {
            apikey: SUPABASE_KEY,
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
}

// Session renvoyée au navigateur
function toSession(data) {
    return {
        token: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: data.expires_at ? data.expires_at * 1000 : Date.now() + (data.expires_in || 3600) * 1000,
        email: data.user?.email,
        appMetadata: data.user?.app_metadata || {}
    };
}

// -----------------------------------------------------------------------------
// Vérification des jetons
// -----------------------------------------------------------------------------
let jwks = null;
let usesJwks = null;
let jwksCheckedAt = 0;
const hs256Cache = new Map(); // jeton -> utilisateur, 60 s (projets encore en HS256)

// Le projet publie-t-il des clés publiques ? (revérifié toutes les 10 minutes)
async function projectUsesJwks() {
    if (usesJwks !== null && Date.now() - jwksCheckedAt < 10 * 60 * 1000) return usesJwks;
    try {
        const res = await fetch(JWKS_URL);
        const { keys = [] } = res.ok ? await res.json() : {};
        usesJwks = keys.length > 0;
    } catch (err) {
        usesJwks = false;
    }
    jwksCheckedAt = Date.now();
    if (usesJwks && !jwks) jwks = createRemoteJWKSet(new URL(JWKS_URL));
    return usesJwks;
}


export async function verify(token) {
    if (await projectUsesJwks()) {
        const { payload } = await jwtVerify(token, jwks, { issuer: AUTH_URL, audience: 'authenticated' });
        return { sub: payload.sub, email: payload.email, exp: payload.exp, appMetadata: payload.app_metadata || {} };
    }

    const key = crypto.createHash('sha256').update(token).digest('hex');
    const cached = hs256Cache.get(key);
    if (cached && cached.until > Date.now()) return cached.user;

    const { ok, data } = await call('/user', { method: 'GET', token });
    if (!ok) throw new Error('INVALID_TOKEN');
    const { exp = 0 } = JSON.parse(Buffer.from(token.split('.')[1] || '', 'base64url').toString() || '{}');
    const user = { sub: data.id, email: data.email, exp, appMetadata: data.app_metadata || {} };
    if (hs256Cache.size > 500) hs256Cache.clear();
    hs256Cache.set(key, { user, until: Date.now() + 60_000 });
    return user;
}

// -----------------------------------------------------------------------------
// Opérations sur les comptes
// -----------------------------------------------------------------------------

/** Connexion par e-mail et mot de passe. Retourne { session } ou { status } en cas d'échec. */
export async function login(email, password) {
    const { ok, status, data } = await call('/token?grant_type=password', { body: { email, password } });
    if (ok) return { session: toSession(data) };
    if (status >= 500) console.error('Supabase Auth (connexion) :', status, data.msg || data.error_description || data.error);
    return { status: status === 400 || status === 401 ? 401 : 502 };
}

/** Nouveau jeton à partir du jeton de renouvellement (utilisable une seule fois). */
export async function refresh(refreshToken) {
    const { ok, data } = await call('/token?grant_type=refresh_token', { body: { refresh_token: refreshToken } });
    return ok ? { session: toSession(data) } : { status: 401 };
}

/** Ferme la session côté Supabase (le jeton de renouvellement ne fonctionne plus). */
export async function logout(token) {
    await call('/logout?scope=local', { token }).catch(() => {});
}

/** Envoie l'e-mail « mot de passe oublié » ; le lien ramène vers redirectTo avec #access_token=…&type=recovery. */
export async function sendRecoveryEmail(email, redirectTo) {
    const { ok, status, data } = await call(`/recover?redirect_to=${encodeURIComponent(redirectTo)}`, { body: { email } });
    if (!ok && status >= 500) console.error('Supabase Auth (mot de passe oublié) :', status, data.msg || data.error);
}

/** Change le mot de passe du compte auquel appartient le jeton. Retourne null ou un message d'erreur. */
export async function setPassword(token, password) {
    const { ok, data } = await call('/user', { method: 'PUT', token, body: { password } });
    return ok ? null : data.msg || 'Mot de passe refusé (trop simple ?).';
}
