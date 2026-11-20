import { describe, expect, it } from "vitest";
import { type DataFile, validateDataFiles } from "./data-validation.ts";

const race = {
	slug: "hyrox-open",
	nom: "HYROX Open solo",
	organisateur: "HYROX",
	typeCourse: "hybride",
	siteOfficiel: "https://hyrox.com",
	categorieNotee: "Open",
	formats: ["solo"],
	dureeMoyenneMin: 90,
	deroule: [
		{ type: "course", distanceM: 1000 },
		{ type: "exercice", nom: "SkiErg", volume: 1000, unite: "metres" },
	],
	bareme: {
		partageEffort: 1,
		course: { distanceM: 8000 },
		force: {
			chargeLibreMaxKg: { homme: 24, femme: 16 },
			sledKg: { homme: 152, femme: 102 },
			barre: "aucune",
		},
		cardio: { ergoM: 2000, dureeEffortMin: 90 },
		gym: { mouvementLePlusTechnique: "wallBalls" },
	},
	pourQui: "Pour qui court déjà 5 km.",
	saison: "2026/27",
	sourceDates: "hyrox",
	sources: ["https://hyrox.com/rulebook"],
};

const eventFile = {
	source: "hyrox",
	verifieLe: "2026-10-23T03:00:00+02:00",
	courses: ["hyrox-open"],
	evenements: [
		{
			course: "hyrox-open",
			date: "2027-03-12",
			dateFin: "2027-03-14",
			ville: "Paris",
			pays: "FR",
			lienInscription: "https://hyrox.com/event/paris",
		},
	],
};

const exercises = [
	{
		id: "rameur",
		nom: "Rameur",
		coursesOrigine: ["hyrox-open"],
		categorie: "cardio",
		schemaMouvement: "tirer",
		materiel: "salleComplete",
		unite: "metres",
		volumeParNiveau: { debutant: 250, intermediaire: 500, confirme: 750 },
		secondesParUnite: 0.25,
		consigne: "Pousse avec les jambes, puis tire avec les bras.",
		alternatives: ["burpees"],
	},
	{
		id: "burpees",
		nom: "Burpees",
		coursesOrigine: ["hyrox-open"],
		categorie: "gym",
		schemaMouvement: "corpsEntier",
		materiel: "aucun",
		unite: "repetitions",
		volumeParNiveau: { debutant: 8, intermediaire: 12, confirme: 16 },
		secondesParUnite: 4,
		consigne: "Poitrine au sol, puis saut bras tendus.",
		alternatives: [],
	},
];

const json = (data: unknown) => JSON.stringify(data);
const validFiles = (): DataFile[] => [
	{ path: "data/races/hyrox-open.json", content: json(race) },
	{ path: "data/events/hyrox.json", content: json(eventFile) },
	{ path: "data/exercises.json", content: json(exercises) },
];

/** Remplace un fichier du jeu valide et renvoie les erreurs. */
function errorsWith(path: string, data: unknown): string[] {
	return validateDataFiles(
		validFiles().map((file) =>
			file.path === path ? { path, content: json(data) } : file,
		),
	);
}

describe("validateDataFiles", () => {
	it("accepte un jeu de données valide", () => {
		expect(validateDataFiles(validFiles())).toEqual([]);
	});

	it("accepte un dossier data/ vide", () => {
		expect(validateDataFiles([])).toEqual([]);
	});

	describe("course", () => {
		it("nomme le champ fautif, même imbriqué", () => {
			const bad = {
				...race,
				bareme: { ...race.bareme, course: { distanceM: "8 km" } },
			};
			const [error] = errorsWith("data/races/hyrox-open.json", bad);
			expect(error).toMatch(
				/^data\/races\/hyrox-open\.json → bareme\.course\.distanceM : /,
			);
		});

		it("signale un champ obligatoire manquant", () => {
			const { organisateur: _, ...bad } = race;
			expect(errorsWith("data/races/hyrox-open.json", bad)).toContainEqual(
				expect.stringMatching(/→ organisateur : /),
			);
		});

		it("refuse un format de participation inconnu", () => {
			const errors = errorsWith("data/races/hyrox-open.json", {
				...race,
				formats: ["trio"],
			});
			expect(errors).toContainEqual(expect.stringMatching(/→ formats\.0 : /));
		});

		it("refuse des notes saisies à la main", () => {
			const errors = errorsWith("data/races/hyrox-open.json", {
				...race,
				notes: { course: 5 },
			});
			expect(errors).toContainEqual(
				expect.stringContaining("→ notes : les notes sont calculées"),
			);
		});

		it("refuse un champ inconnu", () => {
			const errors = errorsWith("data/races/hyrox-open.json", {
				...race,
				prix: 120,
			});
			expect(errors).toContainEqual(expect.stringContaining('"prix"'));
		});

		it("exige que le slug corresponde au nom du fichier", () => {
			const errors = validateDataFiles([
				{ path: "data/races/hyrox.json", content: json(race) },
			]);
			expect(errors).toContainEqual(
				expect.stringMatching(/hyrox\.json → slug : /),
			);
		});

		it("vérifie le format de la saison", () => {
			const errors = errorsWith("data/races/hyrox-open.json", {
				...race,
				saison: "26/27",
			});
			expect(errors).toContainEqual(
				expect.stringContaining(
					"→ saison : saison attendue au format 2026/27 ou 2027",
				),
			);
		});
	});

	describe("événements", () => {
		const withEvent = (patch: object) => ({
			...eventFile,
			evenements: [{ ...eventFile.evenements[0], ...patch }],
		});

		it("refuse une date invalide", () => {
			const errors = errorsWith(
				"data/events/hyrox.json",
				withEvent({ date: "2027-02-30" }),
			);
			expect(errors).toContainEqual(
				expect.stringMatching(/→ evenements\.0\.date : /),
			);
		});

		it("refuse un pays hors de la zone", () => {
			const errors = errorsWith(
				"data/events/hyrox.json",
				withEvent({ pays: "US" }),
			);
			expect(errors).toContainEqual(
				expect.stringMatching(/→ evenements\.0\.pays : /),
			);
		});

		it("refuse une date de fin avant la date de début", () => {
			const errors = errorsWith(
				"data/events/hyrox.json",
				withEvent({ dateFin: "2027-03-01" }),
			);
			expect(errors).toContainEqual(
				expect.stringContaining("→ evenements.0.dateFin : la date de fin"),
			);
		});

		it("refuse un lien d'inscription invalide", () => {
			const errors = errorsWith(
				"data/events/hyrox.json",
				withEvent({ lienInscription: "hyrox paris" }),
			);
			expect(errors).toContainEqual(
				expect.stringMatching(/→ evenements\.0\.lienInscription : /),
			);
		});

		it("refuse un événement d'une course inconnue", () => {
			const errors = errorsWith(
				"data/events/hyrox.json",
				withEvent({ course: "hyrox-pro" }),
			);
			expect(errors).toContainEqual(
				expect.stringContaining(
					"evenements.0.course : course « hyrox-pro » introuvable",
				),
			);
		});

		it("refuse un événement d'une course non listée dans « courses »", () => {
			const errors = errorsWith("data/events/hyrox.json", {
				...eventFile,
				courses: ["autre"],
			});
			expect(errors).toContainEqual(
				expect.stringContaining(
					"→ evenements.0.course : « hyrox-open » doit figurer dans « courses »",
				),
			);
			expect(errors).toContainEqual(
				expect.stringContaining("→ courses.0 : course « autre » introuvable"),
			);
		});

		it("applique le même schéma aux saisies manuelles", () => {
			const files = [
				...validFiles(),
				{
					path: "data/events-manual/xenom.json",
					content: json({ source: "manuel" }),
				},
			];
			expect(validateDataFiles(files)).toContainEqual(
				expect.stringMatching(/xenom\.json → verifieLe : /),
			);
		});
	});

	describe("exercices", () => {
		it("exige une alternative pour un exercice avec matériel", () => {
			const bad = [{ ...exercises[0], alternatives: [] }, exercises[1]];
			expect(errorsWith("data/exercises.json", bad)).toContainEqual(
				expect.stringContaining("→ 0.alternatives : au moins une alternative"),
			);
		});

		it("refuse une alternative introuvable ou qui demande autant de matériel", () => {
			const bad = [
				{ ...exercises[0], alternatives: ["sled", "rameur"] },
				exercises[1],
			];
			const errors = errorsWith("data/exercises.json", bad);
			expect(errors).toContainEqual(
				expect.stringContaining(
					"→ 0.alternatives.0 : exercice « sled » introuvable",
				),
			);
			expect(errors).toContainEqual(
				expect.stringContaining(
					"→ 0.alternatives.1 : « rameur » doit demander moins",
				),
			);
		});

		it("refuse un identifiant en double", () => {
			const bad = [exercises[1], exercises[1]];
			expect(errorsWith("data/exercises.json", bad)).toContainEqual(
				expect.stringContaining("→ 1.id : identifiant"),
			);
		});

		it("refuse un niveau manquant dans les volumes", () => {
			const bad = [
				exercises[1],
				{ ...exercises[0], volumeParNiveau: { debutant: 250 } },
			];
			expect(errorsWith("data/exercises.json", bad)).toContainEqual(
				expect.stringMatching(/→ 1\.volumeParNiveau\.intermediaire : /),
			);
		});
	});

	it("signale un JSON mal formé avec le nom du fichier", () => {
		const errors = validateDataFiles([
			{ path: "data/races/cassé.json", content: "{ nom: " },
		]);
		expect(errors).toEqual([
			expect.stringMatching(/^data\/races\/cassé\.json : JSON invalide/),
		]);
	});
});
