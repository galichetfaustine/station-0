// Collecteur ATHX (US1.5) : la page /events embarque la liste des événements en JSON (attribut data-page).
// Étude : docs/sources-dates.md. 1 requête par passage.
import type { RaceEvent } from "../../src/lib/schemas.ts";
import { frenchCity, titleCase } from "./cities.ts";
import { parseDateRange } from "./date-text.ts";
import { ZONE } from "./zone.ts";

export const ATHX = {
	source: "athx",
	courses: ["athx"],
	url: "https://athxgames.com/events",
} as const;

interface AthxEvent {
	id: string;
	name: string;
	date: string;
	country?: { code?: string };
	venue?: { city?: string };
}

function decodeEntities(text: string): string {
	return text
		.replace(/&quot;/g, '"')
		.replace(/&#0?39;/g, "'")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&amp;/g, "&");
}

/** Extrait les événements ATHX en France et pays proches. Lève une erreur si la page a changé de structure. */
export function parseAthx(html: string): RaceEvent[] {
	const match = /data-page="([^"]+)"/.exec(html);
	if (!match?.[1])
		throw new Error(
			"ATHX : attribut data-page introuvable (structure de la page modifiée ?)",
		);
	const page = JSON.parse(decodeEntities(match[1])) as {
		props?: { future_events?: AthxEvent[] };
	};
	const list = page.props?.future_events;
	if (!Array.isArray(list))
		throw new Error(
			"ATHX : liste future_events introuvable (structure modifiée ?)",
		);

	return list.flatMap((event) => {
		const pays = event.country?.code;
		// La ville vient du nom (« ATHX MADRID 2027 ») : venue.city donne parfois la commune du parc des expositions.
		const fromName = /^ATHX\s+(.+?)\s+\d{4}$/i.exec(event.name.trim())?.[1];
		const ville = fromName ? frenchCity(titleCase(fromName)) : undefined;
		const dates = parseDateRange(event.date);
		if (!pays || !ZONE.includes(pays as RaceEvent["pays"]) || !ville || !dates)
			return [];
		return [
			{
				course: "athx",
				...dates,
				ville,
				pays: pays as RaceEvent["pays"],
				lienInscription: `https://athxgames.com/events/${event.id}`,
			},
		];
	});
}
