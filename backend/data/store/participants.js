// Participants (joueurs) : découpage prénom / nom, création, nettoyage.

/**
 * Découpe « Prénom Nom » ; un seul mot donne un prénom sans nom de famille (jamais de nom inventé).
 */
export function splitFullName(fullName) {
    const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
    return { prenom: parts[0] || '', nom: parts.slice(1).join(' ') || null };
}

/**
 * Retrouve ou crée un participant à partir de son nom complet et retourne son id.
 * Avec nom et prénom, le même étudiant est réutilisé d'une équipe à l'autre ; avec un prénom seul,
 * on ne peut pas savoir qui c'est : un nouveau participant est créé (les orphelins sont supprimés ensuite).
 */
export async function upsertParticipant(client, promoId, fullName) {
    const { prenom, nom } = splitFullName(fullName);
    const { rows } = nom
        ? await client.query(
            `INSERT INTO participants (id_promo, nom, prenom) VALUES ($1, $2, $3)
             ON CONFLICT (nom, prenom) DO UPDATE SET id_promo = EXCLUDED.id_promo
             RETURNING id`,
            [promoId, nom, prenom]
        )
        : await client.query(
            'INSERT INTO participants (id_promo, nom, prenom) VALUES ($1, NULL, $2) RETURNING id',
            [promoId, prenom]
        );
    return rows[0].id;
}

/** Supprime les participants qui ne font plus partie d'aucune équipe. */
export async function deleteOrphanParticipants(client) {
    await client.query(
        'DELETE FROM participants pa WHERE NOT EXISTS (SELECT 1 FROM rejoindre_equipe re WHERE re.id_participant = pa.id)'
    );
}
