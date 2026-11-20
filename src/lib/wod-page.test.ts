import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	type Exercise,
	exerciseBankSchema,
	type WodFormat,
	wodConfigSchema,
} from "./schemas.ts";
import { generateWod, type WodSession } from "./wod.ts";
import {
	describeSession,
	formatVolume,
	locksFromSelection,
	parseWodSearch,
	raceLabel,
	seedFromBytes,
	serializeWodSearch,
	toGeneratorLocks,
} from "./wod-page.ts";

const slugs = ["hyrox-open", "deka-mile"];

describe("parseWodSearch", () => {
	it("verrouille la course demandée, y compris Mix", () => {
		expect(
			parseWodSearch(new URLSearchParams("course=hyrox-open"), slugs).locks
				.race,
		).toBe("hyrox-open");
		expect(
			parseWodSearch(new URLSearchParams("course=mix"), slugs).locks.race,
		).toBe("mix");
	});

	it("ignore un slug inconnu et une graine invalide", () => {
		const parsed = parseWodSearch(
			new URLSearchParams("course=inconnue&graine=court&cap=12&format=yoga"),
			slugs,
		);
		expect(parsed.seed).toBeNull();
		expect(parsed.locks.race).toBeNull();
		expect(parsed.locks.timeCapMin).toBeNull();
		expect(parsed.locks.format).toBeNull();
		expect(parsed.locks.level).toBe("debutant");
	});

	it("lit la graine et les verrous connus", () => {
		const parsed = parseWodSearch(
			new URLSearchParams(
				"graine=abcdef01&cap=20&niveau=intermediaire&materiel=aucun&format=emom",
			),
			slugs,
		);
		expect(parsed.seed).toBe("abcdef01");
		expect(parsed.locks).toEqual({
			timeCapMin: 20,
			race: null,
			level: "intermediaire",
			equipment: "aucun",
			format: "emom",
		});
	});
});

describe("serializeWodSearch", () => {
	it("n'écrit que la graine et les verrous posés, pas le niveau débutant", () => {
		const locks = locksFromSelection(
			{
				cap: "15",
				course: "hyrox-open",
				level: "debutant",
				equipment: "",
				format: "amrap",
			},
			slugs,
		);
		expect(serializeWodSearch({ seed: "abcdef01", locks }).toString()).toBe(
			"graine=abcdef01&cap=15&course=hyrox-open&format=amrap",
		);
	});

	it("retrouve les mêmes verrous après un aller-retour", () => {
		const locks = locksFromSelection(
			{
				cap: "",
				course: "mix",
				level: "confirme",
				equipment: "salleComplete",
				format: "",
			},
			slugs,
		);
		const params = serializeWodSearch({ seed: "0123456789abcdef", locks });
		expect(parseWodSearch(params, slugs)).toEqual({
			seed: "0123456789abcdef",
			locks,
		});
		expect(toGeneratorLocks(locks)).toEqual({
			level: "confirme",
			race: "mix",
			equipment: "salleComplete",
		});
	});

	it("refuse une course qui n'est pas dans le catalogue", () => {
		expect(
			locksFromSelection(
				{
					cap: "20",
					course: "autre",
					level: "debutant",
					equipment: "haltères",
					format: "forTime",
				},
				slugs,
			),
		).toEqual({
			timeCapMin: 20,
			race: null,
			level: "debutant",
			equipment: null,
			format: "forTime",
		});
	});
});

describe("seedFromBytes", () => {
	it("fabrique une graine que l'adresse accepte, sans tirage", () => {
		const seed = seedFromBytes(new Uint8Array(8).fill(10));
		expect(seed).toBe("0a0a0a0a0a0a0a0a");
		expect(
			parseWodSearch(new URLSearchParams({ graine: seed }), slugs).seed,
		).toBe(seed);
	});
});

describe("describeSession", () => {
	const races = [{ slug: "hyrox-open", nom: "HYROX Open solo" }];
	const consignes = new Map([["course", "Allure régulière."]]);

	function session(format: WodFormat): WodSession {
		const exercises: WodSession["exercises"] = [
			{
				id: "course",
				nom: "Course",
				categorie: "course",
				schemaMouvement: "corpsEntier",
				materiel: "aucun",
				unite: "metres",
				coursesOrigine: ["hyrox-open"],
				volume: 200,
				secondes: 72,
			},
			{
				id: "squat",
				nom: "Squat",
				categorie: "force",
				schemaMouvement: "squat",
				materiel: "aucun",
				unite: "repetitions",
				coursesOrigine: ["hyrox-open"],
				volume: 1,
				secondes: 2,
			},
		];
		return {
			seed: "abcdef01",
			timeCapMin: 15,
			race: "hyrox-open",
			level: "debutant",
			equipment: "aucun",
			format,
			exercises,
			workSeconds: 74,
			sessionSeconds: format === "forTime" ? 74 : 900,
			warmupMin: 5,
			roundSeconds: format === "amrap" ? 180 : null,
			restSeconds: format === "intervalles" ? 20 : null,
			stations: format === "emom" || format === "intervalles" ? 2 : null,
		};
	}

	it("décrit un tour AMRAP, une minute EMOM, le repos et le cap", () => {
		const amrap = describeSession(session("amrap"), races, consignes);
		expect(amrap.facts.map((fact) => fact.value)).toEqual([
			"15 min",
			"HYROX Open solo",
			"Débutant",
			"Aucun",
			"AMRAP",
		]);
		expect(amrap.warmup).toContain("5 min");
		expect(amrap.steps).toHaveLength(2);
		expect(amrap.steps[0]).toMatchObject({
			volume: "200 m",
			nom: "Course",
			consigne: "Allure régulière.",
		});
		expect(amrap.steps[1]?.volume).toBe("1 répétition");

		const emom = describeSession(session("emom"), races, consignes);
		expect(emom.steps.map((step) => step.label)).toEqual([
			"Minute 1",
			"Minute 2",
		]);
		expect(emom.detail).toContain("Chaque minute");

		const intervals = describeSession(session("intervalles"), races, consignes);
		expect(intervals.detail).toContain("20 s de repos");
		expect(intervals.steps[0]?.label).toBe("Tour 1");

		expect(
			describeSession(session("forTime"), races, consignes).detail,
		).toContain("le plus vite possible");
	});

	it("nomme Mix et formate les grands volumes en français", () => {
		expect(raceLabel("mix", races)).toBe("Mix");
		expect(raceLabel("inconnu", races)).toBe("inconnu");
		expect(formatVolume(12, "repetitions")).toBe("12 répétitions");
		expect(formatVolume(1000, "metres")).toBe(
			`${(1000).toLocaleString("fr-FR")} m`,
		);
		expect(formatVolume(15, "calories")).toBe("15 cal");
		expect(formatVolume(40, "secondes")).toBe("40 s");
	});
});

describe("adresse et banque réelle", () => {
	const exercises: Exercise[] = exerciseBankSchema.parse(
		JSON.parse(
			readFileSync(
				new URL("../../data/exercises.json", import.meta.url),
				"utf8",
			),
		),
	);
	const config = wodConfigSchema.parse(
		JSON.parse(
			readFileSync(
				new URL("../../data/config/wod.json", import.meta.url),
				"utf8",
			),
		),
	);
	const raceSlugs = readdirSync(new URL("../../data/races/", import.meta.url))
		.filter((name) => name.endsWith(".json"))
		.map((name) => name.replace(/\.json$/, ""));

	it("la même adresse redonne la même séance, et course= verrouille la course", () => {
		const address = parseWodSearch(
			new URLSearchParams(
				"graine=abcdef0123456789&course=hyrox-open&cap=20&format=forTime",
			),
			raceSlugs,
		);
		expect(address.seed).not.toBeNull();
		const input = {
			seed: address.seed ?? "",
			exercises,
			races: raceSlugs,
			config,
			locks: toGeneratorLocks(address.locks),
		};
		const first = generateWod(input);
		const second = generateWod(input);
		expect(first.ok).toBe(true);
		expect(second.ok).toBe(true);
		if (!first.ok || !second.ok) return;
		expect(first.session.race).toBe("hyrox-open");
		expect(first.session.timeCapMin).toBe(20);
		expect(first.session.format).toBe("forTime");
		expect(first.session.exercises.map((exercise) => exercise.id)).toEqual(
			second.session.exercises.map((exercise) => exercise.id),
		);
		expect(first.session.sessionSeconds).toBeLessThanOrEqual(20 * 60);
	});
});

describe("pas de Math.random sur la page", () => {
	it("le lien et l'îlot n'appellent pas Math.random", () => {
		const sources = ["wod-page.ts", "../components/WodGenerator.svelte"];
		for (const source of sources) {
			const text = readFileSync(
				new URL(`./${source}`, import.meta.url),
				"utf8",
			);
			expect(text.includes("Math.random")).toBe(false);
		}
	});
});
