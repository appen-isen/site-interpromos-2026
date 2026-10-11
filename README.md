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

Dans le dossier du projet, exécutez ensuite la commande suivante pour installer les dépendances.
```
npm install
```

## Structure du projet

Le projet utilise la bibliothèque Express.js (sur NodeJS) pour servir les fichiers du frontend et gérer les requêtes côté backend.
- `pages/`, les différentes pages du site
- `assets/`, les ressources utilisées par ces pages
 - `assets/css/`, plus spécifiquement les feuilles de style des pages
  - `assets/js/main.css`, un fichier utilisé par toutes les pages
 - `assets/js/`, les codes JavaScript des pages
- `backend/api`, gère les requêtes faites à l'API
- `index.js`, déploie le serveur et renvoie toutes les requêtes au bon endroit
 (les pages HTML `pages/` et les images, le CSS et JavaScript qui tourne côté client `assets/`) ainsi que la gestion des requêtes côté backend (`backend/`).

## Lancer le projet

Pour lancer le projet localement, vous pouvez utiliser la commande suivante
```
npm run dev
```
Le site devrait être disponible en local depuis l'adresse `http://localhost:3000` (ou sur un autre port si modifié).
Vous pouvez arrêter le serveur en faisant `Ctrl` + `C` dans la console.
Il faudra redémarrer le serveur à chaque fois que vous modifiez du code dans `backend/` et `index.js` pour voir les changements.

## Contribuer au projet

Lorsque vous souhaitez contribuer au projet, vous ne pouvez pas directement faire des modifications sur la branche `main`.
Créez une nouvelle branche spécifiquement pour la fonctionnalité que vous souhaitez implémenter (ex: `creation-page-liste-matchs`, `fix-bug-recherche-par-nom`, ...). Faites vos modifications de votre côté et, une fois votre code testé, faites une "Pull Request" pour passer vos changements sur la branche `main`. Le code sera rapidement vérifié par les autres collaborateurs pour être fusionné au reste du projet ou des modifications seront demandées pour améliorer votre code. Un conseil : n'utilisez pas l'IA à outrance. Ajouter une fonctionnalité c'est bien, mais comprendre comment le code que l'on a écrit marche, c'est encore mieux.