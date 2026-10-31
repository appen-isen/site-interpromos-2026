import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { api_ping } from './backend/api/ping.js';
import {
    api_auth_login,
    api_auth_refresh,
    api_auth_logout,
    api_auth_me,
    api_auth_recover,
    api_auth_password,
    loginRateLimit
} from './backend/api/auth.js';
import { requireAdminAuth } from './backend/auth/session.js';
import { api_state, api_sports, api_promos, api_standings } from './backend/api/tournament.js';
import {
    api_get_matches,
    api_post_match,
    api_put_match,
    api_delete_match,
    api_generate_matches,
    api_patch_match_score,
    api_patch_match_status
} from './backend/api/matches.js';
import {
    api_get_teams,
    api_post_team,
    api_put_team,
    api_patch_team_max_players,
    api_post_team_player,
    api_delete_team_player,
    api_move_team_player,
    api_delete_team
} from './backend/api/teams.js';
import {
    api_get_registrations,
    api_post_registration,
    api_patch_registration,
    api_delete_registration,
    registrationRateLimit
} from './backend/api/registrations.js';
import {
    api_get_gallery,
    api_patch_album,
    api_post_album,
    api_put_album,
    api_delete_album
} from './backend/api/gallery.js';
import {
    api_get_media,
    api_upload_media,
    api_patch_media,
    api_delete_media,
    api_put_media_slot,
    api_media_upload_url,
    api_media_complete
} from './backend/api/media.js';
import { UPLOADS_DIR, MAX_UPLOAD_BYTES } from './backend/data/media-storage.js';
import { isUuid } from './backend/data/store.js';
import { api_import_csv } from './backend/api/import.js';
import { api_get_edition, api_put_edition } from './backend/api/edition.js';
import {
    api_get_instagram,
    api_post_instagram,
    api_delete_instagram,
    api_upload_instagram_video,
    api_complete_instagram_video,
    api_delete_instagram_video,
    api_put_instagram_hero
} from './backend/api/instagram.js';
import { api_get_openapi } from './backend/api/docs.js';
const app = express();

// Dossiers servis, résolus depuis ce fichier (le serveur peut être lancé depuis n'importe quel répertoire)
const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url));


if (process.env.VERCEL || process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);

// Corps JSON 4 Mo
app.use(express.json({ limit: '4mb' }));

// Fichiers du site 
app.use(express.static(path.join(ROOT_DIR, "public"), {
    etag: false,
    lastModified: false,
    setHeaders: res => res.setHeader("Cache-Control", "no-store")
}));

// Médias téléversés en local 
app.use("/uploads", express.static(UPLOADS_DIR, {
    setHeaders: res => res.setHeader("X-Content-Type-Options", "nosniff")
}));

// Paramètres
const requireUuidParams = (request, response, next) => {
    const ids = [request.params.id, request.params.participantId].filter(v => v !== undefined);
    if (ids.every(isUuid)) return next();
    response.status(404).json({ error: 'Élément introuvable.' });
};

// Lectures publiques 
const shortCdnCache = (request, response, next) => {
    if (!request.headers.authorization) {
        response.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3, stale-while-revalidate=10');
    }
    next();
};

// Routes API — Authentification Espace BDS
app.post('/api/auth/login', loginRateLimit, api_auth_login);
app.get('/api/auth/me', api_auth_me);
app.post('/api/auth/logout', api_auth_logout);
app.post('/api/auth/refresh', api_auth_refresh);
app.post('/api/auth/recover', loginRateLimit, api_auth_recover);
app.post('/api/auth/password', loginRateLimit, api_auth_password);

// Routes API — Import CSV (protégé par requireAdminAuth)
app.post('/api/import/csv', requireAdminAuth, api_import_csv);

// Routes API — Santé & État global
app.get('/api/ping', api_ping);

// Documentation de l'API : réservée aux membres du BDS connectés
app.get('/api/docs/openapi.yaml', requireAdminAuth, api_get_openapi);
app.get('/api/state', api_state);
app.get('/api/edition', api_get_edition);
app.put('/api/edition', requireAdminAuth, api_put_edition);

// Routes API — Posts Instagram affichés sur le site
app.get('/api/instagram', api_get_instagram);
app.post('/api/instagram', requireAdminAuth, api_post_instagram);
app.delete('/api/instagram/:id', requireAdminAuth, requireUuidParams, api_delete_instagram);

app.post(
    '/api/instagram/:id/video',
    requireAdminAuth,
    requireUuidParams,
    express.raw({ type: () => true, limit: MAX_UPLOAD_BYTES }),
    api_upload_instagram_video
);
app.post('/api/instagram/:id/video/complete', requireAdminAuth, requireUuidParams, api_complete_instagram_video);
app.delete('/api/instagram/:id/video', requireAdminAuth, requireUuidParams, api_delete_instagram_video);
app.put('/api/instagram/:id/hero', requireAdminAuth, requireUuidParams, api_put_instagram_hero);
app.get('/api/sports', api_sports);
app.get('/api/promos', api_promos);
app.get('/api/standings', shortCdnCache, api_standings);

// Routes API — Matchs & Scores en direct (modifications protégées par requireAdminAuth)
app.get('/api/matches', shortCdnCache, api_get_matches);
app.post('/api/matches', requireAdminAuth, api_post_match);
app.post('/api/matches/generate', requireAdminAuth, api_generate_matches);
app.put('/api/matches/:id', requireAdminAuth, api_put_match);
app.delete('/api/matches/:id', requireAdminAuth, api_delete_match);
app.patch('/api/matches/:id/score', requireAdminAuth, api_patch_match_score);
app.patch('/api/matches/:id/status', requireAdminAuth, api_patch_match_status);

// Routes API — Équipes & Joueurs (modifications protégées par requireAdminAuth)
app.get('/api/teams', api_get_teams);
app.post('/api/teams', requireAdminAuth, api_post_team);
app.put('/api/teams/:id', requireAdminAuth, requireUuidParams, api_put_team);
app.patch('/api/teams/:id/max-players', requireAdminAuth, requireUuidParams, api_patch_team_max_players);
app.post('/api/teams/:id/players', requireAdminAuth, requireUuidParams, api_post_team_player);
app.delete('/api/teams/:id/players/:participantId', requireAdminAuth, requireUuidParams, api_delete_team_player);
app.post('/api/teams/:id/players/move', requireAdminAuth, requireUuidParams, api_move_team_player);
app.delete('/api/teams/:id', requireAdminAuth, requireUuidParams, api_delete_team);

// Routes API — Inscriptions (validation/refus protégé par requireAdminAuth)
app.get('/api/registrations', requireAdminAuth, api_get_registrations);
app.post('/api/registrations', registrationRateLimit, api_post_registration);
app.patch('/api/registrations/:id', requireAdminAuth, requireUuidParams, api_patch_registration);
app.delete('/api/registrations/:id', requireAdminAuth, requireUuidParams, api_delete_registration);

// Routes API — Galerie & Albums (modifications protégées par requireAdminAuth)
app.get('/api/gallery', api_get_gallery);
app.patch('/api/gallery/albums', requireAdminAuth, api_patch_album);
app.post('/api/gallery/albums', requireAdminAuth, api_post_album);
app.put('/api/gallery/albums/:id', requireAdminAuth, requireUuidParams, api_put_album);
app.delete('/api/gallery/albums/:id', requireAdminAuth, requireUuidParams, api_delete_album);

// Routes API — Médias (téléversement admin : le corps de la requête est le fichier brut)
app.get('/api/media', requireAdminAuth, api_get_media);
app.post(
    '/api/media/upload',
    requireAdminAuth,
    express.raw({ type: () => true, limit: MAX_UPLOAD_BYTES }),
    api_upload_media
);
app.post('/api/media/upload-url', requireAdminAuth, api_media_upload_url);
app.post('/api/media/complete', requireAdminAuth, api_media_complete);
app.patch('/api/media/:id', requireAdminAuth, requireUuidParams, api_patch_media);
app.delete('/api/media/:id', requireAdminAuth, requireUuidParams, api_delete_media);
app.put('/api/media/slots/:slot', requireAdminAuth, api_put_media_slot);

// Erreurs de parsing (fichier trop volumineux, JSON invalide) renvoyées en JSON
app.use((err, request, response, next) => {
    if (err?.type === 'entity.too.large') {
        return response.status(413).json({ error: `Fichier trop volumineux (${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} Mo maximum).` });
    }
    if (err?.status && err.status < 500) {
        return response.status(err.status).json({ error: 'Requête invalide.' });
    }
    console.error('Erreur serveur :', err);
    response.status(500).json({ error: 'Erreur interne du serveur.' });
});

export default app;
