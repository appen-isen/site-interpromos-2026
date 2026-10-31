import { dbGetInstagramPosts, dbAddInstagramPost, dbDeleteInstagramPost, dbSetInstagramVideo, dbSetInstagramHero } from '../data/store.js';
import { sniffMime, saveMediaFile, deleteMediaFile, inspectUploadedObject } from '../data/media-storage.js';

const INSTAGRAM_ERRORS = {
    INVALID_URL: "Adresse non reconnue : collez le lien d'un post ou d'un reel (instagram.com/p/… ou instagram.com/reel/…).",
    DUPLICATE: 'Ce post est déjà affiché sur le site.'
};
const VIDEO_FORMAT_ERROR = 'Format non pris en charge : joignez une vidéo MP4, WEBM ou MOV.';
const NOT_FOUND = 'Post introuvable.';

/**
 * GET /api/instagram — posts et reels affichés sur le site (public), du plus récent au plus ancien
 */
export async function api_get_instagram(request, response) {
    try {
        response.json(await dbGetInstagramPosts());
    } catch (err) {
        console.error('Erreur GET /api/instagram :', err);
        response.status(500).json({ error: 'Erreur lors de la récupération des posts Instagram.' });
    }
}

/**
 * POST /api/instagram (admin) — { url } : ajoute un post ou un reel, renvoie la liste à jour
 */
export async function api_post_instagram(request, response) {
    try {
        await dbAddInstagramPost(request.body?.url);
        response.status(201).json(await dbGetInstagramPosts());
    } catch (err) {
        if (INSTAGRAM_ERRORS[err.message]) {
            return response.status(err.message === 'DUPLICATE' ? 409 : 400).json({ error: INSTAGRAM_ERRORS[err.message] });
        }
        console.error('Erreur POST /api/instagram :', err);
        response.status(500).json({ error: "Le post n'a pas pu être ajouté." });
    }
}

/**
 * DELETE /api/instagram/:id (admin) — retire un post du site et sa vidéo jointe (rien n'est supprimé sur Instagram)
 */
export async function api_delete_instagram(request, response) {
    try {
        const removed = await dbDeleteInstagramPost(request.params.id);
        if (!removed) return response.status(404).json({ error: NOT_FOUND });
        await deleteMediaFile(removed.storagePath).catch(() => {});
        response.json(await dbGetInstagramPosts());
    } catch (err) {
        console.error('Erreur DELETE /api/instagram :', err);
        response.status(500).json({ error: "Le post n'a pas pu être retiré." });
    }
}

// Rattache un fichier déjà stocké au post ; le supprime si le post n'existe plus
async function attachVideo(request, response, stored) {
    try {
        const updated = await dbSetInstagramVideo(request.params.id, stored);
        if (!updated) {
            await deleteMediaFile(stored.storagePath).catch(() => {});
            return response.status(404).json({ error: NOT_FOUND });
        }
        await deleteMediaFile(updated.oldStoragePath).catch(() => {});
        response.json(await dbGetInstagramPosts());
    } catch (err) {
        await deleteMediaFile(stored.storagePath).catch(() => {});
        console.error('Erreur vidéo Instagram :', err);
        response.status(500).json({ error: "La vidéo n'a pas pu être jointe. Réessayez." });
    }
}

/**
 * POST /api/instagram/:id/video (admin, stockage local) — corps : le fichier vidéo brut
 */
export async function api_upload_instagram_video(request, response) {
    const buffer = request.body;
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        return response.status(400).json({ error: 'Aucun fichier reçu.' });
    }
    const mime = sniffMime(buffer);
    if (!mime?.startsWith('video/')) return response.status(415).json({ error: VIDEO_FORMAT_ERROR });
    let stored;
    try {
        stored = await saveMediaFile(buffer, mime);
    } catch (err) {
        console.error('Erreur stockage vidéo Instagram :', err);
        return response.status(502).json({ error: "Impossible d'enregistrer la vidéo sur l'espace de stockage." });
    }
    return attachVideo(request, response, stored);
}

/**
 * POST /api/instagram/:id/video/complete (admin, Supabase) — { objectPath }
 * Le fichier a été envoyé directement à Supabase (URL signée de /api/media/upload-url) : on vérifie que c'est une vidéo.
 */
export async function api_complete_instagram_video(request, response) {
    const path = String(request.body?.objectPath || '');
    const stored = await inspectUploadedObject(path).catch(() => null);
    if (!stored?.mime.startsWith('video/')) {
        await deleteMediaFile(`supabase:${path}`).catch(() => {});
        return response.status(415).json({ error: VIDEO_FORMAT_ERROR });
    }
    return attachVideo(request, response, { url: stored.url, storagePath: stored.storagePath });
}

/**
 * DELETE /api/instagram/:id/video (admin) — retire la vidéo : le site revient au lecteur Instagram
 */
export async function api_delete_instagram_video(request, response) {
    try {
        const updated = await dbSetInstagramVideo(request.params.id, { url: null, storagePath: null });
        if (!updated) return response.status(404).json({ error: NOT_FOUND });
        await deleteMediaFile(updated.oldStoragePath).catch(() => {});
        response.json(await dbGetInstagramPosts());
    } catch (err) {
        console.error('Erreur DELETE vidéo Instagram :', err);
        response.status(500).json({ error: "La vidéo n'a pas pu être retirée." });
    }
}

/**
 * PUT /api/instagram/:id/hero (admin) — { on } : met la vidéo jointe du post en tête de l'accueil (ou l'en retire)
 */
export async function api_put_instagram_hero(request, response) {
    try {
        await dbSetInstagramHero(request.params.id, request.body?.on !== false);
        response.json(await dbGetInstagramPosts());
    } catch (err) {
        if (err.message === 'NOT_FOUND') return response.status(404).json({ error: NOT_FOUND });
        if (err.message === 'NO_VIDEO') {
            return response.status(400).json({ error: "Joignez d'abord la vidéo de ce post : c'est elle qui est lue en tête de l'accueil." });
        }
        console.error('Erreur PUT /api/instagram/:id/hero :', err);
        response.status(500).json({ error: "La vidéo d'accueil n'a pas pu être changée." });
    }
}
