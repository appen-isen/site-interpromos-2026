import { query } from '../data/db.js';

/**
 * Limiteur de requêtes par adresse IP sur une fenêtre glissante.
 */
export function createRateLimit({ name, windowMs, max, message }) {
    const memory = new Map();

    function memoryHit(key) {
        const now = Date.now();
        const hits = (memory.get(key) || []).filter(t => now - t < windowMs);
        hits.push(now);
        memory.set(key, hits);
        if (memory.size > 5000) memory.clear();
        return hits.length;
    }

    return async function rateLimit(request, response, next) {
        const key = `${name}:${request.ip || 'unknown'}`;
        let count;
        try {
            const { rows } = await query(
                `WITH ajout AS (INSERT INTO limites_requetes (cle) VALUES ($1))
                 SELECT COUNT(*)::INT AS c FROM limites_requetes
                 WHERE cle = $1 AND horodatage > NOW() - ($2::INT * INTERVAL '1 millisecond')`,
                [key, windowMs]
            );
            
            count = rows[0].c + 1;
           
            if (Math.random() < 0.02) {
                query(`DELETE FROM limites_requetes WHERE horodatage < NOW() - INTERVAL '1 day'`).catch(() => {});
            }
        } catch (err) {
            count = memoryHit(key);
        }

        if (count > max) {
            return response.status(429).json({ error: message });
        }
        next();
    };
}
