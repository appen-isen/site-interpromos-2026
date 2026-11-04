// Édition du tournoi (/api/edition) : dates, lieu, contact, ouverture des inscriptions, écran TV.
import { query } from '../db.js';
import { DEFAULT_EDITION, DAY_PHASES } from './constants.js';
import { normalizeInstagramHandle } from './instagram.js';
import { dbGetSports } from './references.js';
import { ensureBaseReferences } from './schema.js';

export function addDays(isoDate, days) {
    const d = new Date(`${isoDate}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);

const DAY_LABEL = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

const DAY_MONTH = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' });

// Décalage horaire de Paris à une date donnée (+01:00 en hiver, +02:00 en été)
function parisOffset(isoDate, time) {
    const probe = new Date(`${isoDate}T${time}:00Z`);
    const part = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', timeZoneName: 'longOffset' })
        .formatToParts(probe)
        .find(p => p.type === 'timeZoneName')?.value || 'GMT+01:00';
    return part === 'GMT' ? '+00:00' : part.replace('GMT', '');
}

// Plage lisible : « 3 – 5 novembre », ou « 30 octobre – 1 novembre » si le tournoi change de mois
function formatRange(start, end) {
    const [a, b] = [DAY_MONTH.format(new Date(`${start}T12:00:00Z`)), DAY_MONTH.format(new Date(`${end}T12:00:00Z`))];
    const [dayA, ...monthA] = a.split(' ');
    const [dayB, ...monthB] = b.split(' ');
    return monthA.join(' ') === monthB.join(' ') ? `${dayA} – ${dayB} ${monthB.join(' ')}` : `${a} – ${b}`;
}

/**
 * Statut des inscriptions : fermées par le BDS, ou automatiquement à l'échéance choisie
 * (à défaut, au coup d'envoi du tournoi).
 */
function buildRegistrationStatus(row, startsAt) {
    const manualOpen = row.inscriptionsOuvertes !== false;
    const deadline = row.inscriptionsFin ? new Date(row.inscriptionsFin).toISOString() : null;
    const closesAt = deadline || new Date(startsAt).toISOString();
    const expired = Date.now() >= Date.parse(closesAt);
    return {
        open: manualOpen && !expired,
        manualOpen,
        deadline,                                  // échéance choisie par le BDS (null = coup d'envoi)
        deadlineLocal: row.inscriptionsFinLocale || null, // même échéance en heure de Paris, pour le formulaire
        closesAt,
        reason: !manualOpen ? 'manual' : expired ? (deadline ? 'deadline' : 'start') : null
    };
}

function buildEdition(row) {
    const start = row.debut;
    const dates = DAY_PHASES.map((_, i) => addDays(start, i));
    return {
        year: row.annee,
        shortYear: String(row.annee).slice(-2),
        start,
        end: dates[dates.length - 1],
        time: row.heure,
        venue: row.lieu,
        contact: row.contact || null,
        instagram: row.instagram || null,
        startsAt: `${start}T${row.heure}:00${parisOffset(start, row.heure)}`,
        registrations: buildRegistrationStatus(row, `${start}T${row.heure}:00${parisOffset(start, row.heure)}`),
        tv: { sport: Number.isInteger(row.tvSport) ? row.tvSport : null, message: row.tvMessage || null },
        range: formatRange(start, dates[dates.length - 1]),
        days: dates.map((iso, i) => [
            capitalize(DAY_LABEL.format(new Date(`${iso}T12:00:00Z`))),
            DAY_PHASES[i][0],
            DAY_PHASES[i][1]
        ])
    };
}

export async function dbGetEdition() {
    await ensureBaseReferences();
    const { rows } = await query(
        `SELECT annee, TO_CHAR(date_debut, 'YYYY-MM-DD') AS debut, heure_debut AS heure, lieu, contact_email AS contact, instagram,
                inscriptions_ouvertes AS "inscriptionsOuvertes", inscriptions_fin AS "inscriptionsFin",
                TO_CHAR(inscriptions_fin AT TIME ZONE 'Europe/Paris', 'YYYY-MM-DD"T"HH24:MI') AS "inscriptionsFinLocale",
                tv_sport AS "tvSport", tv_message AS "tvMessage"
         FROM edition LIMIT 1`
    );
    const row = rows[0] || {
        annee: DEFAULT_EDITION.annee,
        debut: DEFAULT_EDITION.dateDebut,
        heure: DEFAULT_EDITION.heureDebut,
        lieu: DEFAULT_EDITION.lieu,
        contact: null,
        instagram: null
    };
    return buildEdition(row);
}

/**
 * Modifie l'édition. Lève INVALID_YEAR / INVALID_DATE / YEAR_MISMATCH / INVALID_TIME / INVALID_VENUE / INVALID_CONTACT / INVALID_INSTAGRAM.
 */
export async function dbUpdateEdition({ year, start, time, venue, contact, instagram }) {
    const annee = Number(year);
    if (!Number.isInteger(annee) || annee < 2000 || annee > 2100) throw new Error('INVALID_YEAR');
    const debut = String(start || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(debut) || Number.isNaN(Date.parse(`${debut}T00:00:00Z`))) throw new Error('INVALID_DATE');
    if (Number(debut.slice(0, 4)) !== annee) throw new Error('YEAR_MISMATCH');
    const heure = String(time || '13:00');
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(heure)) throw new Error('INVALID_TIME');
    const lieu = String(venue ?? DEFAULT_EDITION.lieu).trim().slice(0, 80);
    if (!lieu) throw new Error('INVALID_VENUE');
    const contactEmail = String(contact ?? '').trim().toLowerCase().slice(0, 120) || null;
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) throw new Error('INVALID_CONTACT');
    const compte = normalizeInstagramHandle(instagram);
    if (compte === undefined) throw new Error('INVALID_INSTAGRAM');

    await ensureBaseReferences();
    await query(
        `UPDATE edition SET annee = $1, date_debut = $2, heure_debut = $3, lieu = $4, contact_email = $5, instagram = $6, modifie_le = clock_timestamp()`,
        [annee, debut, heure, lieu, contactEmail, compte]
    );
    return dbGetEdition();
}

/**
 * Ouvre / ferme les inscriptions et règle l'échéance (heure de Paris « AAAA-MM-JJTHH:MM », vide = coup d'envoi).
 * Champs absents = inchangés. Lève INVALID_OPEN / INVALID_DEADLINE.
 */
export async function dbUpdateRegistrationSettings({ open, deadline } = {}) {
    const sets = [];
    const values = [];
    if (open !== undefined) {
        if (typeof open !== 'boolean') throw new Error('INVALID_OPEN');
        values.push(open);
        sets.push(`inscriptions_ouvertes = $${values.length}`);
    }
    if (deadline !== undefined) {
        let fin = null;
        if (deadline !== null && String(deadline).trim() !== '') {
            const match = String(deadline).trim().match(/^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):([0-5]\d)$/);
            if (!match || Number.isNaN(Date.parse(`${match[1]}T00:00:00Z`))) throw new Error('INVALID_DEADLINE');
            const time = `${match[2]}:${match[3]}`;
            fin = `${match[1]}T${time}:00${parisOffset(match[1], time)}`;
        }
        values.push(fin);
        sets.push(`inscriptions_fin = $${values.length}`);
    }
    await ensureBaseReferences();
    if (sets.length > 0) {
        await query(`UPDATE edition SET ${sets.join(', ')}, modifie_le = clock_timestamp()`, values);
    }
    return (await dbGetEdition()).registrations;
}

/**
 * Mode TV : sport affiché (indice, null = tous) et message défilant (vide = aucun). Champs absents = inchangés.
 * Lève INVALID_TV_SPORT / INVALID_TV_MESSAGE.
 */
export async function dbUpdateTvSettings({ sport, message } = {}) {
    const sets = [];
    const values = [];
    if (sport !== undefined) {
        let indice = null;
        if (sport !== null && sport !== '') {
            indice = Number(sport);
            if (!Number.isInteger(indice)) throw new Error('INVALID_TV_SPORT');
            const sports = await dbGetSports();
            if (!sports.some(s => s.indice === indice)) throw new Error('INVALID_TV_SPORT');
        }
        values.push(indice);
        sets.push(`tv_sport = $${values.length}`);
    }
    if (message !== undefined) {
        if (message !== null && typeof message !== 'string') throw new Error('INVALID_TV_MESSAGE');
        const texte = String(message ?? '').trim().replace(/\s+/g, ' ');
        if (texte.length > 200) throw new Error('INVALID_TV_MESSAGE');
        values.push(texte || null);
        sets.push(`tv_message = $${values.length}`);
    }
    await ensureBaseReferences();
    if (sets.length > 0) {
        await query(`UPDATE edition SET ${sets.join(', ')}, modifie_le = clock_timestamp()`, values);
    }
    return (await dbGetEdition()).tv;
}
