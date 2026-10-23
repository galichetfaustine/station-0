import { describe, expect, it } from "vitest";
import type { CategoryNote } from "./bareme.ts";
import {
	applyFilters,
	type CatalogueRace,
	DEFAULT_FILTERS,
	formatDuration,
	parseFilters,
	serializeFilters,
	sortRaces,
} from "./catalogue.ts";

const note = (value: number | null): CategoryNote => ({
	note: value,
	justification: "test",
});

function race(slug: string, patch: Partial<CatalogueRace> = {}): CatalogueRace {
	return {
		slug,
		nom: slug.toUpperCase(),
		organisateur: "Org",
		typeCourse: "hybride",
		formats: ["solo"],
		duree: "1 h",
		notes: { course: note(3), force: note(3), cardio: note(3), gym: note(3) },
		noteGlobale: 3,
		...patch,
	};
}

const races = [
	race("hyrox", { formats: ["solo"], noteGlobale: 4 }),
	race("doubles", { formats: ["duo"], noteGlobale: 4 }),
	race("strong", {
		formats: ["solo", "duo"],
		noteGlobale: 2,
		notes: { course: note(1), force: note(3), cardio: note(3), gym: note(2) },
	}),
	race("relais", { formats: ["solo", "relais"], noteGlobale: 3 }),
	race("spartan", {
		typeCourse: "obstacles",
		formats: ["solo", "equipe"],
		noteGlobale: 4,
	}),
	race("turf", { formats: ["equipe"], noteGlobale: null }),
];
const slugs = (list: CatalogueRace[]) => list.map((r) => r.slug);

describe("parseFilters / serializeFilters", () => {
	it("lit les filtres de l'URL", () => {
		const filters = parseFilters(
			new URLSearchParams(
				"format=duo&noteMax=3&sansCourse=1&type=hybride&tri=difficulte",
			),
		);
		expect(filters).toEqual({
			format: "duo",
			noteMax: 3,
			sansCourse: true,
			type: "hybride",
			tri: "difficulte",
		});
	});

	it("ignore les valeurs inconnues", () => {
		expect(
			parseFilters(
				new URLSearchParams("format=trio&noteMax=9&type=autre&tri=x"),
			),
		).toEqual(DEFAULT_FILTERS);
	});

	it("fait l'aller-retour URL → filtres → URL sans perte, et omet les valeurs par défaut", () => {
		const query =
			"format=equipe&noteMax=2&sansCourse=1&type=obstacles&tri=difficulte";
		expect(
			serializeFilters(parseFilters(new URLSearchParams(query))).toString(),
		).toBe(query);
		expect(serializeFilters(DEFAULT_FILTERS).toString()).toBe("");
	});
});

describe("applyFilters", () => {
	it("sans filtre, garde toutes les courses", () => {
		expect(applyFilters(races, DEFAULT_FILTERS)).toHaveLength(races.length);
	});

	it("filtre par format ; « équipe » inclut les relais", () => {
		expect(
			slugs(applyFilters(races, { ...DEFAULT_FILTERS, format: "duo" })),
		).toEqual(["doubles", "strong"]);
		expect(
			slugs(applyFilters(races, { ...DEFAULT_FILTERS, format: "equipe" })),
		).toEqual(["relais", "spartan", "turf"]);
	});

	it("filtre par note globale maximale et écarte les notes à confirmer", () => {
		expect(
			slugs(applyFilters(races, { ...DEFAULT_FILTERS, noteMax: 3 })),
		).toEqual(["relais", "strong"]);
	});

	it("« sans course à pied » ne garde que les courses notées 1 en course", () => {
		expect(
			slugs(applyFilters(races, { ...DEFAULT_FILTERS, sansCourse: true })),
		).toEqual(["strong"]);
	});

	it("filtre par type hybride ou obstacles", () => {
		expect(
			slugs(applyFilters(races, { ...DEFAULT_FILTERS, type: "obstacles" })),
		).toEqual(["spartan"]);
		expect(
			applyFilters(races, { ...DEFAULT_FILTERS, type: "hybride" }),
		).toHaveLength(5);
	});
});

describe("sortRaces", () => {
	it("trie par difficulté croissante, notes à confirmer en dernier", () => {
		expect(slugs(sortRaces(races, "difficulte"))).toEqual([
			"strong",
			"relais",
			"doubles",
			"hyrox",
			"spartan",
			"turf",
		]);
	});
});

describe("formatDuration", () => {
	it("écrit les minutes en heures lisibles", () => {
		expect(formatDuration({ dureeMoyenneMin: 50 })).toBe("50 min");
		expect(formatDuration({ dureeMoyenneMin: 90 })).toBe("1 h 30");
		expect(formatDuration({ dureeMoyenneMin: 120 })).toBe("2 h");
	});
	it("ajoute « environ » pour une estimation", () => {
		expect(formatDuration({ dureeMoyenneMin: 70, dureeEstimee: true })).toBe(
			"environ 1 h 10",
		);
	});
	it("préfère le texte fourni quand il existe", () => {
		expect(
			formatDuration({ dureeMoyenneMin: 2880, dureeTexte: "2 jours" }),
		).toBe("2 jours");
	});
});
