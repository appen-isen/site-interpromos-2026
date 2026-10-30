import crypto from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';

const EMAIL = String(process.env.LOCAL_ADMIN_EMAIL || '').trim().toLowerCase();
const PASSWORD = String(process.env.LOCAL_ADMIN_PASSWORD || '');
const KEY = crypto.randomBytes(32);
const ISSUER = 'interpromos-local';

export const isConfigured = Boolean(EMAIL && PASSWORD);

const digest = value => crypto.createHash('sha256').update(value).digest();
const sameSecret = (a, b) => crypto.timingSafeEqual(digest(a), digest(b));

export async function login(email, password) {
    if (!sameSecret(email, EMAIL) || !sameSecret(password, PASSWORD)) return { status: 401 };
    const expiresAt = Date.now() + 8 * 3600 * 1000;
    const token = await new SignJWT({ email, app_metadata: { role: 'bds' } })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject('compte-local')
        .setIssuer(ISSUER)
        .setAudience('authenticated')
        .setIssuedAt()
        .setExpirationTime(Math.floor(expiresAt / 1000))
        .sign(KEY);
    return { session: { token, refreshToken: null, expiresAt, email, appMetadata: { role: 'bds' } } };
}

export async function verify(token) {
    const { payload } = await jwtVerify(token, KEY, { issuer: ISSUER, audience: 'authenticated' });
    return { sub: payload.sub, email: payload.email, exp: payload.exp, appMetadata: payload.app_metadata || {} };
}

// Pas de renouvellement, d'e-mail ni de changement de mot de passe pour le compte local
export async function refresh() {
    return { status: 401 };
}

export async function logout() {}
