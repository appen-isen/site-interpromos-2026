import { createRateLimit } from './rate-limit.js';
import {
    ADMIN_ROLE,
    provider,
    hasAdminRole,
    extractBearerToken,
    getAdminFromToken,
    revokeToken
} from '../auth/session.js';

// Routes de connexion à l'Espace BDS

const UNAVAILABLE = 'Connexion indisponible ';
const EXPIRED = 'Session expirée. Veuillez vous reconnecter.';

// Anti force brute 
export const loginRateLimit = createRateLimit({
    name: 'login',
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.'
});

const isLocalUrl = url => /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(url);

function publicSiteUrl(request) {
    const fromRequest = `${request.protocol}://${request.get('host')}`;
    const configured = String(process.env.APP_URL || '').trim();
    const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '';

    let url = configured || fromRequest;
    if (process.env.VERCEL_ENV === 'production' && isLocalUrl(url)) {
        console.error(`APP_URL pointe vers une adresse locale (${url}) : utilisation du domaine de production.`);
        url = vercelDomain || fromRequest;
    }
    return `${url.replace(/\/+$/, '')}/`;
}

const sessionResponse = ({ token, refreshToken, expiresAt, email }) =>
    ({ authenticated: true, role: ADMIN_ROLE, token, refreshToken, expiresAt, email });

/**
 * POST /api/auth/login — { email, password }
 */
export async function api_auth_login(request, response) {
    const email = String(request.body?.email || '').trim().toLowerCase();
    const password = String(request.body?.password || '');
    if (!email || !password) {
        return response.status(400).json({ error: 'Saisissez votre adresse e-mail et votre mot de passe.' });
    }
    if (!provider) return response.status(503).json({ error: UNAVAILABLE });

    try {
        const { session, status } = await provider.login(email, password);
        if (!session) {
            return status === 401
                ? response.status(401).json({ error: 'E-mail ou mot de passe incorrect.' })
                : response.status(502).json({ error: 'Service de connexion indisponible. Réessayez dans un instant.' });
        }
        if (!hasAdminRole(session.appMetadata)) {
            await provider.logout(session.token);
            return response.status(403).json({ error: 'Ce compte n’a pas accès à l’Espace BDS.' });
        }
        response.json(sessionResponse(session));
    } catch (err) {
        console.error('Service de connexion injoignable :', err.message);
        response.status(502).json({ error: 'Service de connexion indisponible. Réessayez dans un instant.' });
    }
}

/**
 * POST /api/auth/refresh — { refreshToken }
 */
export async function api_auth_refresh(request, response) {
    const refreshToken = String(request.body?.refreshToken || '');
    if (!provider || !refreshToken) return response.status(401).json({ error: EXPIRED });
    try {
        const { session } = await provider.refresh(refreshToken);
        if (!session || !hasAdminRole(session.appMetadata)) return response.status(401).json({ error: EXPIRED });
        response.json(sessionResponse(session));
    } catch (err) {
        response.status(502).json({ error: 'Service de connexion indisponible.' });
    }
}

/**
 * GET /api/auth/me
 */
export async function api_auth_me(request, response) {
    const user = await getAdminFromToken(extractBearerToken(request));
    if (!user) return response.status(401).json({ authenticated: false });
    response.json({ authenticated: true, role: ADMIN_ROLE, email: user.email });
}

/**
 * POST /api/auth/logout — ferme la session et bloque le jeton jusqu'à son expiration
 */
export async function api_auth_logout(request, response) {
    const token = extractBearerToken(request);
    const user = await getAdminFromToken(token);
    if (user) {
        await provider.logout(token);
        await revokeToken(token, user.exp).catch(err => console.error('Erreur révocation de session :', err.message));
    }
    response.json({ authenticated: false });
}

/**
 * POST /api/auth/recover — { email } : réponse identique que le compte existe ou non
 */
export async function api_auth_recover(request, response) {
    const email = String(request.body?.email || '').trim().toLowerCase();
    if (!email) return response.status(400).json({ error: 'Saisissez votre adresse e-mail.' });
    if (!provider?.sendRecoveryEmail) return response.status(503).json({ error: UNAVAILABLE });

    // Le lien ramène à la racine du site, avec #access_token=…&type=recovery
    const redirectTo = publicSiteUrl(request);
    await provider.sendRecoveryEmail(email, redirectTo).catch(err => console.error('Mot de passe oublié :', err.message));
    response.json({ sent: true });
}

/**
 * POST /api/auth/password — { password }, avec le jeton du lien de réinitialisation
 */
export async function api_auth_password(request, response) {
    const token = extractBearerToken(request);
    const password = String(request.body?.password || '');
    if (password.length < 10) {
        return response.status(400).json({ error: 'Le mot de passe doit contenir au moins 10 caractères.' });
    }
    if (!provider?.setPassword) return response.status(503).json({ error: UNAVAILABLE });
    if (!(await getAdminFromToken(token))) {
        return response.status(401).json({ error: 'Lien expiré ou invalide. Redemandez un e-mail de réinitialisation.' });
    }
    const error = await provider.setPassword(token, password);
    if (error) return response.status(400).json({ error });
    response.json({ updated: true });
}
