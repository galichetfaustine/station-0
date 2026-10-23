// Chargement des données au build : les 11 courses et la configuration du barème, validées par leur schéma.
import baremeConfigJson from "../../data/config/bareme.json";
import {
	type BaremeConfig,
	baremeConfigSchema,
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
