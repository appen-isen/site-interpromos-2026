// Outils partagés par les gestionnaires d'événements

// Affiche l'état « en cours », attend la requête, puis réaffiche le résultat
export async function track(promise, render) {
  render();
  await promise;
  render();
}

/**
 * Cherche le gestionnaire d'un champ : nom exact d'abord, puis préfixe (« match-… », « team-… »).
 * prefixes : [[préfixe, gestionnaire]] dans l'ordre de priorité.
 */
export function findFieldHandler(field, exact, prefixes) {
  if (!field) return null;
  if (exact[field]) return exact[field];
  const found = prefixes.find(([prefix]) => field.startsWith(prefix));
  return found ? found[1] : null;
}
