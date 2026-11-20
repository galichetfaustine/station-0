import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { mergeEvents } from "./dates.ts";
import {
	PROFILE_LEVELS,
	type QuizCandidate,
	type QuizProfile,
	rankRaces,
	toQuizCandidate,
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
