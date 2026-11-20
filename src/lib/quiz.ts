// Classement du quiz (§7, US2.1).
// Les coefficients sont dans data/config/quiz.json : les modifier reclasse les courses.
import { CATEGORIES, type Category, computeNotes } from "./bareme.ts";
import { upcomingEvents } from "./dates.ts";
import type { BaremeConfig, QuizConfig, Race, RaceEvent } from "./schemas.ts";

/** Réponses de Q1 à Q4 : la valeur est le niveau du profil, sur la même échelle que les notes. */
export const PROFILE_LEVELS = {
	course: { pasEncore: 2, faisable: 3, facile: 4, plusLoin: 5 },
	force: { jamais: 1, unPeu: 2, regulierement: 3, barreLourde: 5 },
	cardio: { jamais: 1, parfois: 2, souvent: 4, endurance: 5 },
	gym: { aucun: 1, burpees: 2, boxJumps: 3, tractions: 4, muscleUp: 5 },
} as const;

export type QuizFormat = "solo" | "duo" | "equipe" | "peuImporte";
export type QuizObjectif = keyof QuizConfig["poidsEcartNegatif"];
export type QuizZone = "france" | "frontaliers" | "peuImporte";

/** Profil construit par les 7 questions. */
export interface QuizProfile {
	course: number;
	force: number;
	cardio: number;
	gym: number;
	format: QuizFormat;
	objectif: QuizObjectif;
	zone: QuizZone;
}

/** Course prête à classer : les notes viennent du barème, jamais d'une saisie. */
export interface QuizCandidate {
	slug: string;
	nom: string;
	formats: Race["formats"];
	notes: Record<Category, number | null>;
}

/** Une course classée. Le score est un pourcentage entre le min et le max de la config. */
export interface ScoredRace {
	slug: string;
	nom: string;
	score: number;
	prochaineDate: string | null;
}

/**
 * Pays de Q7. Les frontaliers sont ceux du §2 ;
 * le Royaume-Uni est un pays proche, pas un pays frontalier.
 */
const ZONE_COUNTRIES: Record<
	Exclude<QuizZone, "peuImporte">,
	ReadonlySet<RaceEvent["pays"]>
> = {
	france: new Set(["FR"]),
	frontaliers: new Set(["FR", "BE", "CH", "LU", "DE", "IT", "ES"]),
};

/** Notes calculées d'une course, pour le classement. */
export function toQuizCandidate(
	race: Race,
	config: BaremeConfig,
): QuizCandidate {
	const { categories } = computeNotes(
		race.bareme,
		race.dureeMoyenneMin,
		config,
	);
	return {
		slug: race.slug,
		nom: race.nom,
		formats: race.formats,
		notes: {
			course: categories.course.note,
			force: categories.force.note,
			cardio: categories.cardio.note,
			gym: categories.gym.note,
		},
	};
}

/** « En équipe » regroupe équipes et relais, comme le filtre du catalogue. */
function offersFormat(formats: Race["formats"], format: QuizFormat): boolean {
	if (format === "peuImporte") return true;
	if (format === "equipe")
		return formats.includes("equipe") || formats.includes("relais");
	return formats.includes(format);
}

/** Une note manquante exclut la course : le classement ne devine pas. */
function isEligible(race: QuizCandidate, format: QuizFormat): boolean {
	const missing = CATEGORIES.some((category) => race.notes[category] === null);
	return !missing && offersFormat(race.formats, format);
}

function gapPenalty(gap: number, weight: number, config: QuizConfig): number {
	if (gap > 0)
		return (
			config.ecartPositif.multiplicateur * gap ** config.ecartPositif.exposant
		);
	if (gap < 0) return Math.abs(gap) * weight;
	return 0;
}

function hasDateInZone(
	events: RaceEvent[],
	slug: string,
	profile: QuizProfile,
	config: QuizConfig,
	today: string,
): boolean {
	const upcoming = upcomingEvents(events, slug, today, config.fenetreDateMois);
	if (profile.zone === "peuImporte") return upcoming.length > 0;
	const countries = ZONE_COUNTRIES[profile.zone];
	return upcoming.some((event) => countries.has(event.pays));
}

function scoreOf(penalty: number, config: QuizConfig): number {
	const raw = config.score.base - config.score.multiplicateurPenalite * penalty;
	return Math.min(config.score.max, Math.max(config.score.min, raw));
}

/**
 * Classe les courses de la plus compatible à la moins compatible.
 * À score égal, la prochaine date la plus proche passe devant (fenêtre du catalogue, 18 mois).
 * Sans date, la course passe après. À date égale, le nom en français départage.
 */
export function rankRaces(
	profile: QuizProfile,
	races: QuizCandidate[],
	events: RaceEvent[],
	config: QuizConfig,
	today: string,
): ScoredRace[] {
	const weight = config.poidsEcartNegatif[profile.objectif];
	return races
		.filter((race) => isEligible(race, profile.format))
		.map((race) => {
			const categoryPenalty = CATEGORIES.reduce((sum, category) => {
				const note = race.notes[category] ?? 0;
				return sum + gapPenalty(note - profile[category], weight, config);
			}, 0);
			const datePenalty = hasDateInZone(
				events,
				race.slug,
				profile,
				config,
				today,
			)
				? 0
				: config.penaliteSansDate;
			return {
				slug: race.slug,
				nom: race.nom,
				score: scoreOf(categoryPenalty + datePenalty, config),
				prochaineDate:
					upcomingEvents(events, race.slug, today)[0]?.date ?? null,
			};
		})
		.sort((a, b) => {
			if (a.score !== b.score) return b.score - a.score;
			const dateA = a.prochaineDate ?? "9999-12-31";
			const dateB = b.prochaineDate ?? "9999-12-31";
			return dateA.localeCompare(dateB) || a.nom.localeCompare(b.nom, "fr");
		});
}

// --- Questions (§7, US2.2) ---
// Les textes affichés sont ceux du §7, mot pour mot. Les valeurs relient chaque réponse au profil.

const courseOptions = [
	{ value: "pasEncore", label: "Pas encore possible" },
	{ value: "faisable", label: "Faisable mais dur" },
	{ value: "facile", label: "Facile" },
	{ value: "plusLoin", label: "Je cours plus loin régulièrement" },
] as const satisfies readonly {
	value: keyof typeof PROFILE_LEVELS.course;
	label: string;
}[];

const forceOptions = [
	{ value: "jamais", label: "Jamais touché" },
	{ value: "unPeu", label: "Un peu en salle" },
	{ value: "regulierement", label: "Régulièrement" },
	{ value: "barreLourde", label: "Je fais de la barre lourde" },
] as const satisfies readonly {
	value: keyof typeof PROFILE_LEVELS.force;
	label: string;
}[];

const cardioOptions = [
	{ value: "jamais", label: "Jamais" },
	{ value: "parfois", label: "De temps en temps" },
	{ value: "souvent", label: "Souvent, 20 min et plus" },
	{ value: "endurance", label: "Gros moteur d'endurance" },
] as const satisfies readonly {
	value: keyof typeof PROFILE_LEVELS.cardio;
	label: string;
}[];

const gymOptions = [
	{ value: "aucun", label: "Aucun de ceux-là" },
	{ value: "burpees", label: "Burpees" },
	{ value: "boxJumps", label: "Box jumps" },
	{ value: "tractions", label: "Tractions ou toes-to-bar" },
	{ value: "muscleUp", label: "Muscle-up" },
] as const satisfies readonly {
	value: keyof typeof PROFILE_LEVELS.gym;
	label: string;
}[];

const formatOptions = [
	{ value: "solo", label: "Seul·e" },
	{ value: "duo", label: "À deux" },
	{ value: "equipe", label: "En équipe" },
	{ value: "peuImporte", label: "Peu importe" },
] as const satisfies readonly { value: QuizFormat; label: string }[];

const objectifOptions = [
	{ value: "kiffer", label: "Finir et kiffer" },
	{ value: "chrono", label: "Me tester sur un chrono" },
	{ value: "mesurer", label: "Me mesurer aux autres" },
] as const satisfies readonly { value: QuizObjectif; label: string }[];

const zoneOptions = [
	{ value: "france", label: "France uniquement" },
	{ value: "frontaliers", label: "France et pays frontaliers" },
	{ value: "peuImporte", label: "Peu importe" },
] as const satisfies readonly { value: QuizZone; label: string }[];

/** Les 7 questions, dans l'ordre du §7. */
export const QUIZ_QUESTIONS = [
	{
		id: "course",
		prompt: "Courir 5 km sans t'arrêter, c'est…",
		options: courseOptions,
	},
	{
		id: "force",
		prompt: "Les charges (kettlebell, haltères, sled)…",
		options: forceOptions,
	},
	{ id: "cardio", prompt: "Rameur, SkiErg, vélo…", options: cardioOptions },
	{
		id: "gym",
		prompt: "Le mouvement le plus technique que tu maîtrises",
		options: gymOptions,
	},
	{ id: "format", prompt: "Tu te vois courir…", options: formatOptions },
	{ id: "objectif", prompt: "Ton objectif", options: objectifOptions },
	{
		id: "zone",
		prompt: "Jusqu'où es-tu prêt·e à aller ?",
		options: zoneOptions,
	},
] as const;

export type QuizQuestionId = (typeof QUIZ_QUESTIONS)[number]["id"];

/** Réponses présentes dans l'adresse. Une case vide n'a pas encore été choisie. */
export type QuizAnswerMap = Record<QuizQuestionId, string | null>;

export function emptyQuizAnswers(): QuizAnswerMap {
	return {
		course: null,
		force: null,
		cardio: null,
		gym: null,
		format: null,
		objectif: null,
		zone: null,
	};
}

function isKnownAnswer(
	id: QuizQuestionId,
	value: string | null,
): value is string {
	if (value === null) return false;
	const question = QUIZ_QUESTIONS.find((item) => item.id === id);
	return question?.options.some((option) => option.value === value) ?? false;
}

/**
 * Lit les réponses dans l'adresse. Une valeur inconnue est ignorée.
 * `etape` vaut null s'il est absent ou invalide.
 */
export function parseQuizSearch(params: URLSearchParams): {
	answers: QuizAnswerMap;
	etape: number | null;
} {
	const answers = emptyQuizAnswers();
	for (const question of QUIZ_QUESTIONS) {
		const value = params.get(question.id);
		answers[question.id] = isKnownAnswer(question.id, value) ? value : null;
	}
	const raw = params.get("etape");
	const number = raw === null ? Number.NaN : Number(raw);
	const etape =
		Number.isInteger(number) && number >= 1 && number <= QUIZ_QUESTIONS.length
			? number
			: null;
	return { answers, etape };
}

/** Écrit les réponses dans l'adresse. L'étape 1 est omise pour garder un lien court. */
export function serializeQuizSearch(
	answers: QuizAnswerMap,
	etape: number,
): URLSearchParams {
	const params = new URLSearchParams();
	for (const question of QUIZ_QUESTIONS) {
		const value = answers[question.id];
		if (isKnownAnswer(question.id, value)) params.set(question.id, value);
	}
	if (etape !== 1) params.set("etape", String(etape));
	return params;
}

function isLevel<T extends object>(
	record: T,
	value: string | null,
): value is Extract<keyof T, string> {
	return value !== null && value in record;
}

function isQuizFormat(value: string | null): value is QuizFormat {
	return formatOptions.some((option) => option.value === value);
}

function isQuizObjectif(value: string | null): value is QuizObjectif {
	return objectifOptions.some((option) => option.value === value);
}

function isQuizZone(value: string | null): value is QuizZone {
	return zoneOptions.some((option) => option.value === value);
}

/**
 * Construit le profil passé à rankRaces.
 * Renvoie null tant qu'une réponse manque : le classement ne devine pas.
 */
export function profileFromAnswers(answers: QuizAnswerMap): QuizProfile | null {
	const { course, force, cardio, gym, format, objectif, zone } = answers;
	if (
		!isLevel(PROFILE_LEVELS.course, course) ||
		!isLevel(PROFILE_LEVELS.force, force) ||
		!isLevel(PROFILE_LEVELS.cardio, cardio) ||
		!isLevel(PROFILE_LEVELS.gym, gym) ||
		!isQuizFormat(format) ||
		!isQuizObjectif(objectif) ||
		!isQuizZone(zone)
	) {
		return null;
	}
	return {
		course: PROFILE_LEVELS.course[course],
		force: PROFILE_LEVELS.force[force],
		cardio: PROFILE_LEVELS.cardio[cardio],
		gym: PROFILE_LEVELS.gym[gym],
		format,
		objectif,
		zone,
	};
}
