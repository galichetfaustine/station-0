import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { type DataFile, validateDataFiles } from "./data-validation.ts";
import { exerciseBankSchema } from "./schemas.ts";

const readJson = (path: string) =>
	JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), "utf8"));

const bank = exerciseBankSchema.parse(readJson("data/exercises.json"));

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
});
