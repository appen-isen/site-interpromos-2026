import { pool } from '../data/db.js';
import { ensureBaseReferences, dbGetTeams, upsertParticipant, deleteOrphanParticipants } from '../data/store.js';

// Correspondance souple des noms de sports vers l'indice (0 à 5)
const SPORT_ALIASES = {
    futsal: 0,
    football: 0,
    foot: 0,
    basketball: 1,
    basket: 1,
    volleyball: 2,
    volley: 2,
    handball: 3,
    hand: 3,
    badminton: 4,
    bad: 4,
    lutte: 5,
    sumo: 5,
    ultimate: 5
};

function resolveSportIndex(rawName) {
    if (!rawName) return undefined;
    const clean = String(rawName)
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    if (SPORT_ALIASES[clean] !== undefined) return SPORT_ALIASES[clean];
    for (const [key, idx] of Object.entries(SPORT_ALIASES)) {
        if (clean.startsWith(key)) return idx;
    }
    return undefined;
}

function parseCSV(content) {
    const rawLines = String(content || '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .filter(l => l.trim().length > 0);

    if (rawLines.length === 0) return {};

    // Détection automatique du séparateur (; ou ,)
    const semiCount = (rawLines[0].match(/;/g) || []).length;
    const commaCount = (rawLines[0].match(/,/g) || []).length;
    const sep = semiCount >= commaCount ? ';' : ',';

    const lines = rawLines.map(line => line.split(sep).map(c => c.replace(/^["']|["']$/g, '').trim()));
    const maxCols = Math.max(...lines.map(l => l.length));

    const teams = {};

    // Mode 1 : Format "Fiche d'équipe" par colonnes (ex: "Volleyball 1 (6)", "Badminton 2", etc.)
    for (let col = 0; col < maxCols; col++) {
        let currentSport = null;
        let teamNumber = 1;
        let players = [];

        for (let row = 0; row < lines.length; row++) {
            const cell = lines[row][col]?.trim();
            if (!cell) continue;

            // Détecter un en-tête de sport avec numéro et/ou taille : ex "Volleyball 1 (6)" ou "Football (7)"
            const sportHeaderMatch = cell.match(/^([A-Za-zÀ-ÿ]+)(?:\s+(\d+))?\s*(?:\(\d+\))?$/);
            if (sportHeaderMatch && resolveSportIndex(sportHeaderMatch[1]) !== undefined) {
                if (currentSport && players.length > 0) {
                    const key = `${currentSport}_${teamNumber}`;
                    if (!teams[key]) teams[key] = { sport: currentSport, number: teamNumber, players: [] };
                    teams[key].players.push(...players);
                }
                currentSport = sportHeaderMatch[1];
                teamNumber = sportHeaderMatch[2] ? parseInt(sportHeaderMatch[2], 10) : 1;
                players = [];
                continue;
            }

            const invalidPatterns = [
                'nombre de joueurs',
                'lutte (avec sumo',
                'pour remplacer',
                'avec sumo',
                'gonflable',
                "fiche d'equipe",
                'fiche d’equipe',
                'nom prenom',
                'joueur'
            ];

            const lowerCell = cell.toLowerCase();
            if (
                invalidPatterns.some(pattern => lowerCell.includes(pattern)) ||
                cell.length < 3 ||
                /^[0-9\s().,;-]+$/.test(cell)
            ) {
                continue;
            }

            if (currentSport && resolveSportIndex(currentSport) !== undefined) {
                players.push(cell);
            }
        }

        if (currentSport && players.length > 0) {
            const key = `${currentSport}_${teamNumber}`;
            if (!teams[key]) teams[key] = { sport: currentSport, number: teamNumber, players: [] };
            teams[key].players.push(...players);
        }
    }

    // Mode 2 : Format tabulaire en lignes si aucune colonne "Fiche d'équipe" n'a été détectée
    // Exemple : Sport;Equipe;Capitaine;Joueurs  OU  Sport;Nom Prenom
    if (Object.keys(teams).length === 0) {
        for (let row = 0; row < lines.length; row++) {
            const cols = lines[row];
            if (cols.length < 2) continue;
            const sIdx = resolveSportIndex(cols[0]);
            if (sIdx === undefined) continue;

            const sportLabel = cols[0];
            if (cols.length >= 4) {
                // Sport ; Nom équipe ; Capitaine ; Joueur1, Joueur2...
                const teamLabel = cols[1] || `${sportLabel} 1`;
                const captain = cols[2] || '';
                const restPlayers = cols
                    .slice(3)
                    .join(',')
                    .split(/[,|/]/)
                    .map(s => s.trim())
                    .filter(Boolean);
                const allPlayers = captain ? [captain, ...restPlayers.filter(p => p !== captain)] : restPlayers;
                const key = `${sportLabel}_${teamLabel}`;
                if (!teams[key]) {
                    teams[key] = { sport: sportLabel, number: 1, customName: teamLabel, players: [] };
                }
                teams[key].players.push(...allPlayers);
            } else {
                // Sport ; Joueur (et éventuellement numéro d'équipe en col 2)
                const player = cols[1];
                const num = parseInt(cols[2], 10) || 1;
                if (player && player.length >= 2) {
                    const key = `${sportLabel}_${num}`;
                    if (!teams[key]) {
                        teams[key] = { sport: sportLabel, number: num, players: [] };
                    }
                    teams[key].players.push(player);
                }
            }
        }
    }

    return teams;
}

export async function api_import_csv(request, response) {
    const { csvContent, promo } = request.body || {};

    if (!csvContent || !String(csvContent).trim()) {
        return response.status(400).json({ error: 'Contenu CSV manquant.' });
    }

    if (!promo) {
        return response.status(400).json({ error: 'Promo manquante.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Garantit l'existence des promos A1-A5 et des 6 sports même sur une base vierge
        await ensureBaseReferences(client);

        const promoCode = String(promo).trim().toUpperCase();
        const promoResult = await client.query('SELECT id FROM promos WHERE code = $1', [promoCode]);
        if (promoResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return response.status(400).json({ error: `Promo ${promoCode} non trouvée.` });
        }
        const promoId = promoResult.rows[0].id;

        const parsedTeams = parseCSV(csvContent);
        const entries = Object.values(parsedTeams);

        if (entries.length === 0) {
            await client.query('ROLLBACK');
            return response.status(400).json({
                error: "Aucune équipe ou joueur n'a pu être détecté dans ce CSV. Vérifiez les en-têtes de sports (ex: Volleyball 1 (6), Futsal 1 (7), Basketball 1 (5)...)."
            });
        }

        const importedTeams = [];
        const nowStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

        for (const team of entries) {
            const sportIndex = resolveSportIndex(team.sport);
            if (sportIndex === undefined) continue;

            const sportResult = await client.query('SELECT id, nom FROM sports WHERE indice = $1', [sportIndex]);
            if (sportResult.rows.length === 0) continue;
            const sportId = sportResult.rows[0].id;
            const officialSportName = sportResult.rows[0].nom;

            const uniquePlayers = [...new Set(team.players.map(p => p.trim()).filter(Boolean))];
            if (uniquePlayers.length === 0) continue;

            const teamName = team.customName || `${promoCode} ${officialSportName}${team.number > 1 ? ` ${team.number}` : ''}`;
            const captain = uniquePlayers[0] || `Capitaine ${promoCode}`;

            // Vérifier si cette équipe existe déjà pour éviter les doublons lors d'un ré-import
            const existingTeam = await client.query(
                `SELECT id FROM equipes WHERE id_promo = $1 AND id_sport = $2 AND LOWER(nom) = LOWER($3) LIMIT 1`,
                [promoId, sportId, teamName]
            );

            let teamId;
            if (existingTeam.rows.length > 0) {
                teamId = existingTeam.rows[0].id;
                await client.query(
                    `UPDATE equipes
                     SET capitaine = $1, nb_joueurs = $2, date_inscription = $3, statut = 'Validée', est_inscription = FALSE
                     WHERE id = $4`,
                    [captain, uniquePlayers.length, nowStr, teamId]
                );
                await client.query('DELETE FROM rejoindre_equipe WHERE id_equipe = $1', [teamId]);
                await client.query('DELETE FROM participer_sport WHERE id_equipe = $1', [teamId]);
            } else {
                const teamResult = await client.query(
                    `INSERT INTO equipes (id_promo, id_sport, nom, capitaine, nb_joueurs, date_inscription, statut, est_inscription, points)
                     VALUES ($1, $2, $3, $4, $5, $6, 'Validée', FALSE, 0)
                     RETURNING id`,
                    [promoId, sportId, teamName, captain, uniquePlayers.length, nowStr]
                );
                teamId = teamResult.rows[0].id;
            }

            for (const playerName of uniquePlayers) {
                const participantId = await upsertParticipant(client, promoId, playerName);

                await client.query(
                    `INSERT INTO rejoindre_equipe (id_equipe, id_participant)
                     VALUES ($1, $2)
                     ON CONFLICT DO NOTHING`,
                    [teamId, participantId]
                );

                await client.query(
                    `INSERT INTO participer_sport (id_sport, id_equipe, id_participant)
                     VALUES ($1, $2, $3)
                     ON CONFLICT DO NOTHING`,
                    [sportId, teamId, participantId]
                );
            }

            importedTeams.push({
                id: teamId,
                promo: promoCode,
                sport: officialSportName,
                name: teamName,
                captain,
                players: uniquePlayers.length,
                playersList: uniquePlayers
            });
        }

        await deleteOrphanParticipants(client);
        await client.query('COMMIT');

        const allTeams = await dbGetTeams();

        return response.json({
            success: true,
            imported: importedTeams.length,
            importedTeams,
            teams: allTeams
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erreur import CSV :', err);
        return response.status(500).json({ error: "Erreur lors de l'import CSV en base de données." });
    } finally {
        client.release();
    }
}
