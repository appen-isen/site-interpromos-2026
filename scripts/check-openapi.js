// Vérifie que docs/openapi.yaml est un document valide et cohérent avec le code :
// Usage : npm run check:openapi

import { readFileSync } from 'node:fs';
import { parse, YAMLParseError } from 'yaml';

const root = new URL('../', import.meta.url);
const app = readFileSync(new URL('app.js', root), 'utf-8');
const errors = [];

let spec;
try {
    spec = parse(readFileSync(new URL('docs/openapi.yaml', root), 'utf-8'), { prettyErrors: true, uniqueKeys: true });
} catch (err) {
    const where = err instanceof YAMLParseError && err.linePos ? ` (ligne ${err.linePos[0].line})` : '';
    console.error(`openapi.yaml illisible${where} :\n${err.message}`);
    process.exit(1);
}

if (!String(spec.openapi || '').startsWith('3.')) errors.push('Champ « openapi » absent ou différent de 3.x');
if (!spec.info?.title || !spec.info?.version) errors.push('info.title et info.version sont obligatoires');

// Routes du code : app.get('/api/...', ...) y compris sur plusieurs lignes
const METHODS = ['get', 'post', 'put', 'patch', 'delete'];
const codeRoutes = new Set(
    [...app.matchAll(/app\.(get|post|put|patch|delete)\(\s*'(\/api[^']+)'/g)]
        .map(([, method, path]) => `${method.toUpperCase()} ${path.replace(/:(\w+)/g, '{$1}')}`)
);

const docRoutes = new Set();
const operationIds = new Map();
for (const [path, item] of Object.entries(spec.paths || {})) {
    for (const method of METHODS.filter(m => item[m])) {
        const route = `${method.toUpperCase()} ${path}`;
        const op = item[method];
        docRoutes.add(route);
        if (!op.operationId) errors.push(`operationId manquant : ${route}`);
        else if (operationIds.has(op.operationId)) errors.push(`operationId en double « ${op.operationId} » : ${route} et ${operationIds.get(op.operationId)}`);
        else operationIds.set(op.operationId, route);
        if (!op.responses || !Object.keys(op.responses).length) errors.push(`Aucune réponse décrite : ${route}`);

        // Chaque paramètre {x} du chemin doit être déclaré (au niveau du chemin ou de l'opération)
        const declared = [...(item.parameters || []), ...(op.parameters || [])]
            .map(p => (p.$ref ? resolve(p.$ref)?.name : p.name));
        for (const [, name] of path.matchAll(/\{(\w+)\}/g)) {
            if (!declared.includes(name)) errors.push(`Paramètre {${name}} non déclaré : ${route}`);
        }
    }
}

for (const route of codeRoutes) if (!docRoutes.has(route)) errors.push(`Route non documentée : ${route}`);
for (const route of docRoutes) if (!codeRoutes.has(route)) errors.push(`Route documentée mais absente de app.js : ${route}`);

// Références internes (#/components/...)
function resolve(ref) {
    return ref.replace(/^#\//, '').split('/').reduce((node, key) => node?.[key], spec);
}
(function walk(node) {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    if (typeof node.$ref === 'string' && resolve(node.$ref) === undefined) errors.push(`Référence introuvable : ${node.$ref}`);
    Object.values(node).forEach(walk);
})(spec);

if (errors.length) {
    console.error(`openapi.yaml : ${errors.length} problème(s)\n- ${[...new Set(errors)].join('\n- ')}`);
    process.exitCode = 1;
} else {
    const components = Object.values(spec.components || {}).reduce((n, section) => n + Object.keys(section).length, 0);
    console.log(`openapi.yaml valide et cohérent : ${codeRoutes.size} routes, ${operationIds.size} opérations, ${components} composants.`);
}
