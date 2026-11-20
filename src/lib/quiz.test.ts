import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { mergeEvents } from "./dates.ts";
import {
	attentionCategory,
	categoryGaps,
	closestCategories,
	explainQuiz,
	PROFILE_LEVELS,
	parseQuizSearch,
	profileFromAnswers,
	QUIZ_QUESTIONS,
	type QuizCandidate,
	type QuizFacts,
	type QuizProfile,
	rankRaces,
	serializeQuizSearch,
	toQuizCandidate,
	toQuizFacts,
} from "./quiz.ts";
import {
	baremeConfigSchema,
	eventFileSchema,
	type QuizConfig,
	quizConfigSchema,
	type RaceEvent,
	raceSchema,
} from "./schemas.ts";

const readJson = (path: string) =>
	JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), "utf8"));
const config = quizConfigSchema.parse(readJson("data/config/quiz.json"));

const TODAY = "2026-11-20";

function candidate(
	slug: string,
	notes: [number | null, number | null, number | null, number | null],
	formats: QuizCandidate["formats"] = ["solo"],
	nom = slug,
): QuizCandidate {
	return {
		slug,
		nom,
		formats,
		notes: {
			course: notes[0],
			force: notes[1],
			cardio: notes[2],
			gym: notes[3],
		},
	};
}

function dated(
	course: string,
	date: string,
	pays: RaceEvent["pays"] = "FR",
	dateFin?: string,
): RaceEvent {
	return {
		course,
		date,
		...(dateFin ? { dateFin } : {}),
		ville: "Ville",
		pays,
		lienInscription: "https://exemple.fr",
	};
}

const profile: QuizProfile = {
	course: 3,
	force: 3,
	cardio: 3,
	gym: 3,
	format: "solo",
	objectif: "kiffer",
	zone: "france",
};

function scores(
	races: QuizCandidate[],
	events: RaceEvent[] = [],
	patch: Partial<typeof profile> = {},
	quiz: QuizConfig = config,
) {
	return rankRaces({ ...profile, ...patch }, races, events, quiz, TODAY);
}

describe("réponses des questions", () => {
	it("reprend les niveaux du §7", () => {
		expect(PROFILE_LEVELS.course).toEqual({
			pasEncore: 2,
			faisable: 3,
			facile: 4,
			plusLoin: 5,
		});
		expect(PROFILE_LEVELS.force).toEqual({
			jamais: 1,
			unPeu: 2,
			regulierement: 3,
			barreLourde: 5,
		});
		expect(PROFILE_LEVELS.cardio).toEqual({
			jamais: 1,
			parfois: 2,
			souvent: 4,
			endurance: 5,
		});
		expect(PROFILE_LEVELS.gym).toEqual({
			aucun: 1,
			burpees: 2,
			boxJumps: 3,
			tractions: 4,
			muscleUp: 5,
		});
	});
});

describe("questions affichées", () => {
	it("reprend les 7 questions du §7, dans l'ordre, mot pour mot", () => {
		expect(QUIZ_QUESTIONS.map((question) => question.prompt)).toEqual([
			"Courir 5 km sans t'arrêter, c'est…",
			"Les charges (kettlebell, haltères, sled)…",
			"Rameur, SkiErg, vélo…",
			"Le mouvement le plus technique que tu maîtrises",
			"Tu te vois courir…",
			"Ton objectif",
			"Jusqu'où es-tu prêt·e à aller ?",
		]);
		expect(
			QUIZ_QUESTIONS.map((question) =>
				question.options.map((option) => option.label),
			),
		).toEqual([
			[
				"Pas encore possible",
				"Faisable mais dur",
				"Facile",
				"Je cours plus loin régulièrement",
			],
			[
				"Jamais touché",
				"Un peu en salle",
				"Régulièrement",
				"Je fais de la barre lourde",
			],
			[
				"Jamais",
				"De temps en temps",
				"Souvent, 20 min et plus",
				"Gros moteur d'endurance",
			],
			[
				"Aucun de ceux-là",
				"Burpees",
				"Box jumps",
				"Tractions ou toes-to-bar",
				"Muscle-up",
			],
			["Seul·e", "À deux", "En équipe", "Peu importe"],
			["Finir et kiffer", "Me tester sur un chrono", "Me mesurer aux autres"],
			["France uniquement", "France et pays frontaliers", "Peu importe"],
		]);
	});
});

describe("réponses dans l'adresse", () => {
	const answers = {
		course: "faisable",
		force: "regulierement",
		cardio: "souvent",
		gym: "boxJumps",
		format: "duo",
		objectif: "chrono",
		zone: "frontaliers",
	};

	it("ignore une valeur inconnue et une étape hors limites", () => {
		const params = new URLSearchParams(
			"course=faisable&force=n-importe&etape=8&objectif=chrono",
		);
		expect(parseQuizSearch(params)).toEqual({
			answers: {
				course: "faisable",
				force: null,
				cardio: null,
				gym: null,
				format: null,
				objectif: "chrono",
				zone: null,
			},
			etape: null,
		});
	});

	it("retrouve les mêmes réponses après un aller-retour", () => {
		const parsed = parseQuizSearch(serializeQuizSearch(answers, 3));
		expect(parsed.answers).toEqual(answers);
		expect(parsed.etape).toBe(3);
	});

	it("omet l'étape 1 tant que le quiz n'est pas fini, et l'enlève du résultat", () => {
		expect(
			serializeQuizSearch({ ...answers, zone: null }, 1).has("etape"),
		).toBe(false);
		expect(serializeQuizSearch(answers, 1).get("etape")).toBe("1");
		expect(serializeQuizSearch(answers, null).has("etape")).toBe(false);
	});

	it("ne construit le profil que lorsque les 7 réponses sont là", () => {
		expect(profileFromAnswers({ ...answers, zone: null })).toBeNull();
		expect(profileFromAnswers(answers)).toEqual({
			course: 3,
			force: 3,
			cardio: 4,
			gym: 3,
			format: "duo",
			objectif: "chrono",
			zone: "frontaliers",
		});
	});
});

describe("formule de scoring", () => {
	const same = candidate("meme", [3, 3, 3, 3]);
	const inFrance = [dated("meme", "2027-06-01")];

	it("donne 100 % quand la course est au niveau du profil et a une date dans la zone", () => {
		expect(scores([same], inFrance)).toEqual([
			{ slug: "meme", nom: "meme", score: 100, prochaineDate: "2027-06-01" },
		]);
	});

	it("punit un écart positif au carré : +1 → 84 %, +2 → 36 %", () => {
		expect(
			scores([candidate("un", [4, 3, 3, 3])], [dated("un", "2027-06-01")]),
		).toEqual([
			{ slug: "un", nom: "un", score: 84, prochaineDate: "2027-06-01" },
		]);
		expect(
			scores([candidate("deux", [5, 3, 3, 3])], [dated("deux", "2027-06-01")]),
		).toEqual([
			{ slug: "deux", nom: "deux", score: 36, prochaineDate: "2027-06-01" },
		]);
	});

	it("punit un écart négatif selon l'objectif : kiffer 96 %, chrono 92 %, se mesurer 84 %", () => {
		const easy = candidate("facile", [1, 3, 3, 3]);
		const events = [dated("facile", "2027-06-01")];
		expect(scores([easy], events, { objectif: "kiffer" })[0]?.score).toBe(96);
		expect(scores([easy], events, { objectif: "chrono" })[0]?.score).toBe(92);
		expect(scores([easy], events, { objectif: "mesurer" })[0]?.score).toBe(84);
	});

	it("additionne les pénalités des 4 catégories", () => {
		// Course +1 → 2 ; force −2 et kiffer → 0,5. Total 2,5 → 100 − 20 = 80.
		const mixed = candidate("mix", [4, 1, 3, 3]);
		expect(scores([mixed], [dated("mix", "2027-06-01")])[0]?.score).toBe(80);
	});

	it("borne le score à 0 %", () => {
		const hard = candidate("dur", [5, 5, 5, 5]);
		expect(scores([hard], [dated("dur", "2027-06-01")])[0]?.score).toBe(0);
	});

	it("lit le multiplicateur dans la config", () => {
		const harder: QuizConfig = {
			...config,
			ecartPositif: { ...config.ecartPositif, multiplicateur: 4 },
		};
		// Écart +1 avec multiplicateur 4 → pénalité 4 → 100 − 32 = 68 (84 avec le 2 de la config).
		expect(
			scores(
				[candidate("un", [4, 3, 3, 3])],
				[dated("un", "2027-06-01")],
				{},
				harder,
			)[0]?.score,
		).toBe(68);
	});

	it("exclut une course dont une note manque", () => {
		expect(scores([candidate("trou", [3, 3, null, 3])], [])).toEqual([]);
	});

	it("exclut une course qui ne propose pas le format, et garde « peu importe »", () => {
		const solo = candidate("solo", [3, 3, 3, 3], ["solo"]);
		const duo = candidate("duo", [3, 3, 3, 3], ["duo"]);
		expect(
			scores([solo, duo], [], { format: "duo" }).map((race) => race.slug),
		).toEqual(["duo"]);
		expect(
			scores([solo, duo], [], { format: "peuImporte" }).map(
				(race) => race.slug,
			),
		).toEqual(["duo", "solo"]);
	});

	it("compte le relais comme une équipe", () => {
		const relay = candidate("relais", [3, 3, 3, 3], ["relais"]);
		const team = candidate("equipe", [3, 3, 3, 3], ["equipe"]);
		const solo = candidate("solo", [3, 3, 3, 3], ["solo"]);
		expect(
			scores([relay, team, solo], [], { format: "equipe" }).map(
				(race) => race.slug,
			),
		).toEqual(["equipe", "relais"]);
	});

	it("ajoute 3 si aucune date ne tombe dans la zone sur 12 mois", () => {
		expect(scores([same], [])[0]?.score).toBe(76);
		expect(
			scores([same], [dated("meme", "2027-01-15", "GB")], { zone: "france" })[0]
				?.score,
		).toBe(76);
		expect(
			scores([same], [dated("meme", "2027-01-15", "BE")], {
				zone: "frontaliers",
			})[0]?.score,
		).toBe(100);
		expect(
			scores([same], [dated("meme", "2027-01-15", "GB")], {
				zone: "peuImporte",
			})[0]?.score,
		).toBe(100);
		expect(
			scores([same], [dated("meme", "2027-01-15", "GB")], {
				zone: "frontaliers",
			})[0]?.score,
		).toBe(76);
	});

	it("compte une date au dernier jour de la fenêtre, pas le jour d'après", () => {
		expect(scores([same], [dated("meme", "2027-11-20")])[0]?.score).toBe(100);
		expect(scores([same], [dated("meme", "2027-11-21")])[0]).toMatchObject({
			score: 76,
			prochaineDate: "2027-11-21",
		});
	});

	it("compte un événement déjà commencé dont le dernier jour n'est pas passé", () => {
		expect(
			scores([same], [dated("meme", "2026-11-01", "FR", "2026-11-20")])[0]
				?.score,
		).toBe(100);
		expect(scores([same], [dated("meme", "2026-11-19")])[0]?.score).toBe(76);
	});

	it("à score égal, la prochaine date la plus proche passe devant", () => {
		const soon = candidate("tot", [3, 3, 3, 3], ["solo"], "Tôt");
		const late = candidate("tard", [3, 3, 3, 3], ["solo"], "Tard");
		expect(
			scores(
				[late, soon],
				[dated("tard", "2027-08-01"), dated("tot", "2027-03-01")],
			).map((race) => race.slug),
		).toEqual(["tot", "tard"]);
	});

	it("à score égal, une course sans date passe après celle qui en a une", () => {
		// « loin » : écart −3 et objectif « me mesurer » → pénalité 3, avec une date.
		// « pile » : écart 0, sans date → pénalité 3 aussi. Même score, la date départage.
		const exact = candidate("pile", [5, 3, 3, 3], ["solo"], "Pile");
		const easier = candidate("loin", [2, 3, 3, 3], ["solo"], "Loin");
		expect(
			scores([exact, easier], [dated("loin", "2027-08-01")], {
				course: 5,
				objectif: "mesurer",
			}).map((race) => race.slug),
		).toEqual(["loin", "pile"]);
	});

	it("à date égale, le nom en français départage", () => {
		const mile = candidate("mile", [3, 3, 3, 3], ["solo"], "DEKA MILE");
		const strong = candidate("strong", [3, 3, 3, 3], ["solo"], "DEKA STRONG");
		expect(
			scores(
				[strong, mile],
				[dated("strong", "2026-11-29"), dated("mile", "2026-11-29")],
			).map((race) => race.nom),
		).toEqual(["DEKA MILE", "DEKA STRONG"]);
	});
});

// Date figée : les scores dépendent des dates à venir. Le 20 novembre 2026,
// les dates chargées sont encore toutes devant nous.
const JOUR = "2026-11-20";
const bareme = baremeConfigSchema.parse(readJson("data/config/bareme.json"));

const readDir = (dir: string) =>
	readdirSync(new URL(`../../${dir}`, import.meta.url)).filter((name) =>
		name.endsWith(".json"),
	);

const catalog = readDir("data/races").map((file) =>
	toQuizCandidate(raceSchema.parse(readJson(`data/races/${file}`)), bareme),
);
const events = mergeEvents(
	readDir("data/events").map((file) =>
		eventFileSchema.parse(readJson(`data/events/${file}`)),
	),
	readDir("data/events-manual").map((file) =>
		eventFileSchema.parse(readJson(`data/events-manual/${file}`)),
	),
);

const levels = PROFILE_LEVELS;

function ranking(profile: QuizProfile): [string, number][] {
	return rankRaces(profile, catalog, events, config, JOUR).map(
		(race): [string, number] => [race.slug, race.score],
	);
}

/** Huit courses solo notées, toutes à 0 % : l'ordre est celui des prochaines dates. */
const plancherSolo = [
	["deka-fit", 0],
	["deka-mile", 0],
	["deka-strong", 0],
	["hyrox-open", 0],
	["athx", 0],
	["hybrid-games", 0],
	["deadly-dozen", 0],
	["spartan-sprint", 0],
];

describe("profils de référence (§7)", () => {
	const duoChrono: QuizProfile = {
		course: levels.course.faisable,
		force: levels.force.regulierement,
		cardio: levels.cardio.souvent,
		gym: levels.gym.boxJumps,
		format: "duo",
		objectif: "chrono",
		zone: "frontaliers",
	};

	it("relie les libellés des questions au profil « à deux, chrono »", () => {
		expect(
			profileFromAnswers({
				course: "faisable",
				force: "regulierement",
				cardio: "souvent",
				gym: "boxJumps",
				format: "duo",
				objectif: "chrono",
				zone: "frontaliers",
			}),
		).toEqual(duoChrono);
	});

	it("course 3, force 3, cardio 4, gym 3, à deux, chrono : Deadly Dozen en tête", () => {
		expect(ranking(duoChrono)).toEqual([
			["deadly-dozen", 100],
			["deka-mile", 64],
			["deka-strong", 60],
			["deka-fit", 52],
			["hybrid-games", 44],
			["athx", 32],
			["hyrox-doubles", 12],
		]);
	});

	it("garde Deadly Dozen en tête quelle que soit la zone", () => {
		expect(ranking({ ...duoChrono, zone: "france" })[0]).toEqual([
			"deadly-dozen",
			76,
		]);
		expect(ranking({ ...duoChrono, zone: "peuImporte" })[0]).toEqual([
			"deadly-dozen",
			100,
		]);
	});

	const neCourtPas: QuizProfile = {
		course: levels.course.pasEncore,
		force: levels.force.regulierement,
		cardio: levels.cardio.jamais,
		gym: levels.gym.aucun,
		format: "solo",
		objectif: "kiffer",
		zone: "frontaliers",
	};

	it("ne court pas, force 3, seul·e, kiffer : le plancher, pas DEKA STRONG en tête", () => {
		expect(ranking(neCourtPas)).toEqual(plancherSolo);
	});

	it("avec course 2 et force 3, DEKA MILE devance toujours DEKA STRONG", () => {
		const zones = ["france", "frontaliers", "peuImporte"] as const;
		for (const cardio of Object.values(levels.cardio)) {
			for (const gym of Object.values(levels.gym)) {
				for (const zone of zones) {
					const ranked = ranking({
						...neCourtPas,
						cardio,
						gym,
						zone,
					});
					const mile = ranked.findIndex(([slug]) => slug === "deka-mile");
					const strong = ranked.findIndex(([slug]) => slug === "deka-strong");
					expect(mile).toBeGreaterThanOrEqual(0);
					expect(strong).toBeGreaterThan(mile);
					expect(ranked[mile]?.[1]).toBeGreaterThanOrEqual(
						ranked[strong]?.[1] ?? 0,
					);
				}
			}
		}
	});
});

describe("profils complémentaires", () => {
	it("débutant total : tout au minimum, solo, kiffer, France", () => {
		expect(
			ranking({
				course: levels.course.pasEncore,
				force: levels.force.jamais,
				cardio: levels.cardio.jamais,
				gym: levels.gym.aucun,
				format: "solo",
				objectif: "kiffer",
				zone: "france",
			}),
		).toEqual(plancherSolo);
	});

	it("coureur pur : court loin, jamais de charge, d'ergo ni de gym, solo, France", () => {
		expect(
			ranking({
				course: levels.course.plusLoin,
				force: levels.force.jamais,
				cardio: levels.cardio.jamais,
				gym: levels.gym.aucun,
				format: "solo",
				objectif: "kiffer",
				zone: "france",
			}),
		).toEqual(plancherSolo);
	});

	it("force : barre lourde, ergo souvent, tractions, chrono", () => {
		expect(
			ranking({
				course: levels.course.faisable,
				force: levels.force.barreLourde,
				cardio: levels.cardio.souvent,
				gym: levels.gym.tractions,
				format: "solo",
				objectif: "chrono",
				zone: "peuImporte",
			}),
		).toEqual([
			["athx", 92],
			["deadly-dozen", 88],
			["deka-mile", 76],
			["hybrid-games", 76],
			["spartan-sprint", 76],
			["deka-strong", 72],
			["deka-fit", 64],
			["hyrox-open", 24],
		]);
	});

	it("duo : court facilement, force régulière, ergo souvent, burpees", () => {
		expect(
			ranking({
				course: levels.course.facile,
				force: levels.force.regulierement,
				cardio: levels.cardio.souvent,
				gym: levels.gym.burpees,
				format: "duo",
				objectif: "kiffer",
				zone: "peuImporte",
			}),
		).toEqual([
			["deka-fit", 98],
			["deka-mile", 94],
			["deka-strong", 92],
			["deadly-dozen", 82],
			["hybrid-games", 68],
			["hyrox-doubles", 66],
			["athx", 34],
		]);
	});

	it("équipe : niveau intermédiaire, kiffer, France (le relais compte)", () => {
		expect(
			ranking({
				course: levels.course.faisable,
				force: levels.force.regulierement,
				cardio: levels.cardio.parfois,
				gym: levels.gym.burpees,
				format: "equipe",
				objectif: "kiffer",
				zone: "france",
			}),
		).toEqual([
			["deka-fit", 44],
			["deadly-dozen", 0],
			["spartan-sprint", 0],
		]);
	});

	it("compétition : tout à 5, se mesurer, peu importe le format et la zone", () => {
		expect(
			ranking({
				course: levels.course.plusLoin,
				force: levels.force.barreLourde,
				cardio: levels.cardio.endurance,
				gym: levels.gym.muscleUp,
				format: "peuImporte",
				objectif: "mesurer",
				zone: "peuImporte",
			}),
		).toEqual([
			["hyrox-open", 60],
			["hybrid-games", 60],
			["spartan-sprint", 60],
			["hyrox-doubles", 52],
			["athx", 52],
			["deadly-dozen", 44],
			["deka-fit", 36],
			["deka-mile", 20],
			["deka-strong", 12],
		]);
	});

	it("laisse Turf Games et XENOM hors classement tant qu'une note manque", () => {
		const slugs = ranking({
			course: levels.course.plusLoin,
			force: levels.force.barreLourde,
			cardio: levels.cardio.endurance,
			gym: levels.gym.muscleUp,
			format: "peuImporte",
			objectif: "mesurer",
			zone: "peuImporte",
		}).map(([slug]) => slug);
		expect(slugs).toHaveLength(9);
		expect(slugs).not.toContain("turf-games");
		expect(slugs).not.toContain("xenom");
	});
});

const facts = readDir("data/races").map((file) =>
	toQuizFacts(raceSchema.parse(readJson(`data/races/${file}`)), bareme),
);

function explanation(profile: QuizProfile) {
	return explainQuiz(
		profile,
		rankRaces(profile, facts, events, config, JOUR),
		facts,
		config,
	);
}

describe("écarts expliqués", () => {
	const gaps = categoryGaps(
		{ course: 3, force: 3, cardio: 3, gym: 3 },
		{ course: 1, force: 3, cardio: 4, gym: 5 },
	);

	it("calcule l'écart signé note − profil", () => {
		expect(gaps).toEqual([
			{ category: "course", ecart: -2 },
			{ category: "force", ecart: 0 },
			{ category: "cardio", ecart: 1 },
			{ category: "gym", ecart: 2 },
		]);
	});

	it("garde les 2 plus petits écarts absolus, et l'ordre du barème à égalité", () => {
		expect(closestCategories(gaps)).toEqual(["force", "cardio"]);
		expect(
			closestCategories([
				{ category: "gym", ecart: 1 },
				{ category: "course", ecart: -1 },
				{ category: "force", ecart: 0 },
				{ category: "cardio", ecart: 3 },
			]),
		).toEqual(["force", "course"]);
	});

	it("pointe le plus gros écart positif, et rien s'il n'y en a pas", () => {
		expect(attentionCategory(gaps)).toBe("gym");
		expect(
			attentionCategory([
				{ category: "force", ecart: 2 },
				{ category: "course", ecart: 2 },
				{ category: "cardio", ecart: -1 },
				{ category: "gym", ecart: 0 },
			]),
		).toBe("course");
		expect(
			attentionCategory([
				{ category: "course", ecart: 0 },
				{ category: "force", ecart: -1 },
				{ category: "cardio", ecart: 0 },
				{ category: "gym", ecart: -2 },
			]),
		).toBeNull();
	});
});

describe("résultat (§7)", () => {
	const duoChrono: QuizProfile = {
		course: levels.course.faisable,
		force: levels.force.regulierement,
		cardio: levels.cardio.souvent,
		gym: levels.gym.boxJumps,
		format: "duo",
		objectif: "chrono",
		zone: "frontaliers",
	};

	it("recommande Deadly Dozen et DEKA MILE, pas DEKA STRONG à 60 %", () => {
		expect(explanation(duoChrono)).toEqual({
			plancher: false,
			course: {
				slug: "deadly-dozen",
				nom: "Deadly Dozen",
				score: 100,
				prochaineDate: expect.any(String),
				pourquoi: ["course", "force"],
				pointAttention: null,
			},
			alternative: {
				slug: "deka-mile",
				nom: "DEKA MILE",
				score: 64,
				prochaineDate: expect.any(String),
			},
		});
	});

	it("sous 40 %, montre la plus accessible et le message de plancher", () => {
		const result = explanation({
			course: levels.course.pasEncore,
			force: levels.force.regulierement,
			cardio: levels.cardio.jamais,
			gym: levels.gym.aucun,
			format: "solo",
			objectif: "kiffer",
			zone: "frontaliers",
		});
		expect(result?.plancher).toBe(true);
		expect(result?.alternative).toBeNull();
		expect(result?.course).toMatchObject({
			slug: "deka-strong",
			nom: "DEKA STRONG",
			score: 0,
			pourquoi: ["force", "course"],
			pointAttention: "cardio",
		});
	});

	it("saute une alternative du même organisateur, et ignore un score de 60 %", () => {
		const notes = { course: 3, force: 3, cardio: 3, gym: 3 };
		const races: QuizFacts[] = [
			{
				slug: "a",
				nom: "A",
				organisateur: "Même",
				formats: ["solo"],
				notes,
				noteGlobale: 3,
			},
			{
				slug: "b",
				nom: "B",
				organisateur: "Même",
				formats: ["solo"],
				notes,
				noteGlobale: 2,
			},
			{
				slug: "c",
				nom: "C",
				organisateur: "Autre",
				formats: ["solo"],
				notes,
				noteGlobale: 4,
			},
		];
		const ranked = [
			{ slug: "a", nom: "A", score: 90, prochaineDate: "2027-01-01" },
			{ slug: "b", nom: "B", score: 80, prochaineDate: "2027-02-01" },
			{ slug: "c", nom: "C", score: 70, prochaineDate: "2027-03-01" },
		];
		const profile: QuizProfile = {
			course: 3,
			force: 3,
			cardio: 3,
			gym: 3,
			format: "solo",
			objectif: "kiffer",
			zone: "france",
		};
		expect(
			explainQuiz(profile, ranked, races, {
				seuilRecommandation: 40,
				seuilAlternative: 60,
			})?.alternative?.slug,
		).toBe("c");
		expect(
			explainQuiz(
				profile,
				[
					ranked[0],
					{ slug: "c", nom: "C", score: 60, prochaineDate: "2027-03-01" },
				],
				races,
				{ seuilRecommandation: 40, seuilAlternative: 60 },
			)?.alternative,
		).toBeNull();
	});

	it("à 40 % pile, ce n'est pas encore une recommandation", () => {
		const notes = { course: 3, force: 3, cardio: 3, gym: 3 };
		const races: QuizFacts[] = [
			{
				slug: "dure",
				nom: "Dure",
				organisateur: "Un",
				formats: ["solo"],
				notes,
				noteGlobale: 4,
			},
			{
				slug: "facile",
				nom: "Facile",
				organisateur: "Deux",
				formats: ["solo"],
				notes,
				noteGlobale: 1,
			},
		];
		const profile: QuizProfile = {
			course: 3,
			force: 3,
			cardio: 3,
			gym: 3,
			format: "solo",
			objectif: "kiffer",
			zone: "france",
		};
		const result = explainQuiz(
			profile,
			[
				{ slug: "dure", nom: "Dure", score: 40, prochaineDate: null },
				{ slug: "facile", nom: "Facile", score: 10, prochaineDate: null },
			],
			races,
			config,
		);
		expect(result?.plancher).toBe(true);
		expect(result?.course.slug).toBe("facile");
		expect(result?.alternative).toBeNull();
	});
});
