import { readFile } from 'node:fs/promises';


const INFO = new URL('../../docs/openapi/info.yaml', import.meta.url);
const PATHS = [
    new URL('../../docs/openapi/paths/01-system-auth.yaml', import.meta.url),
    new URL('../../docs/openapi/paths/02-tournament.yaml', import.meta.url),
    new URL('../../docs/openapi/paths/03-instagram.yaml', import.meta.url),
    new URL('../../docs/openapi/paths/04-matches.yaml', import.meta.url),
    new URL('../../docs/openapi/paths/05-teams.yaml', import.meta.url),
    new URL('../../docs/openapi/paths/06-registrations.yaml', import.meta.url),
    new URL('../../docs/openapi/paths/07-gallery-media.yaml', import.meta.url),
    new URL('../../docs/openapi/paths/08-import.yaml', import.meta.url)
];
const COMPONENTS = [
    new URL('../../docs/openapi/components/01-common.yaml', import.meta.url),
    new URL('../../docs/openapi/components/02-schemas.yaml', import.meta.url)
];

const readAll = urls => Promise.all(urls.map(url => readFile(url, 'utf-8')));
const join = parts => parts.map(text => text.replace(/\s+$/, '')).join('\n\n');

/**
 * Spécification complète (texte YAML), assemblée à partir de docs/openapi/
 */
export async function readOpenApiSpec() {
    const [info, paths, components] = await Promise.all([readFile(INFO, 'utf-8'), readAll(PATHS), readAll(COMPONENTS)]);
    return `${info.replace(/\s+$/, '')}\n\npaths:\n${join(paths)}\n\ncomponents:\n${join(components)}\n`;
}

let cached = null;

/**
 * GET /api/docs/openapi.yaml
 */
export async function api_get_openapi(request, response) {
    try {
        cached ??= await readOpenApiSpec();
        response
            .set('Content-Type', 'text/yaml; charset=utf-8')
            .set('Cache-Control', 'private, no-store')
            .send(cached);
    } catch (err) {
        console.error('Documentation OpenAPI introuvable :', err.message);
        response.status(500).json({ error: 'Documentation indisponible.' });
    }
}
