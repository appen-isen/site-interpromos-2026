// Classements par équipe (vue SQL v_classement_equipe) : général (toutes les équipes) et par sport.
// Chaque équipe garde sa promo et son sport ; les points tiennent compte du coefficient du sport.
import { query } from '../db.js';
import { dbGetSports } from './references.js';

// Position, bilan « V · N · D » et largeur de barre (% du leader)
function decorate(rows) {
    const max = Math.max(1, rows[0]?.pts || 0);
    return rows.map((r, i) => ({
        ...r,
        pos: i + 1,
        rec: `${r.v} · ${r.n} · ${r.l}`,
        w: `${Math.round((r.pts / max) * 100)}%`
    }));
}

export async function dbGetStandings() {
    const [{ rows }, sports] = await Promise.all([
        // Départage : points, puis victoires, puis moins de défaites, puis nom (ordre stable)
        query(`SELECT id_equipe AS id, equipe AS team, promo AS p, mascotte AS mascot, si, sport, v, n, l, pts
               FROM v_classement_equipe
               ORDER BY pts DESC, v DESC, l ASC, equipe ASC`),
        dbGetSports()
    ]);

    return {
        general: decorate(rows),
        bySport: sports.map(sp => ({
            sport: sp.name,
            si: sp.indice,
            coef: Number(sp.poids) || 1,
            standings: decorate(rows.filter(r => r.si === sp.indice))
        }))
    };
}
