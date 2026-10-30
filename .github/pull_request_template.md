## Ce que change cette PR

<!-- Une ou deux phrases : le problème réglé ou la fonctionnalité ajoutée. -->

## Comment tester

<!-- Les étapes pour vérifier le changement en local. -->

## Avant de demander une relecture

- [ ] `npm run check` passe en local
- [ ] Si une route d'API a été ajoutée ou modifiée : `docs/openapi.yaml` est à jour
- [ ] Si le schéma de la base a changé : `backend/sql/init.sql` reste rejouable sans erreur (`npm run db:migrate` deux fois)
- [ ] Aucun secret ni fichier `.env` dans les commits
