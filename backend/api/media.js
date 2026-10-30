import {
    dbGetGallery,
    dbCreateMedia,
    dbUpdateMedia,
    dbDeleteMedia,
    dbSetMediaSlot,
    MEDIA_SLOTS
} from '../data/store.js';
import {
    sniffMime,
    saveMediaFile,
    deleteMediaFile,
    isSupabaseStorage,
    mimeFromDeclared,
    createSignedUpload,
    inspectUploadedObject,
    MAX_UPLOAD_BYTES
} from '../data/media-storage.js';

const FORMAT_ERROR = 'Format non pris en charge. Formats acceptés : JPG, PNG, WEBP, GIF, MP4, WEBM, MOV (les photos HEIC d’iPhone doivent être exportées en JPG).';

function decodeHeader(value) {
    if (!value) return '';
    try {
        return decodeURIComponent(String(value)).slice(0, 200);
    } catch (e) {
        return String(value).slice(0, 200);
    }
}

// Mode d'envoi indiqué au navigateur : direct vers Supabase Storage (production) ou via l'API (développement local)
function uploadConfig() {
    return { mode: isSupabaseStorage() ? 'direct' : 'api', maxBytes: MAX_UPLOAD_BYTES };
}

async function adminGallery() {
    return { ...(await dbGetGallery(undefined, { publicOnly: false })), upload: uploadConfig() };
}

/**
 * GET /api/media (admin) — tous les médias, y compris ceux des albums non publiés
 */
export async function api_get_media(request, response) {
    try {
        response.json(await adminGallery());
    } catch (err) {
        console.error('Erreur GET /api/media :', err);
        response.status(500).json({ error: 'Erreur lors de la récupération des médias.' });
    }
}

/**
 * POST /api/media/upload (admin)
 * Corps : le fichier brut. En-têtes : X-File-Name, X-Album, X-Caption (encodés avec encodeURIComponent)
 */
export async function api_upload_media(request, response) {
    const buffer = request.body;
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        return response.status(400).json({ error: 'Aucun fichier reçu.' });
    }

    const mime = sniffMime(buffer);
    if (!mime) {
        return response.status(415).json({
            error: FORMAT_ERROR
        });
    }

    const fileName = decodeHeader(request.get('x-file-name'));
    const album = decodeHeader(request.get('x-album'));
    const caption = decodeHeader(request.get('x-caption')) || fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');

    let stored;
    try {
        stored = await saveMediaFile(buffer, mime);
    } catch (err) {
        console.error('Erreur stockage média :', err);
        return response.status(502).json({ error: "Impossible d'enregistrer le fichier sur l'espace de stockage." });
    }

    try {
        const id = await dbCreateMedia({
            album,
            caption,
            url: stored.url,
            type: mime.startsWith('video/') ? 'video' : 'image',
            storagePath: stored.storagePath
        });
        const gallery = await adminGallery();
        response.status(201).json({ mediaId: id, ...gallery });
    } catch (err) {
        await deleteMediaFile(stored.storagePath);
        console.error('Erreur POST /api/media/upload :', err);
        response.status(500).json({ error: "Erreur lors de l'enregistrement du média en base." });
    }
}

/**
 * PATCH /api/media/:id (admin) — { caption?, album?, big? }
 */
export async function api_patch_media(request, response) {
    try {
        const { caption, album, big } = request.body || {};
        const found = await dbUpdateMedia(request.params.id, { caption, album, big });
        if (!found) {
            return response.status(404).json({ error: 'Média introuvable.' });
        }
        response.json(await adminGallery());
    } catch (err) {
        if (err.message === 'INVALID_ALBUM') {
            return response.status(400).json({ error: 'Album introuvable.' });
        }
        console.error('Erreur PATCH /api/media/:id :', err);
        response.status(500).json({ error: 'Erreur lors de la modification du média.' });
    }
}

/**
 * DELETE /api/media/:id (admin) — supprime la ligne en base puis le fichier
 */
export async function api_delete_media(request, response) {
    try {
        const deleted = await dbDeleteMedia(request.params.id);
        if (!deleted) {
            return response.status(404).json({ error: 'Média introuvable.' });
        }
        await deleteMediaFile(deleted.storagePath);
        response.json(await adminGallery());
    } catch (err) {
        console.error('Erreur DELETE /api/media/:id :', err);
        response.status(500).json({ error: 'Erreur lors de la suppression du média.' });
    }
}

/**
 * PUT /api/media/slots/:slot (admin) — { mediaId } ; mediaId null pour retirer
 */
export async function api_put_media_slot(request, response) {
    const { slot } = request.params;
    if (!MEDIA_SLOTS.includes(slot)) {
        return response.status(400).json({ error: `Emplacement inconnu (valeurs possibles : ${MEDIA_SLOTS.join(', ')}).` });
    }
    try {
        const { mediaId } = request.body || {};
        const ok = await dbSetMediaSlot(slot, mediaId || null);
        if (!ok) {
            return response.status(404).json({ error: 'Média introuvable.' });
        }
        response.json(await adminGallery());
    } catch (err) {
        console.error('Erreur PUT /api/media/slots/:slot :', err);
        response.status(500).json({ error: "Erreur lors de la mise à jour de l'emplacement." });
    }
}

/**
 * POST /api/media/upload-url (admin, Supabase) — { type, size }
 * Retourne une URL signée pour envoyer le fichier directement à Supabase Storage.
 */
export async function api_media_upload_url(request, response) {
    if (!isSupabaseStorage()) {
        return response.status(400).json({ error: 'Envoi direct indisponible : Supabase Storage n’est pas configuré.' });
    }
    const { type, size } = request.body || {};
    const mime = mimeFromDeclared(type);
    if (!mime) return response.status(415).json({ error: FORMAT_ERROR });
    if (Number(size) > MAX_UPLOAD_BYTES) {
        return response.status(413).json({ error: `Fichier trop volumineux (${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} Mo maximum).` });
    }
    try {
        response.json(await createSignedUpload(mime));
    } catch (err) {
        console.error('Erreur URL signée Supabase :', err.message);
        response.status(502).json({ error: "Impossible de préparer l'envoi vers Supabase Storage." });
    }
}

/**
 * POST /api/media/complete (admin, Supabase) — { objectPath, fileName, album, caption }
 * Vérifie le vrai format du fichier envoyé (signature) puis l'enregistre dans la galerie.
 */
export async function api_media_complete(request, response) {
    const { objectPath, fileName = '', album = '', caption = '' } = request.body || {};
    const path = String(objectPath || '');

    let stored;
    try {
        stored = await inspectUploadedObject(path);
    } catch (err) {
        stored = null;
    }
    if (!stored) {
        await deleteMediaFile(`supabase:${path}`);
        return response.status(415).json({ error: FORMAT_ERROR });
    }

    const name = String(fileName).slice(0, 200);
    try {
        const id = await dbCreateMedia({
            album: String(album).slice(0, 200),
            caption: String(caption).slice(0, 200) || name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '),
            url: stored.url,
            type: stored.mime.startsWith('video/') ? 'video' : 'image',
            storagePath: stored.storagePath
        });
        response.status(201).json({ mediaId: id, ...(await adminGallery()) });
    } catch (err) {
        await deleteMediaFile(stored.storagePath);
        console.error('Erreur POST /api/media/complete :', err);
        response.status(500).json({ error: "Erreur lors de l'enregistrement du média en base." });
    }
}
