// Filtres et tri du catalogue (§4, US1.1 et US1.4), reflétés dans l'URL pour être partageables.
import { type Category, type CategoryNote, computeNotes } from "./bareme.ts";
import { isPast, startsWithinMonths, upcomingEvents } from "./dates.ts";
import type { BaremeConfig, Race, RaceEvent } from "./schemas.ts";

/** Une date affichée dans le catalogue. */
export type CatalogueEvent = Pick<
	RaceEvent,
	"date" | "dateFin" | "ville" | "pays"
>;

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
	/** Dates à venir au moment du build ; le navigateur retire celles qui sont passées depuis. */
	events: CatalogueEvent[];
}

export type FormatFilter = "solo" | "duo" | "equipe";
export type TypeFilter = "hybride" | "obstacles";
export type CountryFilter = RaceEvent["pays"];
export type SortOrder = "date" | "difficulte";

export interface CatalogueFilters {
	format: FormatFilter | null;
	noteMax: number | null;
	sansCourse: boolean;
	type: TypeFilter | null;
	pays: CountryFilter | null;
	dans3Mois: boolean;
	tri: SortOrder;
}

export const DEFAULT_FILTERS: CatalogueFilters = {
	format: null,
	noteMax: null,
	sansCourse: false,
	type: null,
	pays: null,
	dans3Mois: false,
	tri: "date",
};

const FORMAT_VALUES: FormatFilter[] = ["solo", "duo", "equipe"];
const TYPE_VALUES: TypeFilter[] = ["hybride", "obstacles"];
export const COUNTRY_VALUES: CountryFilter[] = [
	"FR",
	"BE",
	"CH",
	"LU",
	"DE",
	"IT",
	"ES",
	"GB",
];

const oneOf = <T extends string>(
	values: T[],
	value: string | null,
): T | null => (values.includes(value as T) ? (value as T) : null);

/** Lit les filtres d'une URL ; une valeur inconnue est ignorée. */
export function parseFilters(params: URLSearchParams): CatalogueFilters {
	const noteMax = Number(params.get("noteMax"));
	return {
		format: oneOf(FORMAT_VALUES, params.get("format")),
		noteMax:
			Number.isInteger(noteMax) && noteMax >= 1 && noteMax <= 5
				? noteMax
				: null,
		sansCourse: params.get("sansCourse") === "1",
		type: oneOf(TYPE_VALUES, params.get("type")),
		pays: oneOf(COUNTRY_VALUES, params.get("pays")),
		dans3Mois: params.get("dans3Mois") === "1",
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
	if (filters.pays) params.set("pays", filters.pays);
	if (filters.dans3Mois) params.set("dans3Mois", "1");
	if (filters.tri !== DEFAULT_FILTERS.tri) params.set("tri", filters.tri);
	return params;
}

function matchesFormat(race: CatalogueRace, format: FormatFilter): boolean {
	// « Équipe » regroupe les équipes et les relais.
	if (format === "equipe")
		return race.formats.includes("equipe") || race.formats.includes("relais");
	return race.formats.includes(format);
}

/** Dates encore à venir à la date du jour (une date passée n'est jamais affichée). */
export function futureEvents(
	race: CatalogueRace,
	today: string,
): CatalogueEvent[] {
	return race.events.filter((event) => !isPast(event, today));
}

/** Prochaine date à venir, ou null (« Pas de date annoncée »). */
export function nextEvent(
	race: CatalogueRace,
	today: string,
): CatalogueEvent | null {
	return futureEvents(race, today)[0] ?? null;
}

/** Applique les filtres puis le tri. */
export function applyFilters(
	races: CatalogueRace[],
	filters: CatalogueFilters,
	today: string,
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
		const upcoming = futureEvents(race, today);
		if (filters.pays && !upcoming.some((event) => event.pays === filters.pays))
			return false;
		if (
			filters.dans3Mois &&
			!upcoming.some((event) => startsWithinMonths(event, today, 3))
		)
			return false;
		return true;
	});
	return sortRaces(filtered, filters.tri, today);
}

/**
 * Tri par prochaine date (par défaut) ou par difficulté croissante.
 * Les courses sans date à venir, ou sans note, passent en fin de liste.
 */
export function sortRaces(
	races: CatalogueRace[],
	tri: SortOrder,
	today: string,
): CatalogueRace[] {
	const byName = (a: CatalogueRace, b: CatalogueRace) =>
		a.nom.localeCompare(b.nom, "fr");
	if (tri === "date") {
		const dateOf = (race: CatalogueRace) =>
			nextEvent(race, today)?.date ?? "9999-12-31";
		return [...races].sort(
			(a, b) => dateOf(a).localeCompare(dateOf(b)) || byName(a, b),
		);
	}
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

/** Prépare une course pour la page catalogue : notes calculées et dates à venir au moment du build. */
export function toCatalogueRace(
	race: Race,
	config: BaremeConfig,
	events: RaceEvent[],
	today: string,
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
		events: upcomingEvents(events, race.slug, today).map(
			({ date, dateFin, ville, pays }) =>
				dateFin ? { date, dateFin, ville, pays } : { date, ville, pays },
		),
	};
}

/** Les courses les plus accessibles (note globale croissante), pour l'accueil ; les notes à venir sont écartées. */
export function mostAccessible(
	races: CatalogueRace[],
	count: number,
	today: string,
): CatalogueRace[] {
	return sortRaces(
		races.filter((race) => race.noteGlobale !== null),
		"difficulte",
		today,
	).slice(0, count);
}
