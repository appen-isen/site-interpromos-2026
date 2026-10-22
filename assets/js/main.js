document.addEventListener("DOMContentLoaded", () => {
    // 1. Définition des deux étapes (cibles et textes associés)
    const stages = [
        {
            targetDate: new Date("November 3, 2026 18:00:00").getTime(),
            label: "Le tournoi commence dans"
        },
        {
            // Exemple : Le second compteur se lance pour la fin du tournoi le 5 novembre 2026 à 18:00:00
            targetDate: new Date("November 5, 2026 18:00:00").getTime(),
            label: "Les finales commencent dans"
        }
    ];

    let currentStageIndex = 0;

    // Récupération des éléments DOM
    const labelEl = document.querySelector(".countdown-label");
    const daysEl = document.getElementById("days");
    const hoursEl = document.getElementById("hours");
    const minutesEl = document.getElementById("minutes");
    const secondsEl = document.getElementById("seconds");

    function updateCountdown() {
        const now = new Date().getTime();
        let currentStage = stages[currentStageIndex];
        let difference = currentStage.targetDate - now;

        // Si le compteur actuel est terminé
        if (difference <= 0) {
            currentStageIndex++; // Passe à l'étape suivante
            
            if (currentStageIndex >= stages.length) {
                // Si toutes les étapes sont terminées
                if (labelEl) labelEl.textContent = "Le tournoi est terminé !";
                if (daysEl) daysEl.textContent = "00";
                if (hoursEl) hoursEl.textContent = "00";
                if (minutesEl) minutesEl.textContent = "00";
                if (secondsEl) secondsEl.textContent = "00";
                clearInterval(timerInterval);
                return;
            }
            
            // Met à jour immédiatement pour la nouvelle étape
            currentStage = stages[currentStageIndex];
            difference = currentStage.targetDate - now;
        }

        // Met à jour le texte de présentation
        if (labelEl) {
            labelEl.textContent = currentStage.label;
        }

        // Calcul du temps restant
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        // Affichage avec formatage sur 2 chiffres
        if (daysEl) daysEl.textContent = String(days).padStart(2, "0");
        if (hoursEl) hoursEl.textContent = String(hours).padStart(2, "0");
        if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, "0");
        if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, "0");
    }

    // Lancement immédiat puis mise à jour chaque seconde
    updateCountdown();
    const timerInterval = setInterval(updateCountdown, 1000);
});

// SCRIPT POUR LA PAGE CLASSEMENT

// --- DONNÉES DU CLASSEMENT ---
const teamsData = [
    { rank: "1er", badge: "A2", score: "80 pts.", cols: [["Adam M.", "Jacques B.", "Lucas P.", "Nina S.", "Paul R."]] },
    { rank: "2e", badge: "A2", score: "77 pts.", cols: [["Antoine D.", "Camille L.", "Arthur M.", "Élise R.", "Noah T."]] },
    { rank: "3e", badge: "A3", score: "121 pts.", cols: [["Adam M.", "Jacques B.", "Lucas P.", "Nina S.", "Paul R."]] },
    { rank: "4e", badge: "A1", score: "85 pts.", cols: [["Adam M.", "Jacques B.", "Lucas P.", "Nina S.", "Paul R."]] },
    { rank: "5e", badge: "A4", score: "74 pts.", cols: [["Adam M.", "Jacques B.", "Lucas P.", "Nina S.", "Paul R."]] }
];

const promosData = [
    { rank: "1er", badge: "A2", score: "157 pts.", cols: [["Adam M.", "Jacques B.", "Lucas P.", "Nina S.", "Paul R."], ["Antoine D.", "Camille L.", "Arthur M.", "Élise R.", "Noah T."]] },
    { rank: "2e", badge: "A5", score: "132 pts.", cols: [["Adam M.", "Jacques B.", "Lucas P.", "Nina S.", "Paul R."], ["Antoine D.", "Camille L.", "Arthur M.", "Élise R.", "Noah T."]] },
    { rank: "3e", badge: "A3", score: "121 pts.", cols: [["Adam M.", "Jacques B.", "Lucas P.", "Nina S.", "Paul R."], ["Antoine D.", "Camille L.", "Arthur M.", "Élise R.", "Noah T."]] },
    { rank: "4e", badge: "A1", score: "85 pts.", cols: [["Adam M.", "Jacques B.", "Lucas P.", "Nina S.", "Paul R."], ["Antoine D.", "Camille L.", "Arthur M.", "Élise R.", "Noah T."]] },
    { rank: "5e", badge: "A4", score: "74 pts.", cols: [["Adam M.", "Jacques B.", "Lucas P.", "Nina S.", "Paul R."], ["Antoine D.", "Camille L.", "Arthur M.", "Élise R.", "Noah T."]] }
];

const btnTeams = document.getElementById('btn-teams');
const btnPromos = document.getElementById('btn-promos');
const rankingContainer = document.getElementById('ranking-container');

// Fonction d'affichage du classement
function renderRanking(data) {
    rankingContainer.innerHTML = data.map(item => `
        <div class="ranking-card">
            <span class="rank-position">${item.rank}</span>
            <div class="rank-badge-box">
                <span class="badge-name">${item.badge}</span>
                <span class="badge-score">${item.score}</span>
            </div>
            <div class="rank-names">
                ${item.cols.map(col => `
                    <ul>
                        ${col.map(name => `<li>${name}</li>`).join('')}
                    </ul>
                `).join('')}
            </div>
        </div>
    `).join('');
}

// Événements au clic sur les onglets
btnTeams.addEventListener('click', () => {
    btnTeams.classList.add('active');
    btnPromos.classList.remove('active');
    renderRanking(teamsData);
});

btnPromos.addEventListener('click', () => {
    btnPromos.classList.add('active');
    btnTeams.classList.remove('active');
    renderRanking(promosData);
});

// Affichage initial
renderRanking(teamsData);