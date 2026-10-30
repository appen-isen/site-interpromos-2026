import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Dossier local 
export const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');

// Taille max par fichier : MEDIA_MAX_MB (défaut 200 Mo)
export const MAX_UPLOAD_BYTES = (Number(process.env.MEDIA_MAX_MB) || 200) * 1024 * 1024;

const EXTENSIONS = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov'
};

/**
 * Détermine le type réel du fichier à partir de ses premiers octets en en anylast la sgnaturee 
 */
export function sniffMime(buf) {
    if (!Buffer.isBuffer(buf) || buf.length < 12) return null;

    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
    if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';

    const head6 = buf.toString('ascii', 0, 6);
    if (head6 === 'GIF87a' || head6 === 'GIF89a') return 'image/gif';
    if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
    if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return 'video/webm';

    if (buf.toString('ascii', 4, 8) === 'ftyp') {
        const brand = buf.toString('ascii', 8, 12);
        if (brand.startsWith('qt')) return 'video/quicktime';
        // HEIC / AVIF (photos iPhone) : non lisibles par tous les navigateurs (a revoir @sony-level   )
        if (/^(heic|heix|hevc|mif1|msf1|avif)/.test(brand)) return null;
        return 'video/mp4';
    }

    return null;
}

export function getSupabaseConfig() {
    const url = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    return { url, key, bucket: process.env.SUPABASE_STORAGE_BUCKET || 'medias' };
}

function newFileName(ext) {
    return `${new Date().toISOString().slice(0, 10)}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
}

export function isSupabaseStorage() {
    return Boolean(getSupabaseConfig());
}

export function mimeFromDeclared(type) {
    return EXTENSIONS[type] ? type : null;
}

/**
 * Retourne l'URL signée (valable 2 h, un seul envoi) et le chemin de l'objet.
 */
export async function createSignedUpload(mime) {
    const sb = getSupabaseConfig();
    const ext = EXTENSIONS[mime];
    if (!sb || !ext) throw new Error('UNSUPPORTED_MEDIA');

    const objectPath = `galerie/${newFileName(ext)}`;
    const res = await fetch(`${sb.url}/storage/v1/object/upload/sign/${sb.bucket}/${objectPath}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${sb.key}`, apikey: sb.key, 'Content-Type': 'application/json' },
        body: '{}'
    });
    const data = await res.json().catch(() => ({}));
    const signed = data.url ? new URL(data.url, `${sb.url}/storage/v1/`) : null;
    const token = signed?.searchParams.get('token');
    if (!res.ok || !token) {
        throw new Error(`SUPABASE_SIGN_FAILED (${res.status}) ${data.message || data.error || ''}`);
    }
    return {
        objectPath,
        uploadUrl: `${sb.url}/storage/v1/object/upload/sign/${sb.bucket}/${objectPath}?token=${encodeURIComponent(token)}`
    };
}

/**
 * lié a supabase pour analyser le type de fichier envoye
 */
export async function inspectUploadedObject(objectPath) {
    const sb = getSupabaseConfig();
    if (!sb || !/^galerie\/[\w.-]+$/.test(objectPath)) return null;

    const res = await fetch(`${sb.url}/storage/v1/object/${sb.bucket}/${objectPath}`, {
        headers: { Authorization: `Bearer ${sb.key}`, apikey: sb.key, Range: 'bytes=0-63' }
    });
    if (!res.ok || !res.body) return null;

    // On ne lit que le début du fichier, même si le serveur ignore l'en-tête Range (ok)
    const reader = res.body.getReader();
    const chunks = [];
    let size = 0;
    while (size < 64) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        size += value.length;
    }
    reader.cancel().catch(() => {});

    const mime = sniffMime(Buffer.concat(chunks.map(c => Buffer.from(c))));
    if (!mime) return null;
    return {
        mime,
        url: `${sb.url}/storage/v1/object/public/${sb.bucket}/${objectPath}`,
        storagePath: `supabase:${objectPath}`
    };
}

/**
 * Enregistre un fichier média et retourne son URL publique ainsi que son chemin de stockage.
 * - Production : Supabase Storage (bucket public) si SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY sont définis
 * - Développement : dossier ./uploads servi par Express sur /uploads
 */
export async function saveMediaFile(buffer, mime) {
    const ext = EXTENSIONS[mime];
    if (!ext) throw new Error('UNSUPPORTED_MEDIA');

    const fileName = newFileName(ext);
    const sb = getSupabaseConfig();

    if (sb) {
        const objectPath = `galerie/${fileName}`;
        const res = await fetch(`${sb.url}/storage/v1/object/${sb.bucket}/${objectPath}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${sb.key}`,
                apikey: sb.key,
                'Content-Type': mime,
                'cache-control': 'max-age=31536000'
            },
            body: buffer
        });
        if (!res.ok) {
            const details = await res.text().catch(() => '');
            throw new Error(`SUPABASE_UPLOAD_FAILED (${res.status}) ${details}`);
        }
        return {
            url: `${sb.url}/storage/v1/object/public/${sb.bucket}/${objectPath}`,
            storagePath: `supabase:${objectPath}`
        };
    }

    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    await fs.writeFile(path.join(UPLOADS_DIR, fileName), buffer);
    return { url: `/uploads/${fileName}`, storagePath: `local:${fileName}` };
}

/**
 * Supprime physiquement un fichier média
 */
export async function deleteMediaFile(storagePath) {
    if (!storagePath) return;

    if (storagePath.startsWith('local:')) {
        const fileName = path.basename(storagePath.slice('local:'.length));
        await fs.unlink(path.join(UPLOADS_DIR, fileName)).catch(() => {});
        return;
    }

    if (storagePath.startsWith('supabase:')) {
        const sb = getSupabaseConfig();
        if (!sb) return;
        await fetch(`${sb.url}/storage/v1/object/${sb.bucket}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${sb.key}`,
                apikey: sb.key,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prefixes: [storagePath.slice('supabase:'.length)] })
        }).catch(() => {});
    }
}
