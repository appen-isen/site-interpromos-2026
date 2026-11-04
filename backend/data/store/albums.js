// Albums de la galerie : création, dates, publication.
import { query } from '../db.js';
import { isUuid } from './constants.js';
import { dbGetGallery } from './media.js';

export async function dbUpdateAlbumVisibility(name, published) {
    const { rows } = await query('SELECT id, publie FROM albums WHERE nom = $1', [name]);
    if (rows.length === 0) return null;

    const nextVal = typeof published === 'boolean' ? published : !rows[0].publie;
    await query('UPDATE albums SET publie = $1 WHERE id = $2', [nextVal, rows[0].id]);

    const { pub } = await dbGetGallery();
    return { name, published: nextVal, pub };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function parseAlbumDate(value) {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    const str = String(value);
    if (!ISO_DATE.test(str) || Number.isNaN(Date.parse(`${str}T00:00:00Z`))) throw new Error('INVALID_DATE');
    return str;
}

/**
 * Valide les champs d'un album (nom, dates). Lève INVALID_NAME / INVALID_DATE / INVALID_RANGE.
 */
function normalizeAlbumInput({ name, start, end, published }) {
    const out = {};
    if (name !== undefined) {
        out.name = String(name || '').trim().slice(0, 80);
        if (!out.name) throw new Error('INVALID_NAME');
    }
    out.start = parseAlbumDate(start);
    out.end = parseAlbumDate(end);
    if (out.end && out.start === null) throw new Error('INVALID_RANGE');
    if (out.start && out.end && out.end < out.start) throw new Error('INVALID_RANGE');
    if (published !== undefined) out.published = Boolean(published);
    return out;
}

/**
 * Crée un album (catégorie de la galerie), éventuellement daté pour un événement passé, en cours ou à venir.
 * Retourne null si un album du même nom existe déjà.
 */
export async function dbCreateAlbum(input) {
    const { name, start = null, end = null, published = true } = normalizeAlbumInput({
        ...input,
        name: input.name ?? '',
        start: input.start ?? null,
        end: input.end ?? null
    });
    const { rows } = await query(
        `INSERT INTO albums (nom, publie, date_debut, date_fin) VALUES ($1, $2, $3, $4)
         ON CONFLICT (nom) DO NOTHING RETURNING id`,
        [name, published, start, end]
    );
    return rows[0]?.id ?? null;
}

/**
 * Modifie un album. Retourne false s'il n'existe pas ; lève DUPLICATE_NAME si le nom est déjà pris.
 */
export async function dbUpdateAlbum(id, input) {
    if (!isUuid(id)) return false;
    const { name, start, end, published } = normalizeAlbumInput(input);
    const sets = [];
    const params = [];
    const add = (col, val) => {
        params.push(val);
        sets.push(`${col} = $${params.length}`);
    };
    if (name !== undefined) add('nom', name);
    if (start !== undefined) add('date_debut', start);
    if (end !== undefined) add('date_fin', end);
    if (published !== undefined) add('publie', published);

    if (sets.length === 0) {
        const { rowCount } = await query('SELECT 1 FROM albums WHERE id = $1', [id]);
        return rowCount > 0;
    }

    params.push(id);
    try {
        const { rowCount } = await query(`UPDATE albums SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
        return rowCount > 0;
    } catch (err) {
        if (err.code === '23505') throw new Error('DUPLICATE_NAME');
        throw err;
    }
}

/**
 * Supprime un album vide. Retourne 'not_found', 'not_empty' ou 'deleted'.
 */
export async function dbDeleteAlbum(id) {
    if (!isUuid(id)) return 'not_found';
    const { rows } = await query(
        `SELECT a.id, COUNT(p.id)::INT AS count FROM albums a LEFT JOIN photos p ON p.id_album = a.id
         WHERE a.id = $1 GROUP BY a.id`,
        [id]
    );
    if (rows.length === 0) return 'not_found';
    if (rows[0].count > 0) return 'not_empty';
    await query('DELETE FROM albums WHERE id = $1', [id]);
    return 'deleted';
}
