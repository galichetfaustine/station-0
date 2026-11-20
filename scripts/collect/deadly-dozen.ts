// Collecteur Deadly Dozen (US1.5) : une page par pays avec une liste schema.org ItemList.
// Seul le format « Track Race » (12 × 400 m), nommé « Deadly Dozen <ville> », est retenu (décision n° 5).
// Étude : docs/sources-dates.md. Une requête par pays de la zone, espacées.
import type { RaceEvent } from "../../src/lib/schemas.ts";
import { frenchCity } from "./cities.ts";
import { parseDateRange } from "./date-text.ts";

export const DEADLY_DOZEN = {
	source: "deadly-dozen",
	courses: ["deadly-dozen"],
	pages: {
		FR: "https://www.deadlydozen.com/races/france",
		BE: "https://www.deadlydozen.com/races/belgium",
		CH: "https://www.deadlydozen.com/races/switzerland",
		LU: "https://www.deadlydozen.com/races/luxembourg",
		DE: "https://www.deadlydozen.com/races/germany",
		IT: "https://www.deadlydozen.com/races/italy",
		ES: "https://www.deadlydozen.com/races/spain",
		GB: "https://www.deadlydozen.com/races/united-kingdom",
	} satisfies Record<RaceEvent["pays"], string>,
} as const;

interface ListItem {
	name?: string;
	url?: string;
}

/** Extrait les Track Races d'une page pays. Une page sans liste (aucune course annoncée) donne une liste vide. */
export function parseDeadlyDozenCountry(
	html: string,
	pays: RaceEvent["pays"],
): RaceEvent[] {
	const items: ListItem[] = [];
	for (const [, json] of html.matchAll(
		/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
	)) {
		const data = JSON.parse(json ?? "null") as unknown;
		for (const node of Array.isArray(data) ? data : [data]) {
			if (
				node &&
				typeof node === "object" &&
				(node as { "@type"?: string })["@type"] === "ItemList"
			) {
				items.push(
					...((node as { itemListElement?: ListItem[] }).itemListElement ?? []),
				);
			}
		}
	}

	return items.flatMap((item) => {
		const match = /^Deadly Dozen (.+?) - (.+)$/.exec(item.name ?? "");
		const dates = match?.[2] ? parseDateRange(match[2]) : null;
		if (
			!match?.[1] ||
			!dates ||
			!item.url?.startsWith("https://www.deadlydozen.com/")
		)
			return [];
		return [
			{
				course: "deadly-dozen",
				...dates,
				ville: frenchCity(match[1]),
				pays,
				lienInscription: item.url,
			},
		];
	});
}
