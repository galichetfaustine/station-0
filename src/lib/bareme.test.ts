import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { computeNotes, formatNote, levelFor } from "./bareme.ts";
import { type Bareme, baremeConfigSchema, raceSchema } from "./schemas.ts";

const readJson = (path: string) =>
	JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), "utf8"));
const config = baremeConfigSchema.parse(readJson("data/config/bareme.json"));
const race = (slug: string) =>
	raceSchema.parse(readJson(`data/races/${slug}.json`));
const notesOf = (slug: string) => {
	const { bareme, dureeMoyenneMin } = race(slug);
	return computeNotes(bareme, dureeMoyenneMin, config);
};

const base: Bareme = {
	partageEffort: 1,
	course: { distanceM: 8000 },
	force: {
		chargeLibreMaxKg: { homme: 24, femme: 16 },
		sledKg: { homme: 152, femme: 102 },
		barre: "aucune",
	},
	cardio: { ergoM: 2000, dureeEffortMin: 90 },
	gym: { mouvementLePlusTechnique: "wallBalls" },
};

describe("exemple de référence du §5", () => {
	it("HYROX Open solo : course 5, force 4, cardio 4, gym 2, globale 4", () => {
		const { categories, globale } = notesOf("hyrox-open");
		expect([
			categories.course.note,
			categories.force.note,
			categories.cardio.note,
			categories.gym.note,
		]).toEqual([5, 4, 4, 2]);
		expect(globale.note).toBe(4);
		expect(categories.course.justification).toBe("8 km de course au total");
		expect(categories.force.justification).toBe(
			"Sled de 152 kg, lourd (charges hommes)",
		);
	});
});

describe("levelFor", () => {
	const paliers = config.course.distanceM;
	it("donne 1 sans course, 2 jusqu'à 2 km exclus, puis les paliers 2, 5 et 8 km", () => {
		expect(
			[0, 1, 1999, 2000, 4999, 5000, 7999, 8000, 12000].map((m) =>
				levelFor(m, paliers),
			),
		).toEqual([1, 2, 2, 3, 3, 4, 4, 5, 5]);
	});
	it("traite « plus de 90 min » comme strictement supérieur", () => {
		const duree = config.cardio.dureeEffortMin;
		expect([19, 20, 40, 60, 90, 91].map((min) => levelFor(min, duree))).toEqual(
			[1, 2, 3, 4, 4, 5],
		);
	});
});

describe("force", () => {
	const force = (patch: Partial<NonNullable<Bareme["force"]>>) =>
		computeNotes(
			{
				...base,
				force: { ...(base.force as NonNullable<Bareme["force"]>), ...patch },
			},
			60,
			config,
		).categories.force;

	it("charges libres : < 10 kg → 1, 10 à 16 kg → 2, 16 kg et plus → 3", () => {
		const libre = (homme: number) =>
			force({ chargeLibreMaxKg: { homme, femme: 0 }, sledKg: undefined }).note;
		expect([0, 9.5, 10, 15, 16, 32].map(libre)).toEqual([1, 1, 2, 2, 3, 3]);
	});
	it("sled léger → 3, sled lourd (≥ 100 kg) → 4", () => {
		expect(force({ sledKg: { homme: 73, femme: 73 } }).note).toBe(3);
		expect(force({ sledKg: { homme: 100, femme: 80 } }).note).toBe(4);
	});
	it("barre sous-maximale → 4, tests de charge maximale → 5", () => {
		expect(force({ barre: "sousMax", sledKg: undefined }).note).toBe(4);
		expect(force({ barre: "testMax" }).justification).toContain(
			"Tests de charge maximale",
		);
		expect(force({ barre: "testMax" }).note).toBe(5);
	});
	it("utilise les charges de la catégorie de référence de la config", () => {
		const femmes = { ...config, chargeReference: "femme" as const };
		const bareme: Bareme = {
			...base,
			force: { chargeLibreMaxKg: { homme: 20, femme: 12 }, barre: "aucune" },
		};
		expect(computeNotes(bareme, 60, config).categories.force.note).toBe(3);
		expect(computeNotes(bareme, 60, femmes).categories.force.note).toBe(2);
	});
});

describe("cardio", () => {
	it("prend la plus haute des deux notes (ergo ou durée d'effort)", () => {
		const cardio = computeNotes(
			{ ...base, cardio: { ergoM: 500, dureeEffortMin: 70 } },
			70,
			config,
		).categories.cardio;
		expect(cardio.note).toBe(4);
		expect(cardio.justification).toBe("Environ 70 min d'effort, 500 m d'ergo");
	});
	it("en duo, ne compte que le volume d'ergo par athlète, sans la durée", () => {
		const cardio = computeNotes(
			{
				...base,
				partageEffort: 2,
				cardio: { ergoM: 2000, dureeEffortMin: 80 },
			},
			80,
			config,
		).categories.cardio;
		expect(cardio.note).toBe(3);
		expect(cardio.justification).toBe(
			"1\u202f000 m d'ergo par athlète (en duo, la durée ne compte pas)",
		);
	});
	it("se contente de la donnée connue", () => {
		const cardio = computeNotes(
			{ ...base, cardio: { ergoM: null, dureeEffortMin: 69 } },
			150,
			config,
		).categories.cardio;
		expect(cardio.note).toBe(4);
	});
});

describe("note globale", () => {
	it("retire 0,5 sous 30 min et ajoute 0,5 au-delà de 90 min", () => {
		expect(computeNotes(base, 25, config).globale.ajustement).toBe(-0.5);
		expect(computeNotes(base, 90, config).globale.ajustement).toBe(0);
		expect(computeNotes(base, 91, config).globale.ajustement).toBe(0.5);
	});
	it("arrondit au demi-point le plus proche (x,25 et x,75 vers le haut) et reste entre 1 et 5", () => {
		const avec = (gym: "wallBalls" | "snatchHaltere", duree: number) =>
			computeNotes(
				{
					...base,
					cardio: { ergoM: 2000, dureeEffortMin: 70 },
					gym: { mouvementLePlusTechnique: gym },
				},
				duree,
				config,
			).globale.note;
		expect(avec("wallBalls", 60)).toBe(4); // 3,75 → 4
		expect(avec("wallBalls", 20)).toBe(3.5); // 3,75 − 0,5 = 3,25 → 3,5
		const facile: Bareme = {
			partageEffort: 1,
			course: { distanceM: 0 },
			force: { chargeLibreMaxKg: { homme: 0, femme: 0 }, barre: "aucune" },
			cardio: { ergoM: 0, dureeEffortMin: 10 },
			gym: { mouvementLePlusTechnique: "marcher" },
		};
		expect(computeNotes(facile, 10, config).globale.note).toBe(1);
		const dur: Bareme = {
			...base,
			force: { barre: "testMax" },
			gym: { mouvementLePlusTechnique: "muscleUp" },
		};
		expect(computeNotes(dur, 300, config).globale.note).toBe(5);
	});
	it("s'affiche à la française", () => {
		expect([formatNote(3.5), formatNote(4), formatNote(null)]).toEqual([
			"3,5",
			"4",
			"?",
		]);
	});
	it("reste à confirmer si une catégorie manque", () => {
		const { globale, categories } = computeNotes(
			{ ...base, gym: null },
			60,
			config,
		);
		expect(categories.gym.note).toBeNull();
		expect(globale.note).toBeNull();
		expect(globale.justification).toBe("À confirmer (gym / agilité)");
	});
});

describe("résultats de référence validés (revue du 23/10/2026)", () => {
	it.each([
		["hyrox-open", 4],
		["athx", 4],
		["hybrid-games", 4],
		["spartan-sprint", 4],
		["hyrox-doubles", 3.5],
		["deadly-dozen", 3.5],
		["deka-fit", 3],
		["deka-mile", 2.5],
		["deka-strong", 2],
	])("%s : note globale %d", (slug, expected) => {
		expect(notesOf(slug).globale.note).toBe(expected);
	});

	it("HYROX Doubles : cardio 3 (1 000 m d'ergo par athlète)", () => {
		expect(notesOf("hyrox-doubles").categories.cardio.note).toBe(3);
	});

	it.each(["turf-games", "xenom"])(
		"%s : note globale à venir (règlement non public)",
		(slug) => {
			expect(notesOf(slug).globale.note).toBeNull();
		},
	);
});

describe("les 11 courses", () => {
	const slugs = [
		"hyrox-open",
		"hyrox-doubles",
		"deka-fit",
		"deka-mile",
		"deka-strong",
		"athx",
		"deadly-dozen",
		"hybrid-games",
		"turf-games",
		"xenom",
		"spartan-sprint",
	];
	it.each(slugs)("%s : chaque note a une justification", (slug) => {
		const { categories, globale } = notesOf(slug);
		for (const note of [...Object.values(categories), globale])
			expect(note.justification.length).toBeGreaterThan(5);
	});
	it("DEKA STRONG (sans course) est plus facile que DEKA FIT", () => {
		expect(notesOf("deka-strong").globale.note).toBeLessThan(
			notesOf("deka-fit").globale.note ?? 0,
		);
	});
});
