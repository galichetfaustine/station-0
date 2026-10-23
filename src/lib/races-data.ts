// Chargement des données au build : courses, configuration du barème et dates, validées par leur schéma.
import baremeConfigJson from "../../data/config/bareme.json";
import { type DatedEvent, type EventFile, mergeEvents } from "./dates.ts";
import {
	type BaremeConfig,
	baremeConfigSchema,
	eventFileSchema,
	type Race,
	raceSchema,
} from "./schemas.ts";

const files = import.meta.glob<unknown>("../../data/races/*.json", {
	eager: true,
	import: "default",
});

export const baremeConfig: BaremeConfig =
	baremeConfigSchema.parse(baremeConfigJson);

export const races: Race[] = Object.values(files)
	.map((data) => raceSchema.parse(data))
	.sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

export function findRace(slug: string): Race | undefined {
	return races.find((race) => race.slug === slug);
}

const collectedFiles = import.meta.glob<unknown>("../../data/events/*.json", {
	eager: true,
	import: "default",
});
const manualFiles = import.meta.glob<unknown>(
	"../../data/events-manual/*.json",
	{ eager: true, import: "default" },
);
const parseFiles = (files: Record<string, unknown>) =>
	Object.values(files).map((data) => eventFileSchema.parse(data));

/** Toutes les sources de dates : collectées (data/events) puis manuelles (data/events-manual). */
export const eventFiles: EventFile[] = [
	...parseFiles(collectedFiles),
	...parseFiles(manualFiles),
];

/** Dates fusionnées : la saisie manuelle remplace la collecte pour la même course et la même ville. */
export const events: DatedEvent[] = mergeEvents(
	parseFiles(collectedFiles),
	parseFiles(manualFiles),
);
