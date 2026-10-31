-- =============================================================================
-- Schéma SQL PostgreSQL / Supabase pour le site Interpromos
-- =============================================================================

-- 1. Table des promotions
CREATE TABLE IF NOT EXISTS promos(
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    cree_le TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),   -- ordre de création (les UUID ne sont pas ordonnés)
    code VARCHAR(10) NOT NULL UNIQUE,
    mascotte TEXT NOT NULL,

    PRIMARY KEY (id)
);

-- 2. Table des sports
CREATE TABLE IF NOT EXISTS sports(
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    cree_le TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),   -- ordre de création (les UUID ne sont pas ordonnés)
    indice INT NOT NULL UNIQUE,
    nom TEXT NOT NULL UNIQUE,
    nom_court TEXT NOT NULL,
    lieu TEXT NOT NULL,
    joueurs_min INT NOT NULL DEFAULT 5,
    joueurs_max INT NOT NULL DEFAULT 8,
    poids INT NOT NULL DEFAULT 1,

    PRIMARY KEY (id)
);

-- 3. Table des équipes et inscriptions
CREATE TABLE IF NOT EXISTS equipes(
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    cree_le TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),   -- ordre de création (les UUID ne sont pas ordonnés)
    id_promo UUID NOT NULL,
    id_sport UUID NOT NULL,
    nom TEXT NOT NULL,
    capitaine TEXT NOT NULL,
    email TEXT,
    nb_joueurs INT NOT NULL DEFAULT 5,
    nb_joueurs_max INT NOT NULL DEFAULT 10,
    date_inscription TEXT,
    statut TEXT NOT NULL DEFAULT 'Validée' CHECK(statut IN ('En attente', 'Validée', 'Refusée')),
    est_inscription BOOLEAN NOT NULL DEFAULT FALSE,
    points INT NOT NULL DEFAULT 0,

    PRIMARY KEY (id),
    FOREIGN KEY (id_promo) REFERENCES promos(id) ON DELETE RESTRICT,
    FOREIGN KEY (id_sport) REFERENCES sports(id) ON DELETE RESTRICT
);

-- 4. Table des participants
CREATE TABLE IF NOT EXISTS participants(
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    cree_le TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),   -- ordre de création (les UUID ne sont pas ordonnés)
    id_promo UUID NOT NULL,
    nom TEXT,                   -- facultatif : un joueur peut être saisi avec son seul prénom
    prenom TEXT NOT NULL,

    UNIQUE (nom, prenom),
    PRIMARY KEY (id),
    FOREIGN KEY (id_promo) REFERENCES promos(id) ON DELETE RESTRICT
);

-- 5. Lien participants <-> équipes
CREATE TABLE IF NOT EXISTS rejoindre_equipe(
    id_equipe UUID NOT NULL,
    id_participant UUID NOT NULL,
    ordre INT NOT NULL DEFAULT 0,

    PRIMARY KEY (id_equipe, id_participant),
    FOREIGN KEY (id_equipe) REFERENCES equipes(id) ON DELETE CASCADE,
    FOREIGN KEY (id_participant) REFERENCES participants(id) ON DELETE CASCADE
);

-- 6. Lien participants <-> équipes <-> sport
CREATE TABLE IF NOT EXISTS participer_sport(
    id_sport UUID NOT NULL,
    id_equipe UUID NOT NULL,
    id_participant UUID NOT NULL,
    
    PRIMARY KEY (id_sport, id_equipe, id_participant),
    FOREIGN KEY (id_sport) REFERENCES sports(id) ON DELETE RESTRICT,
    FOREIGN KEY (id_equipe) REFERENCES equipes(id) ON DELETE CASCADE,
    FOREIGN KEY (id_participant) REFERENCES participants(id) ON DELETE CASCADE
);

-- 7. Table des matchs
CREATE TABLE IF NOT EXISTS matchups(
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    cree_le TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),   -- ordre de création (les UUID ne sont pas ordonnés)
    code_match VARCHAR(32) NOT NULL UNIQUE,
    id_sport UUID NOT NULL,
    id_equipe1 UUID NOT NULL,
    id_equipe2 UUID NOT NULL,
    jour INT NOT NULL DEFAULT 0 CHECK(jour IN (0, 1, 2)),
    creneau INT NOT NULL DEFAULT 0,
    heure VARCHAR(10) NOT NULL DEFAULT '13:00',
    poule INT,
    phase TEXT NOT NULL DEFAULT 'Qualification' CHECK(phase IN ('Qualification', 'Petite finale', 'Finale')),
    lieu TEXT NOT NULL,
    score_equipe1 INT NOT NULL DEFAULT 0 CHECK(score_equipe1 >= 0),
    score_equipe2 INT NOT NULL DEFAULT 0 CHECK(score_equipe2 >= 0),
    statut TEXT NOT NULL DEFAULT 'en_attente' CHECK(statut IN ('en_attente', 'en_cours', 'annule', 'joue')),
    gagnant UUID CHECK(gagnant IS NULL OR gagnant IN (id_equipe1, id_equipe2)),
    
    PRIMARY KEY (id),
    FOREIGN KEY (gagnant) REFERENCES equipes(id) ON DELETE RESTRICT,
    FOREIGN KEY (id_sport) REFERENCES sports(id) ON DELETE RESTRICT,
    FOREIGN KEY (id_equipe1) REFERENCES equipes(id) ON DELETE RESTRICT,
    FOREIGN KEY (id_equipe2) REFERENCES equipes(id) ON DELETE RESTRICT
);

-- 8. Table des albums de la galerie
CREATE TABLE IF NOT EXISTS albums(
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    cree_le TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),   -- ordre de création (les UUID ne sont pas ordonnés)
    nom TEXT NOT NULL UNIQUE,
    publie BOOLEAN NOT NULL DEFAULT FALSE,
    date_debut DATE,            -- date de l'événement (classement passé / en cours / à venir)
    date_fin DATE,              -- optionnelle : événement sur plusieurs jours

    PRIMARY KEY (id)
);

-- 9. Table des photos/médias de la galerie
CREATE TABLE IF NOT EXISTS photos(
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    cree_le TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),   -- ordre de création (les UUID ne sont pas ordonnés)
    id_album UUID NOT NULL,
    ordre INT NOT NULL DEFAULT 0,
    legende TEXT NOT NULL,
    url TEXT,
    grand_format BOOLEAN NOT NULL DEFAULT FALSE,
    type_media TEXT NOT NULL DEFAULT 'image' CHECK(type_media IN ('image', 'video')),
    emplacement TEXT,           -- ex : 'hero' = média mis en avant en haut de l'accueil
    chemin_stockage TEXT,       -- 'local:<fichier>' ou 'supabase:<chemin>' 

    PRIMARY KEY (id),
    FOREIGN KEY (id_album) REFERENCES albums(id) ON DELETE CASCADE
);

-- 12. Édition du tournoi 
CREATE TABLE IF NOT EXISTS edition(
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    unique_ligne BOOLEAN NOT NULL DEFAULT TRUE UNIQUE CHECK (unique_ligne),   -- garantit une seule ligne
    annee INT NOT NULL CHECK (annee BETWEEN 2000 AND 2100),
    date_debut DATE NOT NULL,                  -- jour 1 ; les jours 2 et 3 suivent
    heure_debut VARCHAR(5) NOT NULL DEFAULT '13:00',
    lieu TEXT NOT NULL DEFAULT 'ISEN Nantes',
    contact_email TEXT,                        -- adresse de contact affichée sur le site (facultative)
    modifie_le TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),

    PRIMARY KEY (id),
    CHECK (EXTRACT(YEAR FROM date_debut) = annee)
);

-- 13. Informations sur la base elle-même. Clé « environnement » : production, preview, development ou test.
-- Posée automatiquement à « production » par le site de production ; les tests refusent de tourner sur une base production.
CREATE TABLE IF NOT EXISTS meta_base(
    cle TEXT PRIMARY KEY,
    valeur TEXT NOT NULL,
    modifie_le TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CHECK (cle <> 'environnement' OR valeur IN ('production', 'preview', 'development', 'test'))
);


ALTER TABLE equipes ADD COLUMN IF NOT EXISTS nb_joueurs_max INT NOT NULL DEFAULT 10;
ALTER TABLE rejoindre_equipe ADD COLUMN IF NOT EXISTS ordre INT NOT NULL DEFAULT 0;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS type_media TEXT NOT NULL DEFAULT 'image';
ALTER TABLE photos ADD COLUMN IF NOT EXISTS emplacement TEXT;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS chemin_stockage TEXT;
ALTER TABLE albums ADD COLUMN IF NOT EXISTS date_debut DATE;
ALTER TABLE albums ADD COLUMN IF NOT EXISTS date_fin DATE;
ALTER TABLE edition ADD COLUMN IF NOT EXISTS contact_email TEXT;
-- Nom de famille facultatif 
ALTER TABLE participants ALTER COLUMN nom DROP NOT NULL;
UPDATE participants SET nom = NULL WHERE nom ~ '^ISEN-' OR nom IN (SELECT code FROM promos);

UPDATE sports SET nom = 'Lutte', nom_court = 'Lutte'
WHERE indice = 5 AND nom = 'Ultimate' AND NOT EXISTS (SELECT 1 FROM sports WHERE nom = 'Lutte');


CREATE TABLE IF NOT EXISTS limites_requetes(
    cle TEXT NOT NULL,                       -- ex : 'login:<ip>', 'inscription:<ip>'
    horodatage TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_limites_requetes_cle ON limites_requetes(cle, horodatage);

-- 11. Sessions BDS révoquées par une déconnexion (empreinte SHA-256 du jeton, jamais le jeton lui-même)
CREATE TABLE IF NOT EXISTS sessions_revoquees(
    empreinte TEXT PRIMARY KEY,
    expire_le TIMESTAMPTZ NOT NULL
);




DROP VIEW IF EXISTS v_matchs_api;


CREATE OR REPLACE VIEW v_classement_sport WITH (security_invoker = true) AS

WITH cotes AS (
    SELECT m.id_sport, e.id_promo, m.score_equipe1 AS pour, m.score_equipe2 AS contre
    FROM matchups m JOIN equipes e ON e.id = m.id_equipe1
    WHERE m.statut = 'joue'
    UNION ALL
    SELECT m.id_sport, e.id_promo, m.score_equipe2 AS pour, m.score_equipe1 AS contre
    FROM matchups m JOIN equipes e ON e.id = m.id_equipe2
    WHERE m.statut = 'joue'
)
SELECT
    p.id AS id_promo,
    p.code AS promo,
    p.mascotte,
    s.id AS id_sport,
    s.indice AS si,
    s.nom AS sport,
    COUNT(c.id_promo) FILTER (WHERE c.pour > c.contre)::INT AS v,
    COUNT(c.id_promo) FILTER (WHERE c.pour = c.contre)::INT AS n,
    COUNT(c.id_promo) FILTER (WHERE c.pour < c.contre)::INT AS l,
    -- Victoire 3 pts, nul 1 pt, défaite 0 pt, multipliés par le coefficient (poids) du sport
    (COALESCE(SUM(CASE WHEN c.pour > c.contre THEN 3 WHEN c.pour = c.contre THEN 1 ELSE 0 END), 0) * s.poids)::INT AS pts
FROM promos p
CROSS JOIN sports s
LEFT JOIN cotes c ON c.id_promo = p.id AND c.id_sport = s.id
GROUP BY p.id, p.code, p.mascotte, s.id, s.indice, s.nom, s.poids;


CREATE OR REPLACE VIEW v_classement_general WITH (security_invoker = true) AS
SELECT
    id_promo,
    promo AS p,
    mascotte AS mascot,
    SUM(v)::INT AS v,
    SUM(n)::INT AS n,
    SUM(l)::INT AS l,
    SUM(pts)::INT AS pts
FROM v_classement_sport
GROUP BY id_promo, promo, mascotte
ORDER BY SUM(pts) DESC, SUM(v) DESC;


ALTER TABLE promos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports            ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants      ENABLE ROW LEVEL SECURITY;
ALTER TABLE rejoindre_equipe  ENABLE ROW LEVEL SECURITY;
ALTER TABLE participer_sport  ENABLE ROW LEVEL SECURITY;
ALTER TABLE matchups          ENABLE ROW LEVEL SECURITY;
ALTER TABLE albums            ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE limites_requetes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions_revoquees ENABLE ROW LEVEL SECURITY;
ALTER TABLE edition           ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_base         ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL ON promos, sports, equipes, participants, rejoindre_equipe, participer_sport,
            matchups, albums, photos, limites_requetes, sessions_revoquees, edition, meta_base,
            v_classement_sport, v_classement_general FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL ON promos, sports, equipes, participants, rejoindre_equipe, participer_sport,
            matchups, albums, photos, limites_requetes, sessions_revoquees, edition, meta_base,
            v_classement_sport, v_classement_general FROM authenticated;
    END IF;
END $$;
