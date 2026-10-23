// Schémas des données (US0.5) : course (§4, §5), événement (§6), exercice (§8).
// Les noms de champs sont ceux de docs/SPECS.md. Messages d'erreur en français.
import * as z from "zod";

z.config(z.locales.fr());

const slug = z
	.string()
	.regex(
		/^[a-z0-9]+(-[a-z0-9]+)*$/,
		"identifiant attendu en minuscules et tirets (ex. hyrox-doubles)",
	);

// --- Course (§4) ---

export const FORMATS = ["solo", "duo", "relais", "equipe"] as const;
export const UNITES = [
	"repetitions",
	"metres",
	"calories",
	"secondes",
] as const;

/** Mouvements du barème gym / agilité (§5), du plus simple au plus technique. */
export const MOUVEMENTS_GYM = [
	"marcher",
	"porter",
	"burpees",
	"fentes",
	"wallBalls",
	"boxJumps",
	"bearCrawl",
	"snatchHaltere",
	"tractions",
	"toesToBar",
	"obstaclesSimples",
	"muscleUp",
	"handstandPushUp",
	"obstaclesTechniques",
] as const;

/** Une valeur par catégorie de genre : la catégorie notée a des charges différentes. */
const parGenre = z.strictObject({
	homme: z.number().min(0),
	femme: z.number().min(0),
});

const segmentCourse = z.strictObject({
	type: z.literal("course"),
	distanceM: z.int().positive(),
});

const segmentExercice = z.strictObject({
	type: z.literal("exercice"),
	nom: z.string().min(1),
	/** Absent pour un mouvement au poids du corps. */
	chargeKg: parGenre.optional(),
	/** Absents quand le volume n'est pas fixé (ex. « distance maximale en 24 min »). */
	volume: z.number().positive().optional(),
	unite: z.enum(UNITES).optional(),
});

/**
 * Données brutes du barème (§5), relevées dans le règlement : les notes en sont calculées,
 * jamais saisies. Une catégorie vaut null quand l'information est introuvable
 * (la raison est alors expliquée dans « remarques »).
 */
const bareme = z.strictObject({
	/** Nombre d'athlètes qui se partagent les stations (1 en solo, 2 en duo…). Divise les mètres d'ergo. */
	partageEffort: z.int().min(1),
	/** Distance courue par chaque athlète, d'après le règlement (en duo, chacun court souvent tout). */
	course: z.strictObject({ distanceM: z.int().min(0) }).nullable(),
	force: z
		.strictObject({
			/** Charge libre la plus lourde (kettlebell, haltère, sandbag, disque, pierre…), par main si portée à deux mains. */
			chargeLibreMaxKg: parGenre.optional(),
			/** Poids total du sled (sled compris), absent s'il n'y a pas de sled. */
			sledKg: parGenre.optional(),
			barre: z.enum(["aucune", "sousMax", "testMax"]),
		})
		.nullable(),
	cardio: z
		.strictObject({
			/** Mètres cumulés de rameur, SkiErg et air bike, avant partage ; null si non fixé. */
			ergoM: z.int().min(0).nullable(),
			/** Durée d'effort réelle, hors pauses et récupération ; null si inconnue. */
			dureeEffortMin: z.int().positive().nullable(),
		})
		.refine(
			(cardio) => cardio.ergoM !== null || cardio.dureeEffortMin !== null,
			{
				error:
					"au moins une donnée de cardio est nécessaire (sinon, mets cardio à null)",
			},
		)
		.nullable(),
	gym: z
		.strictObject({ mouvementLePlusTechnique: z.enum(MOUVEMENTS_GYM) })
		.nullable(),
});

export type Bareme = z.infer<typeof bareme>;

export const raceSchema = z.strictObject({
	slug,
	nom: z.string().min(1),
	organisateur: z.string().min(1),
	typeCourse: z.enum(["hybride", "obstacles"]),
	siteOfficiel: z.url(),
	/** Catégorie la plus accessible, celle qui est notée (Open, Everyday, Compete…). */
	categorieNotee: z.string().min(1),
	formats: z.array(z.enum(FORMATS)).min(1),
	dureeMoyenneMin: z.int().positive(),
	/** Durée affichée quand les minutes ne suffisent pas (« 2 jours », « 2 h 30 avec récupération »). */
	dureeTexte: z.string().min(1).optional(),
	/** true quand dureeMoyenneMin est une estimation (affichée « environ »). */
	dureeEstimee: z.boolean().optional(),
	deroule: z.array(
		z.discriminatedUnion("type", [segmentCourse, segmentExercice]),
	),
	bareme,
	notes: z
		.never({
			error: "les notes sont calculées depuis « bareme », ne les saisis pas",
		})
		.optional(),
	pourQui: z.string().min(1),
	saison: z
		.string()
		.regex(/^\d{4}(\/\d{2})?$/, "saison attendue au format 2026/27 ou 2027"),
	sourceDates: z.union([z.literal("manuel"), slug]),
	sources: z.array(z.url()).min(1),
	/** Informations introuvables, estimations et réserves, en clair. */
	remarques: z.array(z.string().min(1)).optional(),
});

export type Race = z.infer<typeof raceSchema>;

// --- Événement (§6) ---

/** France et pays proches (§2), codes ISO 3166-1. */
export const PAYS = ["FR", "BE", "CH", "LU", "DE", "IT", "ES", "GB"] as const;

export const eventSchema = z
	.strictObject({
		course: slug,
		date: z.iso.date(),
		/** Dernier jour, pour un événement sur plusieurs jours. */
		dateFin: z.iso.date().optional(),
		ville: z.string().min(1),
		pays: z.enum(PAYS),
		lienInscription: z.url(),
	})
	.refine(
		(event) => event.dateFin === undefined || event.dateFin >= event.date,
		{
			path: ["dateFin"],
			error: "la date de fin doit être postérieure ou égale à la date de début",
		},
	);

/** Un fichier par source, dans data/events/ (collecté) ou data/events-manual/ (saisi à la main). */
export const eventFileSchema = z.strictObject({
	source: z.union([z.literal("manuel"), slug]),
	/** Date et heure du dernier passage du collecteur (affichée « Dates vérifiées le… »). */
	verifieLe: z.iso.datetime({ offset: true }),
	evenements: z.array(eventSchema),
});

export type RaceEvent = z.infer<typeof eventSchema>;

// --- Exercice (§8) ---

/** Matériel, du plus léger au plus complet (paramètre « Matériel » du générateur). */
export const MATERIELS = [
	"aucun",
	"halteresKettlebell",
	"salleComplete",
] as const;

export const exerciseSchema = z.strictObject({
	id: slug,
	nom: z.string().min(1),
	coursesOrigine: z.array(slug).min(1),
	categorie: z.enum(["course", "force", "cardio", "gym"]),
	schemaMouvement: z.enum([
		"pousser",
		"tirer",
		"squat",
		"fente",
		"charniere",
		"porter",
		"corpsEntier",
	]),
	materiel: z.enum(MATERIELS),
	unite: z.enum(UNITES),
	volumeParNiveau: z.strictObject({
		debutant: z.number().positive(),
		intermediaire: z.number().positive(),
		confirme: z.number().positive(),
	}),
	secondesParUnite: z.number().positive(),
	consigne: z.string().min(1),
	/** Identifiants d'exercices de la banque qui remplacent celui-ci avec moins de matériel. */
	alternatives: z.array(slug),
});

export const exerciseBankSchema = z.array(exerciseSchema);

export type Exercise = z.infer<typeof exerciseSchema>;

// --- Configuration du barème (data/config/bareme.json) ---

/** Palier : la note est atteinte si la valeur est ≥ min (ou > plusDe). */
const palier = z.union([
	z.strictObject({ note: z.int().min(1).max(5), min: z.number() }),
	z.strictObject({ note: z.int().min(1).max(5), plusDe: z.number() }),
]);

export const baremeConfigSchema = z.strictObject({
	/** Charges utilisées pour la note de force : celles des hommes ou des femmes. */
	chargeReference: z.enum(["homme", "femme"]),
	course: z.strictObject({ distanceM: z.array(palier) }),
	force: z.strictObject({
		chargeLibreKg: z.array(palier),
		sledLourdKgMin: z.number().positive(),
		noteSledLeger: z.int().min(1).max(5),
		noteSledLourd: z.int().min(1).max(5),
		noteBarreSousMax: z.int().min(1).max(5),
		noteTestMax: z.int().min(1).max(5),
	}),
	cardio: z.strictObject({
		ergoM: z.array(palier),
		dureeEffortMin: z.array(palier),
	}),
	gym: z.strictObject({
		mouvements: z.record(z.enum(MOUVEMENTS_GYM), z.int().min(1).max(5)),
	}),
	globale: z.strictObject({
		dureeCourteMoinsDe: z.number(),
		ajustementCourt: z.number(),
		dureeLonguePlusDe: z.number(),
		ajustementLong: z.number(),
	}),
});

export type BaremeConfig = z.infer<typeof baremeConfigSchema>;
