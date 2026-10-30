import {
    dbGetGallery,
    dbUpdateAlbumVisibility,
    dbCreateAlbum,
    dbUpdateAlbum,
    dbDeleteAlbum
} from '../data/store.js';

const ALBUM_ERRORS = {
    INVALID_NAME: "Nom de l'album requis.",
    INVALID_DATE: 'Date invalide (format attendu : AAAA-MM-JJ).',
    INVALID_RANGE: 'La date de fin doit être postérieure ou égale à la date de début.',
    DUPLICATE_NAME: 'Un album porte déjà ce nom.'
};

function sendAlbumError(response, err, context) {
    if (ALBUM_ERRORS[err.message]) {
        return response.status(err.message === 'DUPLICATE_NAME' ? 409 : 400).json({ error: ALBUM_ERRORS[err.message] });
    }
    console.error(`Erreur ${context} :`, err);
    response.status(500).json({ error: "Erreur lors de l'enregistrement de l'album." });
}

const adminGallery = () => dbGetGallery(undefined, { publicOnly: false });

export async function api_get_gallery(request, response) {
    try {
        const { album } = request.query;
        const data = await dbGetGallery(album, { publicOnly: true });
        response.json(data);
    } catch (err) {
        console.error('Erreur GET /api/gallery :', err);
        response.status(500).json({ error: 'Erreur lors de la récupération de la galerie.' });
    }
}

export async function api_patch_album(request, response) {
    try {
        const { name, published } = request.body || {};
        if (!name) {
            return response.status(400).json({ error: "Nom de l'album requis." });
        }

        const result = await dbUpdateAlbumVisibility(name, published);
        if (!result) {
            return response.status(404).json({ error: 'Album introuvable.' });
        }

        response.json(result);
    } catch (err) {
        console.error('Erreur PATCH /api/gallery/albums :', err);
        response.status(500).json({ error: "Erreur lors de la mise à jour de l'album." });
    }
}

/**
 * POST /api/gallery/albums (admin) — { name, start?, end?, published? }
 */
export async function api_post_album(request, response) {
    try {
        const id = await dbCreateAlbum(request.body || {});
        if (id === null) {
            return response.status(409).json({ error: ALBUM_ERRORS.DUPLICATE_NAME });
        }
        response.status(201).json({ albumId: id, ...(await adminGallery()) });
    } catch (err) {
        sendAlbumError(response, err, 'POST /api/gallery/albums');
    }
}

/**
 * PUT /api/gallery/albums/:id (admin) — { name?, start?, end?, published? }
 */
export async function api_put_album(request, response) {
    try {
        const found = await dbUpdateAlbum(request.params.id, request.body || {});
        if (!found) {
            return response.status(404).json({ error: 'Album introuvable.' });
        }
        response.json(await adminGallery());
    } catch (err) {
        sendAlbumError(response, err, 'PUT /api/gallery/albums/:id');
    }
}

/**
 * DELETE /api/gallery/albums/:id (admin) — uniquement si l'album est vide
 */
export async function api_delete_album(request, response) {
    try {
        const result = await dbDeleteAlbum(request.params.id);
        if (result === 'not_found') {
            return response.status(404).json({ error: 'Album introuvable.' });
        }
        if (result === 'not_empty') {
            return response.status(409).json({ error: "L'album contient encore des médias : déplacez-les ou supprimez-les avant de supprimer l'album." });
        }
        response.json(await adminGallery());
    } catch (err) {
        console.error('Erreur DELETE /api/gallery/albums/:id :', err);
        response.status(500).json({ error: "Erreur lors de la suppression de l'album." });
    }
}
