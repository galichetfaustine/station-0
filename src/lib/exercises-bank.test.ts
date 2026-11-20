import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { type DataFile, validateDataFiles } from "./data-validation.ts";
import { exerciseBankSchema } from "./schemas.ts";

const readJson = (path: string) =>
	JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), "utf8"));

const bank = exerciseBankSchema.parse(readJson("data/exercises.json"));

/** Estimations d'entraînement, en secondes par unité (SPECS §8). */
const SECONDES_PAR_UNITE: Record<string, number> = {
	course: 0.36,
	"montees-genoux": 1,
	skierg: 0.3,
	"squats-sautes-tirage": 1.5,
	rameur: 0.3,
	"air-bike": 4,
	"sled-push": 3,
	"sled-pull": 3.5,
	"bear-crawl": 3,
	"sprints-courts": 0.22,
	"tirage-elastique": 2,
	"burpee-broad-jumps": 2,
	burpees: 4,
	"farmers-carry": 1.2,
	"marche-deux-sacs": 1.5,
	"fentes-sandbag": 2,
	"fentes-halteres": 2,
	"fentes-ram": 3,
	"fentes-poids-corps": 2.5,
	"wall-balls": 3,
	"squats-lancer": 2.5,
	"box-jump-overs": 3,
	"step-ups": 2.5,
	"sauts-lateraux": 1.5,
	"deadlift-kettlebell": 3,
	"deadlift-sac": 3,
	"goblet-squat": 3,
	"squat-poids-corps": 2,
	"push-press": 3,
	"push-press-sac": 3,
	snatch: 4,
	"snatch-sac": 4,
	"bucket-carry": 1.5,
	"marche-sac-poitrine": 1.5,
	"burpees-lestes": 5,
	"sandbag-carry": 1.5,
	"squats-sandbag": 3.5,
	"front-carry": 1.4,
	"wall-walks": 15,
	"handstand-push-ups": 8,
};

/** Même lecture que `npm run validate:data` : tout le dossier data/. */
function dataFiles(): DataFile[] {
	return readdirSync(new URL("../../data", import.meta.url), {
		recursive: true,
		encoding: "utf8",
	})
		.filter((name) => name.endsWith(".json"))
		.map((name) => {
			const path = `data/${name.replaceAll("\\", "/")}`;
			return {
				path,
				content: readFileSync(
					new URL(`../../${path}`, import.meta.url),
					"utf8",
				),
			};
		});
}

describe("banque d'exercices (US3.1)", () => {
	it("compte au moins 25 exercices", () => {
		expect(bank.length).toBeGreaterThanOrEqual(25);
	});

	it("donne une alternative à chaque exercice qui demande du matériel", () => {
		const avecMateriel = bank.filter(
			(exercise) => exercise.materiel !== "aucun",
		);
		expect(avecMateriel.length).toBeGreaterThan(0);
		for (const exercise of avecMateriel) {
			expect(exercise.alternatives.length).toBeGreaterThan(0);
		}
	});

	it("passe le schéma et la validation des données du dépôt", () => {
		expect(validateDataFiles(dataFiles())).toEqual([]);
	});

	it("laisse les volumes vides et retient les temps estimés", () => {
		expect(bank.map((exercise) => exercise.id).sort()).toEqual(
			Object.keys(SECONDES_PAR_UNITE).sort(),
		);
		for (const exercise of bank) {
			expect(exercise.volumeParNiveau).toEqual({
				debutant: null,
				intermediaire: null,
				confirme: null,
			});
			expect(exercise.secondesParUnite).toBe(SECONDES_PAR_UNITE[exercise.id]);
		}
	});
});
