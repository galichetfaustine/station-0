// Filtres et tri du catalogue (§4, US1.1), reflétés dans l'URL pour être partageables.
import { type Category, type CategoryNote, computeNotes } from "./bareme.ts";
import type { BaremeConfig, Race } from "./schemas.ts";

/** Ce que la page catalogue affiche d'une course. */
export interface CatalogueRace {
	slug: string;
	nom: string;
	organisateur: string;
	typeCourse: Race["typeCourse"];
	formats: Race["formats"];
	duree: string;
	notes: Record<Category, CategoryNote>;
	noteGlobale: number | null;
}

export type FormatFilter = "solo" | "duo" | "equipe";
export type TypeFilter = "hybride" | "obstacles";
export type SortOrder = "date" | "difficulte";

export interface CatalogueFilters {
	format: FormatFilter | null;
	noteMax: number | null;
	sansCourse: boolean;
	type: TypeFilter | null;
	tri: SortOrder;
}

export const DEFAULT_FILTERS: CatalogueFilters = {
	format: null,
	noteMax: null,
	sansCourse: false,
	type: null,
	tri: "date",
};

const FORMAT_VALUES: FormatFilter[] = ["solo", "duo", "equipe"];
const TYPE_VALUES: TypeFilter[] = ["hybride", "obstacles"];

/** Lit les filtres d'une URL ; une valeur inconnue est ignorée. */
export function parseFilters(params: URLSearchParams): CatalogueFilters {
	const format = params.get("format");
	const type = params.get("type");
	const noteMax = Number(params.get("noteMax"));
	return {
		format: FORMAT_VALUES.includes(format as FormatFilter)
			? (format as FormatFilter)
			: null,
		noteMax:
			Number.isInteger(noteMax) && noteMax >= 1 && noteMax <= 5
				? noteMax
				: null,
		sansCourse: params.get("sansCourse") === "1",
		type: TYPE_VALUES.includes(type as TypeFilter)
			? (type as TypeFilter)
			: null,
		tri: params.get("tri") === "difficulte" ? "difficulte" : "date",
	};
}

/** Écrit les filtres dans une URL ; les valeurs par défaut sont omises pour garder une URL courte. */
export function serializeFilters(filters: CatalogueFilters): URLSearchParams {
	const params = new URLSearchParams();
	if (filters.format) params.set("format", filters.format);
	if (filters.noteMax !== null) params.set("noteMax", String(filters.noteMax));
	if (filters.sansCourse) params.set("sansCourse", "1");
	if (filters.type) params.set("type", filters.type);
	if (filters.tri !== DEFAULT_FILTERS.tri) params.set("tri", filters.tri);
	return params;
}

function matchesFormat(race: CatalogueRace, format: FormatFilter): boolean {
	// « Équipe » regroupe les équipes et les relais.
	if (format === "equipe")
		return race.formats.includes("equipe") || race.formats.includes("relais");
	return race.formats.includes(format);
}

/** Applique les filtres puis le tri. */
export function applyFilters(
	races: CatalogueRace[],
	filters: CatalogueFilters,
): CatalogueRace[] {
	const filtered = races.filter((race) => {
		if (filters.format && !matchesFormat(race, filters.format)) return false;
		// Une course dont la note est à confirmer n'est pas retenue quand on fixe une note maximale.
		if (
			filters.noteMax !== null &&
			(race.noteGlobale === null || race.noteGlobale > filters.noteMax)
		)
			return false;
		if (filters.sansCourse && race.notes.course.note !== 1) return false;
		if (filters.type && race.typeCourse !== filters.type) return false;
		return true;
	});
	return sortRaces(filtered, filters.tri);
}

/**
 * Tri par difficulté croissante (notes à confirmer en dernier), sinon par nom.
 * Le tri par prochaine date arrive avec l'affichage des dates (US1.4) : en attendant, il range par nom.
 */
export function sortRaces(
	races: CatalogueRace[],
	tri: SortOrder,
): CatalogueRace[] {
	const byName = (a: CatalogueRace, b: CatalogueRace) =>
		a.nom.localeCompare(b.nom, "fr");
	if (tri === "date") return [...races].sort(byName);
	return [...races].sort((a, b) => {
		const noteA = a.noteGlobale ?? Number.POSITIVE_INFINITY;
		const noteB = b.noteGlobale ?? Number.POSITIVE_INFINITY;
		return noteA - noteB || byName(a, b);
	});
}

/** Durée lisible : « 50 min », « 1 h 30 », ou le texte fourni ; « environ » si c'est une estimation. */
export function formatDuration(
	race: Pick<Race, "dureeMoyenneMin" | "dureeTexte" | "dureeEstimee">,
): string {
	if (race.dureeTexte) return race.dureeTexte;
	const hours = Math.floor(race.dureeMoyenneMin / 60);
	const minutes = race.dureeMoyenneMin % 60;
	const text =
		hours === 0
			? `${minutes} min`
			: minutes === 0
				? `${hours} h`
				: `${hours} h ${String(minutes).padStart(2, "0")}`;
	return race.dureeEstimee ? `environ ${text}` : text;
}

/** Prépare une course pour la page catalogue (notes calculées au build). */
export function toCatalogueRace(
	race: Race,
	config: BaremeConfig,
): CatalogueRace {
	const { categories, globale } = computeNotes(
		race.bareme,
		race.dureeMoyenneMin,
		config,
	);
	return {
		slug: race.slug,
		nom: race.nom,
		organisateur: race.organisateur,
		typeCourse: race.typeCourse,
		formats: race.formats,
		duree: formatDuration(race),
		notes: categories,
		noteGlobale: globale.note,
	};
}

/** Les courses les plus accessibles (note globale croissante), pour l'accueil ; les notes à venir sont écartées. */
export function mostAccessible(
	races: CatalogueRace[],
	count: number,
): CatalogueRace[] {
	return sortRaces(
		races.filter((race) => race.noteGlobale !== null),
		"difficulte",
	).slice(0, count);
}
