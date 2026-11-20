// Garde-fou de la collecte (§6) : une source qui renvoie 0 événement, ou en perd plus de la moitié d'un coup,
// garde ses données précédentes et passe « à vérifier » ; un ticket GitHub est alors ouvert par le workflow.
import { addMonths, isPast } from "../../src/lib/dates.ts";
import {
	type EventFile,
	eventFileSchema,
	type RaceEvent,
} from "../../src/lib/schemas.ts";

export interface GuardResult {
	file: EventFile;
	/** Raison de l'anomalie, ou null si la collecte est acceptée. */
	anomaly: string | null;
}

/** Garde les dates valides, à venir et dans les 18 mois (§6). */
export function keepUsable(events: RaceEvent[], today: string): RaceEvent[] {
	const limit = addMonths(today, 18);
	return events.filter((event) => !isPast(event, today) && event.date <= limit);
}

export function applyGuard(
	source: { source: string; courses: readonly string[] },
	collected: RaceEvent[] | Error,
	previous: EventFile | null,
	now: Date,
	today: string,
): GuardResult {
	const keepPrevious = (anomaly: string): GuardResult => ({
		file: previous
			? { ...previous, aVerifier: true }
			: {
					source: source.source,
					verifieLe: now.toISOString(),
					courses: [...source.courses],
					aVerifier: true,
					evenements: [],
				},
		anomaly,
	});

	if (collected instanceof Error)
		return keepPrevious(`source en panne : ${collected.message}`);

	const fresh = keepUsable(collected, today);
	const before = previous ? keepUsable(previous.evenements, today).length : 0;
	if (fresh.length === 0) return keepPrevious("0 événement à venir collecté");
	if (before > 0 && fresh.length < before / 2) {
		return keepPrevious(
			`${fresh.length} événement(s) au lieu de ${before} : plus de la moitié perdue d'un coup`,
		);
	}

	const file = eventFileSchema.parse({
		source: source.source,
		verifieLe: now.toISOString(),
		courses: [...source.courses],
		evenements: fresh,
	});
	return { file, anomaly: null };
}
