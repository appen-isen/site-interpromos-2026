// Posts et reels Instagram affichés sur le site.
import { pool, query } from '../db.js';
import { isUuid } from './constants.js';

// Instagram

/**
 * Nom de compte Instagram sans @ : accepte « bds_isen », « @bds_isen » ou l'adresse du profil.
 * Vide → null ; invalide → undefined.
 */
export function normalizeInstagramHandle(value) {
    let raw = String(value ?? '').trim();
    if (!raw) return null;
    const fromUrl = raw.match(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([^/?#]+)/i);
    if (fromUrl) raw = fromUrl[1];
    raw = raw.replace(/^@/, '').toLowerCase();
    return /^[a-z0-9._]{1,30}$/.test(raw) ? raw : undefined;
}

/**
 * Lit l'adresse d'un post ou d'un reel : instagram.com/p/<code>/, /reel/<code>/, /reels/<code>/, /tv/<code>/
 * (avec ou sans nom du compte avant)
 */
export function parseInstagramUrl(value) {
    const m = String(value ?? '').trim().match(
        /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:[a-z0-9._]+\/)?(p|reels?|tv)\/([A-Za-z0-9_-]{5,40})\/?(?:[?#].*)?$/i
    );
    if (!m) return null;
    return { code: m[2], type: m[1].toLowerCase() === 'p' ? 'post' : 'reel' };
}

const instagramRow = r => ({
    id: r.id,
    code: r.code,
    type: r.type,
    url: `https://www.instagram.com/${r.type === 'reel' ? 'reel' : 'p'}/${r.code}/`,
    video: r.video_url || null,
    hero: Boolean(r.en_accueil)
});

// Du plus récent au plus ancien ajouté
export async function dbGetInstagramPosts() {
    const { rows } = await query('SELECT id, code, type, video_url, en_accueil FROM publications_instagram ORDER BY cree_le DESC LIMIT 24');
    return rows.map(instagramRow);
}

/**
 * Ajoute un post ou un reel. Lève INVALID_URL ou DUPLICATE.
 */
export async function dbAddInstagramPost(url) {
    const parsed = parseInstagramUrl(url);
    if (!parsed) throw new Error('INVALID_URL');
    const { rows } = await query(
        `INSERT INTO publications_instagram (code, type) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING RETURNING id, code, type`,
        [parsed.code, parsed.type]
    );
    if (!rows.length) throw new Error('DUPLICATE');
    return instagramRow(rows[0]);
}

/**
 * Retire un post. Retourne null s'il n'existe pas, sinon { storagePath } de sa vidéo (à supprimer, peut être null).
 */
export async function dbDeleteInstagramPost(id) {
    if (!isUuid(id)) return null;
    const { rows } = await query('DELETE FROM publications_instagram WHERE id = $1 RETURNING chemin_video AS "storagePath"', [id]);
    return rows[0] || null;
}

/**
 * Joint (ou retire, avec url = null) la vidéo d'un post. Retourne null si le post n'existe pas,
 * sinon { oldStoragePath } : l'ancienne vidéo, à supprimer.
 */
export async function dbSetInstagramVideo(id, { url = null, storagePath = null } = {}) {
    if (!isUuid(id)) return null;
    const { rows } = await query(
        `UPDATE publications_instagram p SET video_url = $2, chemin_video = $3, en_accueil = p.en_accueil AND $2 IS NOT NULL
         FROM (SELECT id, chemin_video FROM publications_instagram WHERE id = $1 FOR UPDATE) old
         WHERE p.id = old.id
         RETURNING old.chemin_video AS "oldStoragePath"`,
        [id, url, storagePath]
    );
    return rows[0] || null;
}

// Vidéo d'accueil venant d'Instagram, au même format que les médias de la galerie (slots.hero)
export async function dbGetInstagramHero() {
    const { rows } = await query(
        `SELECT id, code, type, video_url FROM publications_instagram WHERE en_accueil AND video_url IS NOT NULL LIMIT 1`
    );
    if (!rows.length) return null;
    const r = instagramRow(rows[0]);
    return { id: r.id, slot: 'hero', type: 'video', url: r.video, caption: `${r.type === 'reel' ? 'Reel' : 'Post'} Instagram du BDS`, instagram: r.url };
}

/**
 * Met (on = true) ou retire la vidéo d'un post en tête de l'accueil. Le média « hero » de la galerie est alors retiré.
 * Lève NOT_FOUND ou NO_VIDEO.
 */
export async function dbSetInstagramHero(id, on) {
    if (!isUuid(id)) throw new Error('NOT_FOUND');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { rows } = await client.query('SELECT video_url FROM publications_instagram WHERE id = $1 FOR UPDATE', [id]);
        if (!rows.length) throw new Error('NOT_FOUND');
        if (on && !rows[0].video_url) throw new Error('NO_VIDEO');
        if (on) {
            await client.query('UPDATE publications_instagram SET en_accueil = FALSE WHERE en_accueil AND id <> $1', [id]);
            await client.query(`UPDATE photos SET emplacement = NULL WHERE emplacement = 'hero'`);
        }
        await client.query('UPDATE publications_instagram SET en_accueil = $2 WHERE id = $1', [id, Boolean(on)]);
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}
