# Interpromos 2026

Les Interpromos est un évènement sportif organisé par le club BDS au sein de l'Institut Supérieur de l'Électronique et du Numérique (ISEN) à Nantes.
Dans l'objectif de faciliter la communication entre participants, spectateurs et organisateurs, le club Appen se lance dans un projet de création de site permettant d'afficher notamment le planning des matchs, le classement et informations utiles au bon déroulement du tournoi.

Le projet est notamment proposé aux premières années pour se familiariser avec les langages du web.

## Installation

> [!IMPORTANT]
> Vous devez avoir préalablement installé NodeJS et Git

Commencez par cloner le repository localement.
```
git clone https://github.com/appen-isen/site-interpromos-2026.git
```

Dans le dossier du projet, exécutez ensuite les commandes suivantes pour installer les dépendances :
```
npm install
cd interpromos
npm install
cd ..
```

## Structure du projet

Le projet est composé de deux parties :

### Backend (Express.js)
Le backend utilise la bibliothèque Express.js (sur NodeJS) pour servir les fichiers du frontend et gérer les requêtes API.
- `pages/`, les différentes pages du site
- `assets/`, les ressources utilisées par ces pages
 - `assets/css/`, plus spécifiquement les feuilles de style des pages
  - `assets/js/main.css`, un fichier utilisé par toutes les pages
 - `assets/js/`, les codes JavaScript des pages
- `backend/api`, gère les requêtes faites à l'API
- `index.js`, déploie le serveur et renvoie toutes les requêtes au bon endroit
 (les pages HTML `pages/` et les images, le CSS et JavaScript qui tourne côté client `assets/`) ainsi que la gestion des requêtes côté backend (`backend/`).

### Frontend (Vite + React)
Le frontend utilise Vite avec React et TypeScript pour une interface moderne et réactive.
- `interpromos/src/`, le code source React
- `interpromos/src/components/`, les composants React réutilisables
- `interpromos/src/assets/`, les ressources (images, etc.)
- `interpromos/vite.config.ts`, la configuration de Vite

## Lancer le projet

### Backend uniquement
Pour lancer le serveur backend (Express) :
```
npm run dev
# ou
npm run dev:backend
```
Le backend sera disponible sur `http://localhost:3000`.

### Frontend uniquement
Pour lancer le serveur frontend (Vite + React) :
```
npm run dev:frontend
```
Le frontend sera disponible sur `http://localhost:5173` (ou un autre port si 5173 est déjà utilisé).

### Backend et Frontend
Vous pouvez lancer les deux serveurs dans deux terminaux différents :
- Terminal 1 : `npm run dev` (backend)
- Terminal 2 : `npm run dev:frontend` (frontend)

Vous pouvez arrêter les serveurs en faisant `Ctrl` + `C` dans chaque console.

> [!NOTE]
> - Le backend doit être redémarré à chaque modification du code dans `backend/` et `index.js`.
> - Le frontend avec Vite supporte le Hot Module Replacement (HMR) : les modifications sont appliquées automatiquement sans redémarrage.

## Contribuer au projet

Lorsque vous souhaitez contribuer au projet, vous ne pouvez pas directement faire des modifications sur la branche `main`.
Créez une nouvelle branche spécifiquement pour la fonctionnalité que vous souhaitez implémenter (ex: `creation-page-liste-matchs`, `fix-bug-recherche-par-nom`, ...). Faites vos modifications de votre côté et, une fois votre code testé, faites une "Pull Request" pour passer vos changements sur la branche `main`. Le code sera rapidement vérifié par les autres collaborateurs pour être fusionné au reste du projet ou des modifications seront demandées pour améliorer votre code. Un conseil : n'utilisez pas l'IA à outrance. Ajouter une fonctionnalité c'est bien, mais comprendre comment le code que l'on a écrit marche, c'est encore mieux.