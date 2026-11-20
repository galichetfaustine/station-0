// Page du générateur (US3.3, specs §8).
// TypeScript pur : pas d'Astro, pas de Svelte.
// L'adresse porte la graine et les verrous. La même adresse redonne la même séance.

import { MATERIELS, WOD_FORMATS, WOD_LEVELS } from "./enums.ts";
import type { Exercise, WodFormat, WodLevel } from "./schemas.ts";
import type { WodExercise, WodLocks, WodSession } from "./wod.ts";

export const MIX = "mix";

/** Graine acceptée dans l'adresse : assez longue pour être unique, assez courte pour un lien. */
const SEED_PATTERN = /^[a-z0-9]{8,64}$/;

export interface WodRaceOption {
	slug: string;
	nom: string;
}

/**
 * Verrous de l'adresse.
 * `null` = pas verrouillé (tiré avec la graine).
 * Le niveau est toujours une valeur : sans choix, c'est débutant, et il n'est pas tiré.
 */
export interface WodAddressLocks {
	timeCapMin: 15 | 20 | null;
	/** Slug d'une course, ou « mix ». */
	race: string | null;
	level: WodLevel;
	equipment: Exercise["materiel"] | null;
	format: WodFormat | null;
}

export interface WodAddress {
	seed: string | null;
	locks: WodAddressLocks;
}

/** Valeurs brutes des sélecteurs de la page. Chaîne vide = au hasard. */
export interface WodSelection {
	cap: string;
	course: string;
	level: string;
	equipment: string;
	format: string;
}

export const LEVEL_LABEL: Record<WodLevel, string> = {
	debutant: "Débutant",
	intermediaire: "Intermédiaire",
	confirme: "Confirmé",
};

export const FORMAT_LABEL: Record<WodFormat, string> = {
	amrap: "AMRAP",
	emom: "EMOM",
	forTime: "For Time",
	intervalles: "Intervalles",
};

export const EQUIPMENT_LABEL: Record<Exercise["materiel"], string> = {
	aucun: "Aucun",
	halteresKettlebell: "Haltères ou kettlebell",
	salleComplete: "Salle complète",
};

export interface WodFact {
	label: string;
	value: string;
}

export interface WodStep {
	label: string;
	nom: string;
	volume: string;
	consigne: string | null;
}

export interface WodBrief {
	facts: WodFact[];
	detail: string;
	warmup: string;
	steps: WodStep[];
}

function oneOf<T extends string>(
	value: string | null,
	allowed: readonly T[],
): T | null {
	if (value === null) return null;
	for (const item of allowed) {
		if (item === value) return item;
	}
	return null;
}

function timeCap(value: string | null): 15 | 20 | null {
	if (value === "15") return 15;
	if (value === "20") return 20;
	return null;
}

function raceLock(
	value: string | null,
	raceSlugs: readonly string[],
): string | null {
	if (value === MIX) return MIX;
	if (value !== null && raceSlugs.includes(value)) return value;
	return null;
}

/** Lit l'adresse. Un verrou inconnu est ignoré. Sans niveau, c'est débutant. */
export function parseWodSearch(
	params: URLSearchParams,
	raceSlugs: readonly string[],
): WodAddress {
	const rawSeed = params.get("graine");
	return {
		seed: rawSeed !== null && SEED_PATTERN.test(rawSeed) ? rawSeed : null,
		locks: {
			timeCapMin: timeCap(params.get("cap")),
			race: raceLock(params.get("course"), raceSlugs),
			level: oneOf(params.get("niveau"), WOD_LEVELS) ?? "debutant",
			equipment: oneOf(params.get("materiel"), MATERIELS),
			format: oneOf(params.get("format"), WOD_FORMATS),
		},
	};
}

/**
 * Écrit l'adresse. Le niveau débutant est omis : son absence veut dire débutant.
 * Les autres verrous n'apparaissent que s'ils sont posés.
 */
export function serializeWodSearch(address: WodAddress): URLSearchParams {
	const params = new URLSearchParams();
	if (address.seed) params.set("graine", address.seed);
	const { locks } = address;
	if (locks.timeCapMin) params.set("cap", String(locks.timeCapMin));
	if (locks.race) params.set("course", locks.race);
	if (locks.level !== "debutant") params.set("niveau", locks.level);
	if (locks.equipment) params.set("materiel", locks.equipment);
	if (locks.format) params.set("format", locks.format);
	return params;
}

/** Traduit les sélecteurs en verrous. Une course inconnue ne verrouille rien. */
export function locksFromSelection(
	selection: WodSelection,
	raceSlugs: readonly string[],
): WodAddressLocks {
	return {
		timeCapMin: timeCap(selection.cap),
		race: raceLock(selection.course, raceSlugs),
		level: oneOf(selection.level, WOD_LEVELS) ?? "debutant",
		equipment: oneOf(selection.equipment, MATERIELS),
		format: oneOf(selection.format, WOD_FORMATS),
	};
}

/** Verrous passés au générateur. Le niveau est toujours envoyé. */
export function toGeneratorLocks(locks: WodAddressLocks): WodLocks {
	const result: WodLocks = { level: locks.level };
	if (locks.timeCapMin) result.timeCapMin = locks.timeCapMin;
	if (locks.race) result.race = locks.race;
	if (locks.equipment) result.equipment = locks.equipment;
	if (locks.format) result.format = locks.format;
	return result;
}

/** 8 octets donnent 16 caractères, une graine valide pour l'adresse. */
export function seedFromBytes(bytes: Uint8Array): string {
	let hex = "";
	for (const byte of bytes) {
		hex += byte.toString(16).padStart(2, "0");
	}
	return hex;
}

export function raceLabel(
	race: string,
	races: readonly WodRaceOption[],
): string {
	if (race === MIX) return "Mix";
	for (const option of races) {
		if (option.slug === race) return option.nom;
	}
	return race;
}

export function formatVolume(volume: number, unite: Exercise["unite"]): string {
	const rounded = Number.isInteger(volume)
		? volume
		: Math.round(volume * 10) / 10;
	const amount = rounded.toLocaleString("fr-FR");
	if (unite === "repetitions") {
		return rounded === 1 ? `${amount} répétition` : `${amount} répétitions`;
	}
	if (unite === "metres") return `${amount} m`;
	if (unite === "calories") return `${amount} cal`;
	return `${amount} s`;
}

function detailFor(session: WodSession): string {
	if (session.format === "amrap") {
		return "Autant de tours que possible. Répète ces exercices jusqu'à la fin du temps.";
	}
	if (session.format === "emom") {
		return "Chaque minute, un exercice, dans l'ordre. À la fin de la liste, on reprend au début.";
	}
	if (session.format === "intervalles") {
		const rest = session.restSeconds ?? 0;
		const tours = session.stations ?? 0;
		return `${rest} s de repos après chaque effort. ${tours} tours.`;
	}
	return "Enchaîne les exercices le plus vite possible, sans dépasser le temps.";
}

function stepsFor(
	session: WodSession,
	consignes: ReadonlyMap<string, string>,
): WodStep[] {
	const counted = session.format === "emom" || session.format === "intervalles";
	const count = counted
		? (session.stations ?? session.exercises.length)
		: session.exercises.length;
	const steps: WodStep[] = [];
	for (let index = 0; index < count; index++) {
		const exercise: WodExercise | undefined =
			session.exercises[index % session.exercises.length];
		if (!exercise) continue;
		let label = `${index + 1}`;
		if (session.format === "emom") label = `Minute ${index + 1}`;
		if (session.format === "intervalles") label = `Tour ${index + 1}`;
		steps.push({
			label,
			nom: exercise.nom,
			volume: formatVolume(exercise.volume, exercise.unite),
			consigne: consignes.get(exercise.id) ?? null,
		});
	}
	return steps;
}

/** Textes de la séance affichée. Les consignes viennent de la banque, par identifiant. */
export function describeSession(
	session: WodSession,
	races: readonly WodRaceOption[],
	consignes: ReadonlyMap<string, string>,
): WodBrief {
	return {
		facts: [
			{ label: "Durée", value: `${session.timeCapMin} min` },
			{ label: "Course", value: raceLabel(session.race, races) },
			{ label: "Niveau", value: LEVEL_LABEL[session.level] },
			{ label: "Matériel", value: EQUIPMENT_LABEL[session.equipment] },
			{ label: "Format", value: FORMAT_LABEL[session.format] },
		],
		detail: detailFor(session),
		warmup: `Échauffement proposé : ${session.warmupMin} min, avant de commencer. Ce temps est en plus.`,
		steps: stepsFor(session, consignes),
	};
}
