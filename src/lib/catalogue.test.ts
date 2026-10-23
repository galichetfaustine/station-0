import { describe, expect, it } from "vitest";
import type { CategoryNote } from "./bareme.ts";
import {
	applyFilters,
	type CatalogueRace,
	DEFAULT_FILTERS,
	formatDuration,
	mostAccessible,
	nextEvent,
	parseFilters,
	serializeFilters,
	sortRaces,
} from "./catalogue.ts";

const TODAY = "2026-10-23";
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
		events: [],
		...patch,
	};
}

const races = [
	race("hyrox", {
		formats: ["solo"],
		noteGlobale: 4,
		events: [
			{ date: "2026-12-12", dateFin: "2026-12-20", ville: "Paris", pays: "FR" },
			{ date: "2027-03-03", ville: "Malines", pays: "BE" },
		],
	}),
	race("doubles", {
		formats: ["duo"],
		noteGlobale: 3.5,
		events: [{ date: "2027-05-12", ville: "Lyon", pays: "FR" }],
	}),
	race("strong", {
		formats: ["solo", "duo"],
		noteGlobale: 2,
		notes: { course: note(1), force: note(3), cardio: note(3), gym: note(2) },
		events: [{ date: "2026-11-29", ville: "Farnborough", pays: "GB" }],
	}),
	race("relais", { formats: ["solo", "relais"], noteGlobale: 3 }),
	race("spartan", {
		typeCourse: "obstacles",
		formats: ["solo", "equipe"],
		noteGlobale: 4,
		events: [{ date: "2026-10-20", ville: "Passé", pays: "FR" }],
	}),
	race("turf", { formats: ["equipe"], noteGlobale: null }),
];
const slugs = (list: CatalogueRace[]) => list.map((r) => r.slug);
const filter = (patch: Partial<typeof DEFAULT_FILTERS>) =>
	slugs(applyFilters(races, { ...DEFAULT_FILTERS, ...patch }, TODAY));

describe("parseFilters / serializeFilters", () => {
	it("lit les filtres de l'URL", () => {
		const filters = parseFilters(
			new URLSearchParams(
				"format=duo&noteMax=3&sansCourse=1&type=hybride&pays=BE&dans3Mois=1&tri=difficulte",
			),
		);
		expect(filters).toEqual({
			format: "duo",
			noteMax: 3,
			sansCourse: true,
			type: "hybride",
			pays: "BE",
			dans3Mois: true,
			tri: "difficulte",
		});
	});

	it("ignore les valeurs inconnues", () => {
		expect(
			parseFilters(
				new URLSearchParams("format=trio&noteMax=9&type=autre&pays=US&tri=x"),
			),
		).toEqual(DEFAULT_FILTERS);
	});

	it("fait l'aller-retour URL → filtres → URL sans perte, et omet les valeurs par défaut", () => {
		const query =
			"format=equipe&noteMax=2&sansCourse=1&type=obstacles&pays=FR&dans3Mois=1&tri=difficulte";
		expect(
			serializeFilters(parseFilters(new URLSearchParams(query))).toString(),
		).toBe(query);
		expect(serializeFilters(DEFAULT_FILTERS).toString()).toBe("");
	});
});

describe("applyFilters", () => {
	it("sans filtre, garde toutes les courses", () => {
		expect(filter({})).toHaveLength(races.length);
	});

	it("filtre par format ; « équipe » inclut les relais", () => {
		expect(filter({ format: "duo" })).toEqual(["strong", "doubles"]);
		expect(filter({ format: "equipe" })).toEqual(["relais", "spartan", "turf"]);
	});

	it("filtre par note globale maximale et écarte les notes à confirmer", () => {
		expect(filter({ noteMax: 3 })).toEqual(["strong", "relais"]);
	});

	it("« sans course à pied » ne garde que les courses notées 1 en course", () => {
		expect(filter({ sansCourse: true })).toEqual(["strong"]);
	});

	it("filtre par type hybride ou obstacles", () => {
		expect(filter({ type: "obstacles" })).toEqual(["spartan"]);
		expect(filter({ type: "hybride" })).toHaveLength(5);
	});

	it("filtre par pays sur les dates à venir uniquement", () => {
		expect(filter({ pays: "FR" })).toEqual(["hyrox", "doubles"]);
		expect(filter({ pays: "BE" })).toEqual(["hyrox"]);
	});

	it("« dans les 3 mois » garde les courses dont une date commence d'ici 3 mois", () => {
		expect(filter({ dans3Mois: true })).toEqual(["strong", "hyrox"]);
	});
});

describe("sortRaces", () => {
	it("par défaut, trie par prochaine date ; sans date à venir en fin de liste", () => {
		expect(slugs(sortRaces(races, "date", TODAY))).toEqual([
			"strong",
			"hyrox",
			"doubles",
			"relais",
			"spartan",
			"turf",
		]);
	});

	it("trie par difficulté croissante, notes à confirmer en dernier", () => {
		expect(slugs(sortRaces(races, "difficulte", TODAY))).toEqual([
			"strong",
			"relais",
			"doubles",
			"hyrox",
			"spartan",
			"turf",
		]);
	});
});

describe("nextEvent", () => {
	it("ignore les dates passées, même si le build les contenait", () => {
		const hyrox = races[0] as CatalogueRace;
		expect(nextEvent(hyrox, TODAY)?.ville).toBe("Paris");
		expect(nextEvent(hyrox, "2026-12-21")?.ville).toBe("Malines");
		expect(nextEvent(hyrox, "2027-03-04")).toBeNull();
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

describe("mostAccessible", () => {
	it("renvoie les courses les plus faciles, sans les notes à venir", () => {
		expect(slugs(mostAccessible(races, 3, TODAY))).toEqual([
			"strong",
			"relais",
			"doubles",
		]);
		expect(slugs(mostAccessible(races, 10, TODAY))).not.toContain("turf");
	});
});
