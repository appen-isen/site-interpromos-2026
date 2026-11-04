// Médias de la galerie (photos, vidéos) et emplacements mis en avant.
import { pool, query } from '../db.js';
import { isUuid } from './constants.js';
import { dbGetInstagramHero } from './instagram.js';
import { ensureBaseReferences } from './schema.js';

const MEDIA_COLUMNS = `
    p.id,
    p.ordre AS i,
    a.nom AS album,
    a.publie AS "albumPublished",
    p.legende AS caption,
    p.url,
    p.grand_format AS big,
    COALESCE(p.type_media, 'image') AS type,
    p.emplacement AS slot
`;

// Emplacements du site pouvant afficher un média mis en avant
export const MEDIA_SLOTS = ['hero'];

/**
 * Galerie : albums, médias et médias mis en avant (slots).
 * publicOnly = true : uniquement les médias des albums publiés (site public).
 */
export async function dbGetGallery(albumFilter, { publicOnly = false } = {}) {
    await ensureBaseReferences();

    const albumRes = await query(`
        SELECT a.id, a.nom, a.publie,
               TO_CHAR(a.date_debut, 'YYYY-MM-DD') AS debut,
               TO_CHAR(a.date_fin, 'YYYY-MM-DD') AS fin,
               COUNT(p.id) FILTER (WHERE p.url IS NOT NULL)::INT AS count
        FROM albums a
        LEFT JOIN photos p ON p.id_album = a.id
        GROUP BY a.id
        ORDER BY a.date_debut ASC NULLS LAST, a.cree_le ASC
    `);

    const pub = {};
    const albums = albumRes.rows.map(a => {
        pub[a.nom] = Boolean(a.publie);
        return {
            id: a.id,
            name: a.nom,
            published: Boolean(a.publie),
            start: a.debut,
            end: a.fin,
            count: a.count
        };
    });

    // Les anciennes entrées sans fichier (url NULL) ne sont plus affichées
    const conditions = ['p.url IS NOT NULL'];
    const params = [];
    if (publicOnly) {
        conditions.push('a.publie = TRUE');
        // Le média mis en avant sur l'accueil n'est pas répété dans la galerie publique
        conditions.push('p.emplacement IS NULL');
    }
    if (albumFilter && albumFilter !== 'Tout') {
        params.push(albumFilter);
        conditions.push(`a.nom = $${params.length}`);
    }

    const [photoRes, slotRes] = await Promise.all([
        query(
            `SELECT ${MEDIA_COLUMNS}
             FROM photos p
             JOIN albums a ON a.id = p.id_album
             WHERE ${conditions.join(' AND ')}
             ORDER BY p.ordre ASC, p.cree_le ASC`,
            params
        ),
        query(
            `SELECT ${MEDIA_COLUMNS}
             FROM photos p
             JOIN albums a ON a.id = p.id_album
             WHERE p.emplacement IS NOT NULL AND p.url IS NOT NULL`
        )
    ]);

    const slots = {};
    for (const row of slotRes.rows) {
        slots[row.slot] = row;
    }
    // Un post Instagram choisi comme vidéo d'accueil remplace le média « hero » de la galerie
    const igHero = await dbGetInstagramHero();
    if (igHero) slots.hero = igHero;

    return { albums, pub, photos: photoRes.rows, slots };
}

export async function dbCreateMedia({ album, caption, url, type = 'image', storagePath = null }) {
    await ensureBaseReferences();

    let albumRow = null;
    if (album) {
        albumRow = (await query('SELECT id, nom FROM albums WHERE nom = $1', [album])).rows[0] || null;
    }
    if (!albumRow) {
        albumRow = (await query('SELECT id, nom FROM albums ORDER BY cree_le ASC LIMIT 1')).rows[0] || null;
    }
    if (!albumRow) throw new Error('NO_ALBUM');

    const legende = String(caption || '').trim().slice(0, 200) || albumRow.nom;
    const { rows } = await query(
        `INSERT INTO photos (id_album, ordre, legende, url, grand_format, type_media, chemin_stockage)
         VALUES ($1, (SELECT COALESCE(MAX(ordre), -1) + 1 FROM photos), $2, $3, FALSE, $4, $5)
         RETURNING id`,
        [albumRow.id, legende, url, type === 'video' ? 'video' : 'image', storagePath]
    );
    return rows[0].id;
}

export async function dbUpdateMedia(id, { caption, album, big }) {
    if (!isUuid(id)) return false;
    const sets = [];
    const params = [];

    if (caption !== undefined) {
        params.push(String(caption).trim().slice(0, 200));
        sets.push(`legende = $${params.length}`);
    }
    if (big !== undefined) {
        params.push(Boolean(big));
        sets.push(`grand_format = $${params.length}`);
    }
    if (album !== undefined) {
        const albumRes = await query('SELECT id FROM albums WHERE nom = $1', [album]);
        if (albumRes.rows.length === 0) throw new Error('INVALID_ALBUM');
        params.push(albumRes.rows[0].id);
        sets.push(`id_album = $${params.length}`);
    }

    if (sets.length === 0) {
        const { rowCount } = await query('SELECT 1 FROM photos WHERE id = $1', [id]);
        return rowCount > 0;
    }

    params.push(id);
    const { rowCount } = await query(`UPDATE photos SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
    return rowCount > 0;
}

export async function dbDeleteMedia(id) {
    if (!isUuid(id)) return null;
    const { rows } = await query(
        'DELETE FROM photos WHERE id = $1 RETURNING chemin_stockage AS "storagePath"',
        [id]
    );
    return rows[0] || null;
}

/**
 * Place un média dans un emplacement du site (ex : 'hero' = en-tête de l'accueil).
 * mediaId = null retire le média actuellement placé.
 */
export async function dbSetMediaSlot(slot, mediaId) {
    if (mediaId && !isUuid(mediaId)) return false;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('UPDATE photos SET emplacement = NULL WHERE emplacement = $1', [slot]);
        if (slot === 'hero' && mediaId) await client.query('UPDATE publications_instagram SET en_accueil = FALSE WHERE en_accueil');
        if (mediaId) {
            const { rowCount } = await client.query(
                'UPDATE photos SET emplacement = $1 WHERE id = $2 AND url IS NOT NULL',
                [slot, mediaId]
            );
            if (rowCount === 0) {
                await client.query('ROLLBACK');
                return false;
            }
        }
        await client.query('COMMIT');
        return true;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}
