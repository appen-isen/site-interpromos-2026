// Vide toutes les données de la base (tables conservées) — réservé aux tests.
// Usage : npm run db:clean -- --yes

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { pool } from '../backend/data/db.js';
import { assertNotProductionDatabase } from '../backend/data/environment.js';

if (!process.argv.includes('--yes')) {
    console.error('Cette commande efface TOUTES les données (équipes, matchs, inscriptions, galerie).');
    console.error('Relancez avec --yes pour confirmer : npm run db:clean -- --yes');
    process.exit(1);
}

if (process.env.NODE_ENV === 'production') {
    console.error('Refusé : NODE_ENV=production.');
    process.exit(1);
}

const cleanSql = readFileSync(fileURLToPath(new URL('../backend/sql/clean.sql', import.meta.url)), 'utf-8');

try {
    await assertNotProductionDatabase('npm run db:clean');
    console.log('Nettoyage de la base de données...');
    await pool.query(cleanSql);
    console.log('Base de données vidée. Les promos, sports et albums par défaut seront recréés au prochain démarrage du serveur.');
} catch (err) {
    console.error('Erreur lors du nettoyage :', err.message);
    process.exitCode = 1;
} finally {
    await pool.end();
}
