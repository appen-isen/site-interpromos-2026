# Site Interpromos

Site du tournoi inter-promotions de l'ISEN Nantes, organisé par le BDS et le club APPEN : planning, scores en direct, classements, inscriptions des équipes et galerie photo/vidéo. Le BDS gère tout depuis l'Espace BDS (`/#admin`).

Node.js + Express pour l'API, PostgreSQL (Supabase en production), et un front en JavaScript sans framework ni étape de build.

## Lancer le projet en local

Il faut Node.js 20.6 ou plus (22 conseillé, voir `.nvmrc`) et une base PostgreSQL.

```bash
npm install
cp .env.example .env    # renseigner DATABASE_URL, LOCAL_ADMIN_EMAIL et LOCAL_ADMIN_PASSWORD
npm run dev
```

Le site tourne sur http://localhost:3000. Au démarrage, le schéma de la base est créé ou mis à jour automatiquement, et la base est marquée « development ».

Deux environnements, deux fichiers : `.env` pour le développement (utilisé par `npm run dev`), `.env.production` pour la production (utilisé par les commandes `…:prod`). Aucun des deux n'est versionné.

En local, pas besoin de Supabase pour entrer dans l'Espace BDS : on se connecte avec `LOCAL_ADMIN_EMAIL` / `LOCAL_ADMIN_PASSWORD`. En production, les comptes du BDS sont dans Supabase Auth (voir [`backend/auth/`](backend/auth/README.md)). Aucun identifiant ni adresse n'est écrit dans le code : tout passe par `.env` ou par l'onglet « Édition » de l'Espace BDS (adresse de contact affichée sur le site).

## Organisation du code

| Dossier | Contenu |
| --- | --- |
| [`public/`](public/README.md) | Le site : pages HTML, CSS, JavaScript, documentation de l'API |
| [`backend/api/`](backend/api/README.md) | Les routes de l'API, une par domaine (matchs, équipes, galerie…) |
| [`backend/auth/`](backend/auth/README.md) | Connexion à l'Espace BDS (Supabase Auth) |
| [`backend/data/`](backend/data/README.md) | Accès à la base et stockage des médias |
| [`backend/sql/`](backend/sql/README.md) | Schéma de la base et migrations |
| [`scripts/`](scripts/README.md) | Commandes de maintenance et de vérification (`db:migrate`, `db:clean`, `check`…) |

`app.js` déclare l'application Express et toutes les routes. `index.js` ne sert qu'au lancement local.

La documentation de l'API (`docs/openapi.yaml`) est réservée aux membres du BDS : une fois connecté à l'Espace BDS, menu « Documentation API ».

Les tests ne tournent jamais sur la base de production : le site de production marque sa base, et la CI, `npm run db:clean`, le serveur local de test et les vérifications admin refusent ensuite de s'y connecter (voir [`scripts/`](scripts/README.md)).

## Mise en production

Le site et l'API sont déployés ensemble sur un seul projet Vercel, la base et les médias sont sur Supabase.

1. Sur Supabase : créer un bucket public `medias` (Storage) et récupérer l'URL du *Transaction pooler* (port 6543).
2. Sur Vercel : importer le dépôt, puis renseigner les variables d'environnement listées dans [`.env.example`](.env.example) (`DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_URL`).
3. Copier `.env.example` en `.env.production` avec les valeurs de production, puis lancer `npm run db:migrate:prod` (schéma à jour et base marquée « production »).
4. Créer les comptes du BDS dans Supabase (*Authentication → Users*), puis leur donner l'accès : `npm run admin:grant -- prenom.nom@…`.

Les comptes, mots de passe et sessions de l'Espace BDS sont gérés par Supabase Auth. Pensez à fermer les inscriptions publiques dans Supabase (*Authentication → Sign In / Providers*).

