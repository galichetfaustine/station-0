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

/** Équipement le plus lourd de la catégorie notée, pour la note de force (§5). */
export const EQUIPEMENTS_FORCE = [
	"aucun",
	"sledLeger",
	"sledLourd",
	"barreSousMax",
	"testMax",
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

const segmentCourse = z.strictObject({
	type: z.literal("course"),
	distanceM: z.int().positive(),
});

const segmentExercice = z.strictObject({
	type: z.literal("exercice"),
	nom: z.string().min(1),
	/** Absent pour un mouvement au poids du corps. */
	chargeKg: z.number().positive().optional(),
	volume: z.number().positive(),
	unite: z.enum(UNITES),
});

/** Données brutes du barème (§5) : les notes en sont calculées, jamais saisies. */
const bareme = z.strictObject({
	/** Nombre d'athlètes qui se partagent la distance et le volume (1 en solo, 2 en duo…). */
	partageEffort: z.int().min(1),
	course: z.strictObject({ distanceM: z.int().min(0) }),
	force: z.strictObject({
		chargeMaxKg: z.number().min(0),
		equipement: z.enum(EQUIPEMENTS_FORCE),
	}),
	cardio: z.strictObject({ ergoM: z.int().min(0) }),
	gym: z.strictObject({ mouvementLePlusTechnique: z.enum(MOUVEMENTS_GYM) }),
});

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
	deroule: z
		.array(z.discriminatedUnion("type", [segmentCourse, segmentExercice]))
		.min(1),
	bareme,
	notes: z
		.never({
			error: "les notes sont calculées depuis « bareme », ne les saisis pas",
		})
		.optional(),
	pourQui: z.string().min(1),
	saison: z
		.string()
		.regex(/^\d{4}\/\d{2}$/, "saison attendue au format 2026/27"),
	sourceDates: z.union([z.literal("manuel"), slug]),
	sources: z.array(z.url()).min(1),
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
