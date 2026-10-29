-- Pas forcément utile sur le moment, mais ça rajoute plus de flexibilité en cas de migration
CREATE TABLE IF NOT EXISTS promos(
    id INT GENERATED ALWAYS AS IDENTITY,

    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS equipes(
    id INT GENERATED ALWAYS AS IDENTITY,
    id_promo INT NOT NULL,
    nom TEXT NOT NULL,
    points INT NOT NULL DEFAULT 0,

    PRIMARY KEY (id),
    FOREIGN KEY (id_promo) REFERENCES promos(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS participants(
    id INT GENERATED ALWAYS AS IDENTITY,
    id_promo INT NOT NULL,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,

    UNIQUE (nom, prenom),
    PRIMARY KEY (id),
    FOREIGN KEY (id_promo) REFERENCES promos(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS sports(
    id INT GENERATED ALWAYS AS IDENTITY,
    nom TEXT NOT NULL,
    poids INT DEFAULT 1,

    PRIMARY KEY (id)
);

-- Lien participants et équipes
CREATE TABLE IF NOT EXISTS rejoindre_equipe(
    id_equipe INT NOT NULL,
    id_participant INT NOT NULL,

    PRIMARY KEY (id_equipe, id_participant),
    FOREIGN KEY (id_equipe) REFERENCES equipes(id) ON DELETE RESTRICT,
    FOREIGN KEY (id_participant) REFERENCES participants(id) ON DELETE RESTRICT
);

-- Lien participants, équipes et sport
CREATE TABLE IF NOT EXISTS participer_sport(
    id_sport INT NOT NULL,
    id_equipe INT NOT NULL,
    id_participant INT NOT NULL, -- Les membres ne sont pas obligés de participer à tous les sports
    
    PRIMARY KEY (id_sport, id_equipe, id_participant),
    FOREIGN KEY (id_sport) REFERENCES sports(id) ON DELETE RESTRICT,
    FOREIGN KEY (id_equipe) REFERENCES equipes(id) ON DELETE RESTRICT,
    FOREIGN KEY (id_participant) REFERENCES participants(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS matchups(
    id INT GENERATED ALWAYS AS IDENTITY,
    id_sport INT NOT NULL,
    id_equipe1 INT NOT NULL,
    id_equipe2 INT NOT NULL,
    poule INT,
    statut TEXT NOT NULL DEFAULT 'en_attente' CHECK(statut IN ('en_attente', 'annule', 'joue')),
    gagnant INT CHECK(gagnant IN (id_equipe1, id_equipe2)), -- NULL->non joué, sinon id du gagnant.
    
    PRIMARY KEY (id),
    FOREIGN KEY (gagnant) REFERENCES equipes(id) ON DELETE RESTRICT,
    FOREIGN KEY (id_sport) REFERENCES sports(id) ON DELETE RESTRICT,
    FOREIGN KEY (id_equipe1) REFERENCES equipes(id) ON DELETE RESTRICT,
    FOREIGN KEY (id_equipe2) REFERENCES equipes(id) ON DELETE RESTRICT
);