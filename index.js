// Lancement local (npm run dev / npm start). Sur Vercel, c'est app.js qui est exporté comme fonction.
import { existsSync } from 'node:fs';
import app from './app.js';
import { pool, readSql } from './backend/data/db.js';
import { runMigrations } from './backend/data/store.js';
import { providerName } from './backend/auth/session.js';
import { getDatabaseRole, setDatabaseRole } from './backend/data/environment.js';

const port = process.env.PORT || 3000;

if (!process.env.VERCEL) {
    try {
        const client = await pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        console.log('Connexion à la base de données réussie');
    } catch (err) {
        console.error('Erreur de connexion à la base de données :', err.message);
        process.exit(1);
    }

    // Garde-fou : jamais de serveur de test sur la base de production, et pas de développement dessus par erreur
    if ((await getDatabaseRole()) === 'production') {
        if (process.env.NODE_ENV === 'test' || process.env.ALLOW_PRODUCTION_DATABASE !== '1') {
            console.error('Refusé : DATABASE_URL pointe vers la base de PRODUCTION.');
            console.error('Utilisez une base de développement. (En dernier recours hors tests : ALLOW_PRODUCTION_DATABASE=1.)');
            process.exit(1);
        }
        console.warn('ATTENTION : serveur local connecté à la base de PRODUCTION (ALLOW_PRODUCTION_DATABASE=1).');
    }

    // En local, le schéma est mis à jour à chaque démarrage (en production : npm run db:migrate:prod)
    await runMigrations(readSql);

    // Base de développement marquée comme telle : elle ne pourra pas être prise pour la production
    if (process.env.NODE_ENV !== 'test' && !(await getDatabaseRole())) {
        await setDatabaseRole('development');
        console.log('Base marquée « development ».');
    }

    if (!existsSync(new URL('./public/index.html', import.meta.url))) {
        console.error('Site introuvable : public/index.html manque. Lancez le serveur depuis la racine à jour du projet.');
        process.exit(1);
    }

    app.listen(port, () => {
        console.log(`Site : http://localhost:${port}`);
        console.log({
            supabase: 'Espace BDS : connexion via Supabase Auth',
            local: 'Espace BDS : connexion avec le compte local (LOCAL_ADMIN_EMAIL)',
            aucun: 'Espace BDS : aucune connexion possible — renseignez LOCAL_ADMIN_EMAIL et LOCAL_ADMIN_PASSWORD dans .env'
        }[providerName]);
    });
}

export default app;
