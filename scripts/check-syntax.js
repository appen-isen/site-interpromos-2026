// Vérifie la syntaxe de tous les fichiers JavaScript du projet (serveur, scripts et site).
// Usage : npm run check:syntax

import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const TARGETS = ['app.js', 'index.js', 'backend', 'scripts', 'public/assets/js'];

function collect(path) {
    const full = join(ROOT, path);
    if (statSync(full).isFile()) return full.endsWith('.js') ? [full] : [];
    return readdirSync(full).flatMap(name => collect(join(path, name)));
}

const files = TARGETS.flatMap(collect);
const failures = files.filter(file => {
    const { status, stderr } = spawnSync(process.execPath, ['--check', file], { encoding: 'utf-8' });
    if (status !== 0) process.stderr.write(`\n${relative(ROOT, file)}\n${stderr}`);
    return status !== 0;
});

if (failures.length) {
    console.error(`\n${failures.length} fichier(s) en erreur sur ${files.length}.`);
    process.exitCode = 1;
} else {
    console.log(`Syntaxe correcte : ${files.length} fichiers JavaScript.`);
}
