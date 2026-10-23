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
