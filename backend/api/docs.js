import { readFile } from 'node:fs/promises';

// Spécification OpenAPI, réservée aux membres du BDS connectés (route protégée par requireAdminAuth).
// Le fichier est hors de public/ : ni le CDN de Vercel ni Express ne le servent en accès libre.
const SPEC_URL = new URL('../../docs/openapi.yaml', import.meta.url);
let cached = null;

/**
 * GET /api/docs/openapi.yaml
 */
export async function api_get_openapi(request, response) {
    try {
        cached ??= await readFile(SPEC_URL, 'utf-8');
        response
            .set('Content-Type', 'text/yaml; charset=utf-8')
            .set('Cache-Control', 'private, no-store')
            .send(cached);
    } catch (err) {
        console.error('Documentation OpenAPI introuvable :', err.message);
        response.status(500).json({ error: 'Documentation indisponible.' });
    }
}
