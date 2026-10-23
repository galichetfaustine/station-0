// Dates des courses (§6) : fusion des dates collectées et des saisies manuelles (US1.6).
import type { RaceEvent } from "./schemas.ts";

export interface EventFile {
	source: string;
	verifieLe: string;
	courses: string[];
	evenements: RaceEvent[];
}

/** Un événement prêt à afficher, avec son origine et sa date de vérification. */
export interface DatedEvent extends RaceEvent {
	origine: "collecte" | "manuel";
	verifieLe: string;
}

/** Ville comparable : sans accents, sans casse, sans précision entre parenthèses (« Paris (Grand Palais) » → « paris »). */
export function cityKey(ville: string): string {
	return ville
		.replace(/\(.*?\)/g, "")
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.trim()
		.toLowerCase();
}

const key = (event: RaceEvent) => `${event.course}|${cityKey(event.ville)}`;

/**
 * Une saisie manuelle est toujours prioritaire : elle remplace les dates collectées
 * de la même course dans la même ville, et une ville nouvelle s'ajoute.
 */
export function mergeEvents(
	collected: EventFile[],
	manual: EventFile[],
): DatedEvent[] {
	const withOrigin = (files: EventFile[], origine: DatedEvent["origine"]) =>
		files.flatMap((file) =>
			file.evenements.map((event) => ({
				...event,
				origine,
				verifieLe: file.verifieLe,
			})),
		);

	const manualEvents = withOrigin(manual, "manuel");
	const overridden = new Set(manualEvents.map(key));
	const kept = withOrigin(collected, "collecte").filter(
		(event) => !overridden.has(key(event)),
	);
	return [...kept, ...manualEvents].sort(
		(a, b) =>
			a.date.localeCompare(b.date) || a.ville.localeCompare(b.ville, "fr"),
	);
}

/** Date de vérification la plus récente des sources qui couvrent cette course ; null si aucune. */
export function lastChecked(files: EventFile[], course: string): string | null {
	const dates = files
		.filter((file) => file.courses.includes(course))
		.map((file) => file.verifieLe)
		.sort();
	return dates.at(-1) ?? null;
}

export const COUNTRY_LABELS: Record<RaceEvent["pays"], string> = {
	FR: "France",
	BE: "Belgique",
	CH: "Suisse",
	LU: "Luxembourg",
	DE: "Allemagne",
	IT: "Italie",
	ES: "Espagne",
	GB: "Royaume-Uni",
};

/** Ajoute des mois à une date ISO (AAAA-MM-JJ), en restant au dernier jour du mois si besoin. */
export function addMonths(isoDate: string, months: number): string {
	const [year, month, day] = isoDate.split("-").map(Number) as [
		number,
		number,
		number,
	];
	const target = new Date(Date.UTC(year, month - 1 + months, 1));
	const lastDay = new Date(
		Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
	).getUTCDate();
	target.setUTCDate(Math.min(day, lastDay));
	return target.toISOString().slice(0, 10);
}

/** Un événement est passé quand son dernier jour est passé. */
export function isPast(
	event: Pick<RaceEvent, "date" | "dateFin">,
	today: string,
): boolean {
	return (event.dateFin ?? event.date) < today;
}

/** Dates à venir d'une course, dans la fenêtre de 18 mois (§6), de la plus proche à la plus lointaine. */
export function upcomingEvents<T extends RaceEvent>(
	events: T[],
	course: string,
	today: string,
	horizonMonths = 18,
): T[] {
	const limit = addMonths(today, horizonMonths);
	return events
		.filter(
			(event) =>
				event.course === course && !isPast(event, today) && event.date <= limit,
		)
		.sort((a, b) => a.date.localeCompare(b.date));
}

/** L'événement commence (ou a déjà commencé) dans les n prochains mois. */
export function startsWithinMonths(
	event: Pick<RaceEvent, "date">,
	today: string,
	months: number,
): boolean {
	return event.date <= addMonths(today, months);
}

const dayMonthYear = new Intl.DateTimeFormat("fr-FR", {
	day: "numeric",
	month: "short",
	year: "numeric",
	timeZone: "UTC",
});
const longDate = new Intl.DateTimeFormat("fr-FR", {
	day: "numeric",
	month: "long",
	year: "numeric",
	timeZone: "UTC",
});
const toUtc = (isoDate: string) => new Date(`${isoDate}T00:00:00Z`);

/** « 28 nov. 2026 » ou, sur plusieurs jours, « 12–20 déc. 2026 ». */
export function formatEventDates(
	event: Pick<RaceEvent, "date" | "dateFin">,
): string {
	if (!event.dateFin || event.dateFin === event.date)
		return dayMonthYear.format(toUtc(event.date));
	return dayMonthYear.formatRange(toUtc(event.date), toUtc(event.dateFin));
}

/** « 23 octobre 2026 », pour « Dates vérifiées le… ». */
export function formatCheckedOn(isoDateTime: string): string {
	return longDate.format(new Date(isoDateTime));
}

/** Date du jour au format AAAA-MM-JJ, à l'heure de Paris. */
export function todayInParis(now: Date = new Date()): string {
	return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(
		now,
	);
}
