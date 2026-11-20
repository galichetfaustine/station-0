import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { type Exercise, type WodConfig, wodConfigSchema } from "./schemas.ts";
import { type GenerateWodInput, generateWod, type WodSession } from "./wod.ts";

const readJson = (path: string) =>
	JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), "utf8"));

const config = wodConfigSchema.parse(readJson("data/config/wod.json"));

const RANKS = { aucun: 0, halteresKettlebell: 1, salleComplete: 2 } as const;

function exo(
	partial: Pick<
		Exercise,
		"id" | "categorie" | "schemaMouvement" | "coursesOrigine"
	> &
		Partial<Exercise>,
): Exercise {
	return {
		nom: partial.id,
		materiel: "aucun",
		unite: "repetitions",
		volumeParNiveau: {
			debutant: null,
			intermediaire: null,
			confirme: null,
		},
		secondesParUnite: 5,
		consigne: "Consigne de test.",
		alternatives: [],
		...partial,
	};
}

/** Banque fictive : les temps sont écrits ici, pas dans data/exercises.json. */
const bank: Exercise[] = [
	exo({
		id: "alpha-course",
		categorie: "course",
		schemaMouvement: "corpsEntier",
		coursesOrigine: ["alpha"],
	}),
	exo({
		id: "alpha-cardio",
		categorie: "cardio",
		schemaMouvement: "tirer",
		coursesOrigine: ["alpha"],
	}),
	exo({
		id: "alpha-squat",
		categorie: "force",
		schemaMouvement: "squat",
		coursesOrigine: ["alpha"],
	}),
	exo({
		id: "alpha-pousser",
		categorie: "force",
		schemaMouvement: "pousser",
		coursesOrigine: ["alpha"],
	}),
	exo({
		id: "beta-course",
		categorie: "course",
		schemaMouvement: "corpsEntier",
		coursesOrigine: ["beta"],
	}),
	exo({
		id: "beta-cardio",
		categorie: "cardio",
		schemaMouvement: "tirer",
		coursesOrigine: ["beta"],
	}),
	exo({
		id: "beta-squat",
		categorie: "force",
		schemaMouvement: "squat",
		coursesOrigine: ["beta"],
	}),
	exo({
		id: "beta-pousser",
		categorie: "force",
		schemaMouvement: "pousser",
		coursesOrigine: ["beta"],
	}),
	exo({
		id: "sans-temps",
		categorie: "force",
		schemaMouvement: "fente",
		coursesOrigine: ["alpha"],
		secondesParUnite: null,
		alternatives: ["alpha-pousser"],
	}),
	exo({
		id: "trop-long",
		categorie: "force",
		schemaMouvement: "charniere",
		coursesOrigine: ["alpha"],
		secondesParUnite: 10_000,
	}),
	exo({
		id: "kettlebell",
		categorie: "force",
		schemaMouvement: "fente",
		coursesOrigine: ["alpha"],
		materiel: "halteresKettlebell",
		alternatives: ["sans-temps", "alpha-squat"],
	}),
	exo({
		id: "sled",
		categorie: "force",
		schemaMouvement: "pousser",
		coursesOrigine: ["alpha"],
		materiel: "salleComplete",
		alternatives: ["sans-temps", "alpha-pousser"],
	}),
];

const races = ["alpha", "beta"];

function input(
	seed: string,
	patch: Partial<GenerateWodInput> = {},
): GenerateWodInput {
	return {
		seed,
		exercises: bank,
		races,
		config,
		...patch,
	};
}

function expectSession(params: GenerateWodInput): WodSession {
	const result = generateWod(params);
	expect(result.ok, result.ok ? "" : result.reason).toBe(true);
	if (!result.ok) throw new Error(result.reason);
	return result.session;
}

function budgetOf(session: WodSession, wodConfig: WodConfig = config): number {
	return Math.round(wodConfig.forTimePartMax * session.timeCapMin * 60);
}

function expectRules(session: WodSession, wodConfig: WodConfig = config) {
	expect(session.exercises.length).toBeGreaterThanOrEqual(
		wodConfig.exercicesMin,
	);
	expect(session.exercises.length).toBeLessThanOrEqual(wodConfig.exercicesMax);
	expect(
		session.exercises.some(
			(exercise) =>
				exercise.categorie === "course" || exercise.categorie === "cardio",
		),
	).toBe(true);
	expect(
		session.exercises.some((exercise) => exercise.categorie === "force"),
	).toBe(true);
	for (let index = 1; index < session.exercises.length; index++) {
		expect(session.exercises[index]?.schemaMouvement).not.toBe(
			session.exercises[index - 1]?.schemaMouvement,
		);
	}
	for (const exercise of session.exercises) {
		expect(RANKS[exercise.materiel]).toBeLessThanOrEqual(
			RANKS[session.equipment],
		);
		expect(exercise.volume).toBeGreaterThanOrEqual(1);
		expect(exercise.secondes).toBeGreaterThan(0);
	}
	expect(new Set(session.exercises.map((exercise) => exercise.id)).size).toBe(
		session.exercises.length,
	);
	expect(session.sessionSeconds).toBeLessThanOrEqual(session.timeCapMin * 60);
	expect(session.workSeconds).toBeLessThanOrEqual(session.timeCapMin * 60);
	expect(session.warmupMin).toBe(wodConfig.echauffementMin);
	if (session.race !== "mix") {
		const fromRace = session.exercises.filter((exercise) =>
			exercise.coursesOrigine.includes(session.race),
		).length;
		expect(fromRace / session.exercises.length).toBeGreaterThanOrEqual(
			wodConfig.partCourseInspiration,
		);
	}
	if (session.format === "forTime") {
		expect(session.workSeconds).toBeLessThanOrEqual(
			budgetOf(session, wodConfig),
		);
		expect(session.sessionSeconds).toBe(session.workSeconds);
	}
	if (session.format === "amrap") {
		expect(session.roundSeconds).toBeGreaterThanOrEqual(
			wodConfig.amrapTourMinSec,
		);
		expect(session.roundSeconds).toBeLessThanOrEqual(wodConfig.amrapTourMaxSec);
		expect(session.sessionSeconds).toBe(session.timeCapMin * 60);
	}
	if (session.format === "emom") {
		for (const exercise of session.exercises) {
			expect(exercise.secondes).toBeGreaterThanOrEqual(
				wodConfig.emomTravailMinSec,
			);
			expect(exercise.secondes).toBeLessThanOrEqual(
				wodConfig.emomTravailMaxSec,
			);
		}
		expect(session.stations).toBe(session.timeCapMin);
		expect(session.sessionSeconds).toBe(session.timeCapMin * 60);
	}
	if (session.format === "intervalles") {
		for (const exercise of session.exercises) {
			expect(exercise.secondes).toBeLessThanOrEqual(
				wodConfig.intervallesTravailSec,
			);
		}
		expect(session.restSeconds).toBe(wodConfig.intervallesReposSec);
		expect(session.sessionSeconds).toBeLessThanOrEqual(session.timeCapMin * 60);
	}
}

describe("générateur de WOD (US3.2)", () => {
	it("redonne la même séance pour la même graine", () => {
		const params = input("meme-seance");
		expect(generateWod(params)).toEqual(generateWod(params));
	});

	it("respecte le time cap, les catégories, le mouvement et le matériel sur 1 000 graines", () => {
		const formats = new Set<string>();
		const caps = new Set<number>();
		const inspirations = new Set<string>();
		const equipments = new Set<string>();
		const signatures = new Set<string>();

		for (let seed = 0; seed < 1000; seed++) {
			const session = expectSession(input(String(seed)));
			expectRules(session);
			expect(session.level).toBe("debutant");
			expect(session.exercises.map((exercise) => exercise.id)).not.toContain(
				"sans-temps",
			);
			expect(session.exercises.map((exercise) => exercise.id)).not.toContain(
				"trop-long",
			);
			formats.add(session.format);
			caps.add(session.timeCapMin);
			inspirations.add(session.race);
			equipments.add(session.equipment);
			signatures.add(
				session.exercises.map((exercise) => exercise.id).join(","),
			);
		}

		expect(formats).toEqual(
			new Set(["amrap", "emom", "forTime", "intervalles"]),
		);
		expect(caps).toEqual(new Set([15, 20]));
		expect(inspirations).toEqual(new Set(["alpha", "beta", "mix"]));
		expect(equipments).toEqual(
			new Set(["aucun", "halteresKettlebell", "salleComplete"]),
		);
		expect(signatures.size).toBeGreaterThan(1);
	});

	it("dimensionne AMRAP, EMOM, For Time, Intervalles et Mix", () => {
		const amrap = expectSession(
			input("format-amrap", { locks: { format: "amrap", timeCapMin: 15 } }),
		);
		expect(amrap.format).toBe("amrap");
		expect(amrap.roundSeconds).toBe(config.amrapTourMinSec);
		expect(amrap.sessionSeconds).toBe(15 * 60);
		expect(amrap.warmupMin).toBe(5);

		const emom = expectSession(
			input("format-emom", { locks: { format: "emom", timeCapMin: 20 } }),
		);
		expect(emom.format).toBe("emom");
		expect(emom.stations).toBe(20);
		expect(emom.sessionSeconds).toBe(20 * 60);
		expect(emom.workSeconds).toBe(config.emomTravailMinSec * 20);
		for (const exercise of emom.exercises) {
			expect(exercise.secondes).toBe(config.emomTravailMinSec);
		}

		const forTime = expectSession(
			input("format-for-time", {
				locks: { format: "forTime", timeCapMin: 15 },
			}),
		);
		const budget = budgetOf(forTime);
		expect(forTime.format).toBe("forTime");
		expect(forTime.workSeconds).toBeLessThanOrEqual(budget);
		expect(forTime.workSeconds).toBeGreaterThan(budget - 5);
		expect(forTime.sessionSeconds).toBe(forTime.workSeconds);
		expect(forTime.sessionSeconds).toBeLessThan(15 * 60);

		const intervals = expectSession(
			input("format-intervalles", {
				locks: { format: "intervalles", timeCapMin: 15 },
			}),
		);
		expect(intervals.format).toBe("intervalles");
		expect(intervals.restSeconds).toBe(config.intervallesReposSec);
		expect(intervals.stations).toBe(15);
		expect(intervals.sessionSeconds).toBe(15 * 60);
		for (const exercise of intervals.exercises) {
			expect(exercise.secondes).toBe(config.intervallesTravailSec);
		}

		const mix = expectSession(
			input("format-mix", { locks: { race: "mix", timeCapMin: 15 } }),
		);
		expect(mix.race).toBe("mix");
		expectRules(mix);
	});

	it("compte une course même sans exercice cardio", () => {
		const session = expectSession(
			input("course-seule", {
				races: ["alpha"],
				locks: { race: "alpha", format: "forTime", timeCapMin: 15 },
				exercises: [
					exo({
						id: "course",
						categorie: "course",
						schemaMouvement: "corpsEntier",
						coursesOrigine: ["alpha"],
					}),
					exo({
						id: "squat",
						categorie: "force",
						schemaMouvement: "squat",
						coursesOrigine: ["alpha"],
					}),
					exo({
						id: "pousser",
						categorie: "force",
						schemaMouvement: "pousser",
						coursesOrigine: ["alpha"],
					}),
				],
			}),
		);
		expect(
			session.exercises.some((exercise) => exercise.categorie === "course"),
		).toBe(true);
		expect(
			session.exercises.some((exercise) => exercise.categorie === "cardio"),
		).toBe(false);
	});

	it("écarte un exercice sans temps, et ne le remplace pas par une alternative", () => {
		const timeless = exo({
			id: "sans-temps",
			categorie: "force",
			schemaMouvement: "squat",
			coursesOrigine: ["alpha"],
			secondesParUnite: null,
			alternatives: ["pompes"],
		});
		const onlyTimeless = generateWod(
			input("que-du-vide", {
				races: ["alpha"],
				exercises: [
					exo({
						id: "course",
						categorie: "course",
						schemaMouvement: "corpsEntier",
						coursesOrigine: ["alpha"],
						secondesParUnite: null,
					}),
					exo({
						id: "cardio",
						categorie: "cardio",
						schemaMouvement: "tirer",
						coursesOrigine: ["alpha"],
						secondesParUnite: null,
					}),
					timeless,
				],
			}),
		);
		expect(onlyTimeless.ok).toBe(false);
		if (!onlyTimeless.ok) expect(onlyTimeless.reason).toMatch(/temps/);

		const session = expectSession(
			input("alternative-de-temps", {
				races: ["alpha"],
				locks: {
					race: "alpha",
					format: "forTime",
					timeCapMin: 15,
					equipment: "aucun",
				},
				exercises: [
					exo({
						id: "course",
						categorie: "course",
						schemaMouvement: "corpsEntier",
						coursesOrigine: ["alpha"],
					}),
					exo({
						id: "cardio",
						categorie: "cardio",
						schemaMouvement: "tirer",
						coursesOrigine: ["alpha"],
					}),
					timeless,
					exo({
						id: "pompes",
						categorie: "force",
						schemaMouvement: "pousser",
						coursesOrigine: ["alpha"],
					}),
				],
			}),
		);
		const ids = session.exercises.map((exercise) => exercise.id);
		expect(ids).toContain("pompes");
		expect(ids).not.toContain("sans-temps");
	});

	it("garde un volume qui tient, réduit un volume trop long, et n'emprunte pas un autre niveau", () => {
		const exercises: Exercise[] = [
			exo({
				id: "course",
				categorie: "course",
				schemaMouvement: "corpsEntier",
				coursesOrigine: ["alpha"],
				secondesParUnite: 10,
				volumeParNiveau: { debutant: 2, intermediaire: null, confirme: 4 },
			}),
			exo({
				id: "squat",
				categorie: "force",
				schemaMouvement: "squat",
				coursesOrigine: ["alpha"],
				secondesParUnite: 10,
				volumeParNiveau: { debutant: 2, intermediaire: null, confirme: 4 },
			}),
			exo({
				id: "pousser",
				categorie: "force",
				schemaMouvement: "pousser",
				coursesOrigine: ["alpha"],
				secondesParUnite: 10,
				volumeParNiveau: { debutant: 2, intermediaire: null, confirme: 4 },
			}),
		];
		const locks = {
			race: "alpha",
			format: "forTime" as const,
			timeCapMin: 15 as const,
			equipment: "aucun" as const,
		};
		const debutant = expectSession(
			input("volume-debutant", {
				exercises,
				races: ["alpha"],
				locks: { ...locks, level: "debutant" },
			}),
		);
		expect(debutant.exercises.every((exercise) => exercise.volume === 2)).toBe(
			true,
		);
		expect(debutant.workSeconds).toBe(60);

		const confirme = expectSession(
			input("volume-confirme", {
				exercises,
				races: ["alpha"],
				locks: { ...locks, level: "confirme" },
			}),
		);
		expect(confirme.exercises.every((exercise) => exercise.volume === 4)).toBe(
			true,
		);
		expect(confirme.workSeconds).toBe(120);

		const intermediaire = expectSession(
			input("volume-vide", {
				exercises,
				races: ["alpha"],
				locks: { ...locks, level: "intermediaire" },
			}),
		);
		const budget = budgetOf(intermediaire);
		expect(intermediaire.workSeconds).toBeLessThanOrEqual(budget);
		expect(intermediaire.workSeconds).toBeGreaterThan(budget - 10);
		expect(intermediaire.workSeconds).not.toBe(60);

		const tooLong = exercises.map((exercise) => ({
			...exercise,
			volumeParNiveau: { debutant: 200, intermediaire: 200, confirme: 200 },
		}));
		const shrunk = expectSession(
			input("volume-trop-long", {
				exercises: tooLong,
				races: ["alpha"],
				locks: { ...locks, level: "debutant" },
			}),
		);
		expect(shrunk.workSeconds).toBeLessThanOrEqual(budget);
		expect(shrunk.workSeconds).toBeGreaterThan(budget - 10);
		expect(
			shrunk.exercises.every(
				(exercise) => exercise.volume >= 1 && exercise.volume <= 200,
			),
		).toBe(true);
	});

	it("remplace un exercice par la première alternative qui convient au matériel", () => {
		const session = expectSession(
			input("materiel", {
				races: ["alpha"],
				locks: {
					race: "alpha",
					format: "forTime",
					timeCapMin: 15,
					equipment: "aucun",
				},
				exercises: [
					exo({
						id: "course",
						categorie: "course",
						schemaMouvement: "corpsEntier",
						coursesOrigine: ["alpha"],
					}),
					exo({
						id: "cardio",
						categorie: "cardio",
						schemaMouvement: "tirer",
						coursesOrigine: ["alpha"],
					}),
					exo({
						id: "sled",
						categorie: "force",
						schemaMouvement: "pousser",
						coursesOrigine: ["alpha"],
						materiel: "salleComplete",
						secondesParUnite: 5,
						alternatives: ["sans-temps", "pompes"],
					}),
					exo({
						id: "sans-temps",
						categorie: "force",
						schemaMouvement: "squat",
						coursesOrigine: ["alpha"],
						secondesParUnite: null,
					}),
					exo({
						id: "pompes",
						categorie: "force",
						schemaMouvement: "pousser",
						coursesOrigine: ["alpha"],
					}),
				],
			}),
		);
		const ids = session.exercises.map((exercise) => exercise.id);
		expect(ids).toContain("pompes");
		expect(ids).not.toContain("sled");
		expect(ids).not.toContain("sans-temps");
		expect(
			session.exercises.every((exercise) => exercise.materiel === "aucun"),
		).toBe(true);
	});

	it("exige 70 % d'une course, et aucune limite pour Mix", () => {
		const exercises = [
			exo({
				id: "a-course",
				categorie: "course",
				schemaMouvement: "corpsEntier",
				coursesOrigine: ["alpha"],
			}),
			exo({
				id: "a-force",
				categorie: "force",
				schemaMouvement: "squat",
				coursesOrigine: ["alpha"],
			}),
			exo({
				id: "b-force",
				categorie: "force",
				schemaMouvement: "pousser",
				coursesOrigine: ["beta"],
			}),
		];
		const locks = {
			format: "forTime" as const,
			timeCapMin: 15 as const,
			equipment: "aucun" as const,
		};
		const alpha = generateWod(
			input("quota-alpha", {
				exercises,
				races: ["alpha", "beta"],
				locks: { ...locks, race: "alpha" },
			}),
		);
		expect(alpha.ok).toBe(false);

		const mix = expectSession(
			input("quota-mix", {
				exercises,
				races: ["alpha", "beta"],
				locks: { ...locks, race: "mix" },
			}),
		);
		expect(mix.race).toBe("mix");
		expect(
			mix.exercises.some((exercise) =>
				exercise.coursesOrigine.includes("alpha"),
			),
		).toBe(true);
		expect(
			mix.exercises.some((exercise) =>
				exercise.coursesOrigine.includes("beta"),
			),
		).toBe(true);
	});

	it("fige un verrou et retire le reste avec une autre graine", () => {
		const caps = new Set<number>();
		for (let seed = 0; seed < 40; seed++) {
			const session = expectSession(
				input(`verrou-${seed}`, { locks: { format: "emom" } }),
			);
			expect(session.format).toBe("emom");
			caps.add(session.timeCapMin);
		}
		expect(caps).toEqual(new Set([15, 20]));
	});

	it("lit le plafond For Time dans la config", () => {
		const tight: WodConfig = { ...config, forTimePartMax: 0.5 };
		const session = expectSession(
			input("config", {
				config: tight,
				locks: { format: "forTime", timeCapMin: 20 },
			}),
		);
		const budget = budgetOf(session, tight);
		expect(budget).toBe(600);
		expect(session.workSeconds).toBeLessThanOrEqual(budget);
		expect(session.workSeconds).toBeGreaterThan(budget - 5);
	});

	it("n'appelle pas Math.random", () => {
		const source = readFileSync(new URL("./wod.ts", import.meta.url), "utf8");
		expect(source.includes("Math.random")).toBe(false);
	});
});
