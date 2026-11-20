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
