import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');
const ENV_PATH = path.join(ROOT_DIR, '.env');
const SQL_DIR = path.resolve(__dirname, '../sql');

// Chargement automatique du fichier .env s'il existe
function loadEnvFile() {
    if (!fs.existsSync(ENV_PATH)) return;
    const lines = fs.readFileSync(ENV_PATH, 'utf-8').split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
        if (!(key in process.env)) {
            process.env[key] = val;
        }
    }
}

loadEnvFile();

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

// Activation automatique de SSL pour Supabas DB_SSL=true
const useSsl =
    process.env.DB_SSL === 'true' ||
    (connectionString && (connectionString.includes('supabase.co') || connectionString.includes('supabase.com'))) ||
    (connectionString && connectionString.includes('sslmode='));


const IS_SERVERLESS = Boolean(process.env.VERCEL);

export const pool = new Pool({
    connectionString,
    ssl: useSsl ? {
        rejectUnauthorized: false
    } : false,
    max: IS_SERVERLESS ? 3 : 10,
    idleTimeoutMillis: IS_SERVERLESS ? 10_000 : 30_000,
    connectionTimeoutMillis: 10_000
});

pool.on('error', err => {
    console.error('Erreur inattendue sur le pool PostgreSQL / Supabase :', err.message);
});

/**
 * Exécute une requête SQL paramétrée ($1, $2, ...) sur la base PostgreSQL / Supabase
 */
export async function query(text, params = []) {
    return pool.query(text, params);
}

/**
 * Lit un script SQL de backend/sql/ (init.sql, upgrade-uuid.sql) pour runMigrations (store.js)
 */
export function readSql(fileName = 'init.sql') {
    return fs.readFileSync(path.join(SQL_DIR, fileName), 'utf-8');
}
