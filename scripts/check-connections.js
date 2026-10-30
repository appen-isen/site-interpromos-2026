// Vérifie les connexions aux outils utilisés par le site, pour un environnement donné.
// Lecture seule : ne crée, ne modifie et ne supprime rien (utilisable sur la production).
//
//   CHECK_ENV=test|preview|production  environnement vérifié (défaut : test)
//   APP_URL=https://…                  site déployé (ou serveur local) à tester, optionnel
//   CHECK_ADMIN=1                       teste aussi la connexion BDS avec LOCAL_ADMIN_EMAIL / LOCAL_ADMIN_PASSWORD (CI uniquement)
//
// Usage : npm run check:connections
import { pool, query } from '../backend/data/db.js';
import { getDatabaseRole } from '../backend/data/environment.js';

const ENV = (process.env.CHECK_ENV || 'test').toLowerCase();
const IS_DEPLOYED = ENV === 'preview' || ENV === 'production';
const APP_URL = String(process.env.APP_URL || '').replace(/\/+$/, '');
const REQUIRED_TABLES = [
    'edition', 'promos', 'sports', 'equipes', 'participants', 'rejoindre_equipe', 'participer_sport',
    'matchups', 'albums', 'photos', 'limites_requetes', 'sessions_revoquees'
];

const results = [];
const record = (group, name, status, detail = '') => results.push({ group, name, status, detail });
const ok = (g, n, d) => record(g, n, 'ok', d);
const warn = (g, n, d) => record(g, n, 'warn', d);
const fail = (g, n, d) => record(g, n, 'fail', d);
const ms = start => `${Date.now() - start} ms`;

async function timedFetch(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

// --- Variables d'environnement ------------------------------------------------
function checkEnv() {
    const G = 'Configuration';
    const required = ['DATABASE_URL'];
    if (IS_DEPLOYED) required.push('SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY');
    for (const name of required) {
        if (String(process.env[name] || '').trim()) ok(G, name, 'définie');
        else fail(G, name, 'manquante');
    }

    if (IS_DEPLOYED && !APP_URL) warn(G, 'APP_URL', 'non définie : le site déployé ne sera pas testé');
    if (IS_DEPLOYED && /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(APP_URL)) {
        fail(G, 'APP_URL', `${APP_URL} : adresse locale, les liens « mot de passe oublié » ramèneraient vers votre poste`);
    }

    try {
        const url = new URL(process.env.DATABASE_URL);
        const pooled = url.hostname.includes('pooler.supabase.com') && url.port === '6543';
        if (IS_DEPLOYED && !pooled) {
            warn(G, 'Pooler Supabase', `${url.hostname}:${url.port || 5432} — Vercel doit utiliser le Transaction pooler (port 6543)`);
        } else {
            ok(G, 'Hôte de la base', `${url.hostname}:${url.port || 5432}`);
        }
    } catch (e) {
        if (process.env.DATABASE_URL) fail(G, 'DATABASE_URL', 'URL illisible');
    }
}

// --- PostgreSQL / Supabase ----------------------------------------------------
async function checkDatabase() {
    const G = 'Base de données';
    const start = Date.now();
    try {
        const { rows } = await query('SHOW server_version');
        ok(G, 'Connexion', `PostgreSQL ${rows[0].server_version} · ${ms(start)}`);
    } catch (err) {
        fail(G, 'Connexion', err.message);
        return false;
    }

    const { rows: tables } = await query(
        `SELECT c.relname, c.relrowsecurity
         FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = current_schema() AND c.relkind = 'r'`
    );
    const present = new Map(tables.map(t => [t.relname, t.relrowsecurity]));
    const missing = REQUIRED_TABLES.filter(t => !present.has(t));
    if (missing.length) fail(G, 'Schéma', `tables manquantes : ${missing.join(', ')} (lancer npm run db:migrate)`);
    else ok(G, 'Schéma', `${REQUIRED_TABLES.length} tables présentes`);

    const { rows: idTypes } = await query(
        `SELECT table_name FROM information_schema.columns
         WHERE table_schema = current_schema() AND column_name = 'id' AND data_type <> 'uuid'
           AND table_name = ANY($1::TEXT[])`,
        [REQUIRED_TABLES]
    );
    if (idTypes.length) fail(G, 'Identifiants UUID', `non convertis : ${idTypes.map(r => r.table_name).join(', ')}`);
    else if (!missing.length) ok(G, 'Identifiants UUID', 'toutes les tables');

   
    const REQUIRED_COLUMNS = [['edition', 'contact_email'], ['photos', 'emplacement'], ['albums', 'date_debut'], ['participants', 'cree_le']];
    if (!missing.length) {
        const { rows: cols } = await query(
            `SELECT table_name || '.' || column_name AS col FROM information_schema.columns WHERE table_schema = current_schema()`
        );
        const present = new Set(cols.map(c => c.col));
        const absent = REQUIRED_COLUMNS.map(([t, c]) => `${t}.${c}`).filter(c => !present.has(c));
        if (absent.length) fail(G, 'Schéma à jour', `colonnes manquantes : ${absent.join(', ')} (lancer la migration)`);
        else ok(G, 'Schéma à jour', 'dernière version');
    }

    const noRls = REQUIRED_TABLES.filter(t => present.has(t) && !present.get(t));
    if (noRls.length) fail(G, 'RLS', `désactivé sur : ${noRls.join(', ')}`);
    else if (!missing.length) ok(G, 'RLS', 'activé partout');

    const { rows: views } = await query(
        `SELECT relname, COALESCE(array_to_string(reloptions, ','), '') AS opts
         FROM pg_class WHERE relkind = 'v' AND relname IN ('v_classement_sport', 'v_classement_general')`
    );
    const unsafe = views.filter(v => !v.opts.includes('security_invoker=true')).map(v => v.relname);
    if (views.length < 2) fail(G, 'Vues de classement', 'absentes');
    else if (unsafe.length) fail(G, 'Vues de classement', `pas en security_invoker : ${unsafe.join(', ')}`);
    else ok(G, 'Vues de classement', 'security_invoker');

    const { rows: anon } = await query(`SELECT 1 FROM pg_roles WHERE rolname = 'anon'`);
    if (anon.length && !missing.length) {
        const { rows } = await query(
            `SELECT COUNT(*) FILTER (WHERE has_table_privilege('anon', c.oid, 'SELECT'))::INT AS readable
             FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = current_schema() AND c.relname = ANY($1::TEXT[])`,
            [[...REQUIRED_TABLES, 'v_classement_sport', 'v_classement_general']]
        );
        if (rows[0].readable) fail(G, 'API Data Supabase', `${rows[0].readable} table(s)/vue(s) lisibles par le rôle anon`);
        else ok(G, 'API Data Supabase', 'rien de lisible par le rôle anon');
    }

    const role = await getDatabaseRole();
    if (ENV === 'production') {
        if (role === 'production') ok(G, 'Environnement', 'base marquée « production » (protégée des tests)');
        else warn(G, 'Environnement', `base marquée « ${role || 'non marquée'} » : elle le sera au prochain démarrage du site de production`);
    } else if (role === 'production') {
        fail(G, 'Environnement', `cette base est la base de PRODUCTION alors que l'environnement vérifié est « ${ENV} »`);
    } else {
        ok(G, 'Environnement', role ? `base « ${role} »` : 'base non marquée (pas la production)');
    }

    if (!missing.length) {
        const { rows } = await query(`SELECT annee, TO_CHAR(date_debut, 'YYYY-MM-DD') AS debut, lieu FROM edition LIMIT 1`);
        if (rows[0]) ok(G, 'Édition', `${rows[0].annee} · ${rows[0].debut} · ${rows[0].lieu}`);
        else warn(G, 'Édition', 'aucune ligne (créée au premier démarrage)');
    }
    return true;
}

// --- Supabase Auth (comptes de l'Espace BDS)
async function checkAuth() {
    const G = 'Supabase Auth';
    const base = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!base || !key) {
        if (!IS_DEPLOYED) warn(G, 'Connexion BDS', 'Supabase non configuré : connexion avec le compte local (LOCAL_ADMIN_EMAIL)');
        return;
    }
    const start = Date.now();
    try {
        const res = await timedFetch(`${base}/auth/v1/settings`, { headers: { apikey: key } });
        const settings = await res.json().catch(() => ({}));
        if (!res.ok) return fail(G, 'Service', `HTTP ${res.status}`);
        ok(G, 'Service', `joignable · ${ms(start)}`);
        if (!settings.external?.email) fail(G, 'Connexion par e-mail', 'désactivée (Authentication → Providers → Email)');
        if (settings.disable_signup) ok(G, 'Inscriptions publiques', 'fermées');
        else warn(G, 'Inscriptions publiques', 'ouvertes : sans accès BDS, mais à fermer (Authentication → Sign In / Providers)');
    } catch (err) {
        return fail(G, 'Service', err.name === 'AbortError' ? 'délai dépassé' : err.message);
    }

    try {
        const res = await timedFetch(`${base}/auth/v1/.well-known/jwks.json`);
        const { keys = [] } = res.ok ? await res.json() : {};
        if (keys.length) ok(G, 'Signature des jetons', `clés asymétriques (${[...new Set(keys.map(k => k.alg))].join(', ')}), vérifiées localement par jose`);
        else warn(G, 'Signature des jetons', 'ancien secret HS256 : chaque jeton est vérifié auprès de Supabase (plus lent). Migrer vers les « JWT Signing Keys »');
    } catch (err) {
        warn(G, 'Signature des jetons', `JWKS illisible (${err.message})`);
    }

    try {
        const { rows } = await query(`SELECT COUNT(*)::INT AS n FROM auth.users WHERE raw_app_meta_data->>'role' = 'bds'`);
        if (rows[0].n) ok(G, 'Comptes BDS', `${rows[0].n} compte(s) avec l'accès`);
        else fail(G, 'Comptes BDS', 'aucun : créer un compte dans Supabase puis npm run admin:grant -- <e-mail>');
    } catch (err) {
        warn(G, 'Comptes BDS', `non vérifiable (${err.message})`);
    }
}

// --- Supabase Storage ---------------------------------------------------------
async function checkStorage() {
    const G = 'Supabase Storage';
    const base = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!base || !key) {
        if (!IS_DEPLOYED) warn(G, 'Stockage', 'non configuré : médias enregistrés dans uploads/ (développement)');
        return;
    }
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'medias';
    const start = Date.now();
    try {
        const res = await timedFetch(`${base}/storage/v1/bucket/${encodeURIComponent(bucket)}`, {
            headers: { Authorization: `Bearer ${key}`, apikey: key }
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            const notFound = res.status === 404 || /not found|does not exist/i.test(`${data.message} ${data.error}`);
            fail(G, `Bucket « ${bucket} »`, notFound ? 'introuvable : créez-le dans Storage (public)' : `HTTP ${res.status} ${data.message || data.error || ''}`.trim());
            return;
        }
        ok(G, `Bucket « ${bucket} »`, `accessible · ${ms(start)}`);
        if (!data.public) fail(G, 'Accès public', 'le bucket doit être public pour afficher les médias');
        else ok(G, 'Accès public', 'oui');
        if (data.file_size_limit) {
            ok(G, 'Taille max par fichier', `${Math.round(data.file_size_limit / 1024 / 1024)} Mo`);
        }
    } catch (err) {
        fail(G, `Bucket « ${bucket} »`, err.name === 'AbortError' ? 'délai dépassé' : err.message);
    }
}

// --- Site déployé (Vercel) ou serveur local -----------------------------------
async function checkApp() {
    if (!APP_URL) return;
    const G = IS_DEPLOYED ? 'Site (Vercel)' : 'Site';
    const probes = [
        ['/api/ping', async res => (await res.json()).message === 'pong'],
        ['/api/state', async res => Array.isArray((await res.json()).matches)],
        ['/api/edition', async res => Number.isInteger((await res.json()).year)],
        ['/', async res => (await res.text()).includes('id="root"')],
        ['/docs/', async res => (await res.text()).includes('swagger-ui')]
    ];
    for (const [path, validate] of probes) {
        const start = Date.now();
        try {
            const res = await timedFetch(`${APP_URL}${path}`);
            if (!res.ok) fail(G, path, `HTTP ${res.status}`);
            else if (!(await validate(res))) fail(G, path, 'réponse inattendue');
            else ok(G, path, ms(start));
        } catch (err) {
            fail(G, path, err.name === 'AbortError' ? 'délai dépassé' : err.message);
        }
    }

    // Documentation de l'API : réservée au BDS, plus aucune copie publique
    try {
        const locked = await timedFetch(`${APP_URL}/api/docs/openapi.yaml`);
        if (locked.status === 401) ok(G, 'Documentation API', 'réservée au BDS (401 sans connexion)');
        else fail(G, 'Documentation API', `accessible sans connexion (HTTP ${locked.status})`);
        const legacy = await timedFetch(`${APP_URL}/openapi.yaml`);
        if (legacy.ok && (await legacy.text()).startsWith('openapi:')) fail(G, 'Documentation API', 'encore servie publiquement sur /openapi.yaml');
    } catch (err) {
        fail(G, 'Documentation API', err.message);
    }

    // Les données publiques ne doivent jamais exposer d'e-mail
    try {
        const state = await (await timedFetch(`${APP_URL}/api/state`)).json();
        const leaks = [...(state.teams || []), ...(state.regs || [])].filter(x => 'email' in x).length;
        if (leaks) fail(G, 'Données publiques', `${leaks} e-mail(s) visibles sans connexion`);
        else ok(G, 'Données publiques', 'aucun e-mail exposé');
    } catch (err) { /* déjà signalé par la sonde /api/state */ }

    if (process.env.CHECK_ADMIN === '1') {
        // Ces tests écrivent en base (connexion, déconnexion) : jamais sur la production
        const role = process.env.DATABASE_URL ? await getDatabaseRole().catch(() => null) : null;
        if (IS_DEPLOYED || role === 'production') fail(G, 'Tests admin', 'refusés : réservés aux bases de test (CHECK_ADMIN=1 hors production)');
        else await checkAdminLogin(G);
    }
}

async function checkAdminLogin(G) {
    const json = { 'Content-Type': 'application/json' };
    try {
        const login = await timedFetch(`${APP_URL}/api/auth/login`, {
            method: 'POST',
            headers: json,
            body: JSON.stringify({ email: process.env.LOCAL_ADMIN_EMAIL, password: process.env.LOCAL_ADMIN_PASSWORD })
        });
        const { token } = await login.json();
        if (!login.ok || !token) return fail(G, 'Connexion BDS', `HTTP ${login.status}`);
        const auth = { Authorization: `Bearer ${token}` };

        const me = await timedFetch(`${APP_URL}/api/auth/me`, { headers: auth });
        const regs = await timedFetch(`${APP_URL}/api/registrations`, { headers: auth });
        const badId = await timedFetch(`${APP_URL}/api/teams/pas-un-uuid`, { method: 'DELETE', headers: auth });
        const docs = await timedFetch(`${APP_URL}/api/docs/openapi.yaml`, { headers: auth });
        if (docs.ok && (await docs.text()).startsWith('openapi:')) ok(G, 'Documentation API (connecté)', 'lisible par le BDS');
        else fail(G, 'Documentation API (connecté)', `HTTP ${docs.status}`);
        await timedFetch(`${APP_URL}/api/auth/logout`, { method: 'POST', headers: auth });
        const after = await timedFetch(`${APP_URL}/api/auth/me`, { headers: auth });

        if (me.ok && regs.ok) ok(G, 'Connexion BDS', 'jeton accepté sur les routes admin');
        else fail(G, 'Connexion BDS', `me ${me.status} · registrations ${regs.status}`);
        if (badId.status === 404) ok(G, 'Identifiant invalide', '404');
        else fail(G, 'Identifiant invalide', `HTTP ${badId.status} au lieu de 404`);
        if (after.status === 401) ok(G, 'Déconnexion', 'jeton révoqué');
        else fail(G, 'Déconnexion', `jeton encore accepté (HTTP ${after.status})`);

        const anonymous = await timedFetch(`${APP_URL}/api/registrations`);
        if (anonymous.status === 401) ok(G, 'Routes protégées', '401 sans jeton');
        else fail(G, 'Routes protégées', `HTTP ${anonymous.status} sans jeton`);
    } catch (err) {
        fail(G, 'Connexion BDS', err.message);
    }
}

// --- Rapport ------------------------------------------------------------------
async function report() {
    const icon = { ok: '✅', warn: '⚠️', fail: '❌' };
    console.log(`\nVérification des connexions — environnement : ${ENV}\n`);
    let current = '';
    for (const r of results) {
        if (r.group !== current) {
            current = r.group;
            console.log(`\n${current}`);
        }
        console.log(`  ${icon[r.status]} ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
    }
    const failures = results.filter(r => r.status === 'fail').length;
    const warnings = results.filter(r => r.status === 'warn').length;
    console.log(`\n${failures ? `${failures} échec(s)` : 'Tout est opérationnel'}${warnings ? `, ${warnings} avertissement(s)` : ''}.\n`);

    // Résumé affiché sur la page du workflow GitHub Actions
    if (process.env.GITHUB_STEP_SUMMARY) {
        const { appendFile } = await import('node:fs/promises');
        const lines = [
            `### Connexions — ${ENV}`,
            '',
            '| | Outil | Vérification | Détail |',
            '| --- | --- | --- | --- |',
            ...results.map(r => `| ${icon[r.status]} | ${r.group} | ${r.name} | ${String(r.detail).replace(/\|/g, '\\|')} |`),
            ''
        ];
        await appendFile(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`);
    }
    return failures;
}

checkEnv();
try {
    if (process.env.DATABASE_URL) {
        await checkDatabase();
    }
    await checkAuth();
    await checkStorage();
    await checkApp();
} catch (err) {
    fail('Vérification', 'Erreur inattendue', err.message);
} finally {
    await pool.end().catch(() => {});
}
process.exitCode = (await report()) ? 1 : 0;
