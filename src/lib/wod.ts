// Générateur de séance (US3.2, specs §8).
// TypeScript pur : pas d'Astro, pas de Svelte.
// La même graine redonne la même séance. Le tirage repart toujours de cette
// graine : il ne passe pas par le générateur aléatoire du langage.
// Un exercice sans secondesParUnite est écarté : sa durée ne se devine pas.

import {
	type Exercise,
	MATERIELS,
	WOD_FORMATS,
	type WodConfig,
	type WodFormat,
	type WodLevel,
} from "./schemas.ts";

const SECONDS_PER_MINUTE = 60;

export interface WodLocks {
	timeCapMin?: 15 | 20;
	/** Slug d'une course, ou « mix ». */
	race?: string;
	level?: WodLevel;
	equipment?: Exercise["materiel"];
	format?: WodFormat;
}

export interface GenerateWodInput {
	seed: string;
	exercises: readonly Exercise[];
	/** Courses d'inspiration tirables. « mix » est toujours ajouté. */
	races: readonly string[];
	config: WodConfig;
	locks?: WodLocks;
}

/** Un exercice retenu, avec le volume calculé pour cette séance. */
export interface WodExercise {
	id: string;
	nom: string;
	categorie: Exercise["categorie"];
	schemaMouvement: Exercise["schemaMouvement"];
	materiel: Exercise["materiel"];
	unite: Exercise["unite"];
	coursesOrigine: string[];
	volume: number;
	/** Durée de ce volume : volume × secondesParUnite. */
	secondes: number;
}

export interface WodSession {
	seed: string;
	timeCapMin: 15 | 20;
	race: string;
	level: WodLevel;
	equipment: Exercise["materiel"];
	format: WodFormat;
	exercises: WodExercise[];
	/**
	 * Travail chiffré, en secondes.
	 * For Time : toute la séance. AMRAP : un tour.
	 * EMOM et Intervalles : la somme des efforts.
	 */
	workSeconds: number;
	/** Durée du minuteur, hors échauffement. Jamais au-dessus du time cap. */
	sessionSeconds: number;
	warmupMin: number;
	/** AMRAP : durée d'un tour. Null pour les autres formats. */
	roundSeconds: number | null;
	/** Intervalles : repos entre deux efforts. Null sinon. */
	restSeconds: number | null;
	/** EMOM : nombre de minutes. Intervalles : nombre de tours. Null sinon. */
	stations: number | null;
}

export type WodResult =
	| { ok: true; session: WodSession }
	| { ok: false; reason: string };

interface ResolvedParams {
	timeCapMin: 15 | 20;
	race: string;
	level: WodLevel;
	equipment: Exercise["materiel"];
	format: WodFormat;
}

interface SizedExercise {
	exercise: Exercise;
	volume: number;
	seconds: number;
}

/**
 * Suite de nombres déterministe.
 * On part de la graine : chaque nombre se calcule à partir du précédent.
 */
function createRng(seed: string): () => number {
	let state = 2166136261;
	for (let index = 0; index < seed.length; index++) {
		state = Math.imul(state ^ seed.charCodeAt(index), 16777619);
	}
	if (state >>> 0 === 0) state = 1;
	return () => {
		state = (Math.imul(1664525, state) + 1013904223) >>> 0;
		return state / 4294967296;
	};
}

function draw<T>(rng: () => number, values: readonly T[]): T | undefined {
	if (values.length === 0) return undefined;
	return values[Math.floor(rng() * values.length)];
}

function inspirationOptions(races: readonly string[]): string[] {
	const options: string[] = [];
	for (const race of races) {
		if (race !== "mix" && !options.includes(race)) options.push(race);
	}
	options.push("mix");
	return options;
}

/** Tire les paramètres, puis laisse le verrou remplacer la valeur tirée. */
function resolveParams(
	rng: () => number,
	races: readonly string[],
	config: WodConfig,
	locks: WodLocks,
): ResolvedParams | null {
	const drawnCap = draw(rng, config.timeCapMin);
	const drawnRace = draw(rng, inspirationOptions(races));
	const drawnEquipment = draw(rng, MATERIELS);
	const drawnFormat = draw(rng, WOD_FORMATS);
	const timeCapMin = locks.timeCapMin ?? drawnCap;
	const race = locks.race ?? drawnRace;
	const equipment = locks.equipment ?? drawnEquipment;
	const format = locks.format ?? drawnFormat;
	if (
		timeCapMin === undefined ||
		race === undefined ||
		equipment === undefined ||
		format === undefined
	) {
		return null;
	}
	return {
		timeCapMin,
		race,
		level: locks.level ?? config.niveauParDefaut,
		equipment,
		format,
	};
}

function equipmentRank(materiel: Exercise["materiel"]): number {
	return MATERIELS.indexOf(materiel);
}

function secondsPerUnit(exercise: Exercise): number | null {
	const seconds = exercise.secondesParUnite;
	if (seconds === null || seconds <= 0) return null;
	return seconds;
}

function forTimeBudget(config: WodConfig, timeCapMin: number): number {
	return Math.round(config.forTimePartMax * timeCapMin * SECONDS_PER_MINUTE);
}

/** Vrai si au moins un volume entier tient dans la fenêtre du format. */
function canEnterFormat(
	unit: number,
	format: WodFormat,
	config: WodConfig,
	budget: number,
): boolean {
	if (format === "emom") {
		const minVolume = Math.ceil(config.emomTravailMinSec / unit);
		const maxVolume = Math.floor(config.emomTravailMaxSec / unit);
		return minVolume >= 1 && minVolume <= maxVolume;
	}
	if (format === "intervalles") {
		return Math.floor(config.intervallesTravailSec / unit) >= 1;
	}
	if (format === "amrap") return unit <= config.amrapTourMaxSec;
	return unit <= budget;
}

/**
 * Matériel trop exigeant : la première alternative qui convient.
 * Un exercice sans temps n'est pas remplacé : l'alternative ne sert qu'au matériel.
 */
function resolveEquipment(
	exercise: Exercise,
	equipment: Exercise["materiel"],
	byId: ReadonlyMap<string, Exercise>,
	seen: ReadonlySet<string>,
): Exercise | null {
	if (seen.has(exercise.id)) return null;
	const next = new Set(seen);
	next.add(exercise.id);
	if (equipmentRank(exercise.materiel) <= equipmentRank(equipment)) {
		return secondsPerUnit(exercise) === null ? null : exercise;
	}
	for (const id of exercise.alternatives) {
		const alternative = byId.get(id);
		if (!alternative) continue;
		const resolved = resolveEquipment(alternative, equipment, byId, next);
		if (resolved) return resolved;
	}
	return null;
}

function buildPool(
	exercises: readonly Exercise[],
	params: ResolvedParams,
	config: WodConfig,
): Exercise[] {
	const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
	const budget = forTimeBudget(config, params.timeCapMin);
	const pool: Exercise[] = [];
	const seen = new Set<string>();
	for (const exercise of exercises) {
		const resolved = resolveEquipment(
			exercise,
			params.equipment,
			byId,
			new Set(),
		);
		if (!resolved || seen.has(resolved.id)) continue;
		const unit = secondsPerUnit(resolved);
		if (unit === null) continue;
		if (!canEnterFormat(unit, params.format, config, budget)) continue;
		seen.add(resolved.id);
		pool.push(resolved);
	}
	return pool;
}

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
	const copy = [...items];
	for (let index = copy.length - 1; index > 0; index--) {
		const swap = Math.floor(rng() * (index + 1));
		const current = copy[index];
		const other = copy[swap];
		if (current === undefined || other === undefined) continue;
		copy[index] = other;
		copy[swap] = current;
	}
	return copy;
}

function rotatedCounts(rng: () => number, min: number, max: number): number[] {
	const counts: number[] = [];
	for (let count = min; count <= max; count++) counts.push(count);
	if (counts.length === 0) return counts;
	const start = Math.floor(rng() * counts.length);
	const ordered: number[] = [];
	for (let index = 0; index < counts.length; index++) {
		const count = counts[(start + index) % counts.length];
		if (count !== undefined) ordered.push(count);
	}
	return ordered;
}

/** Au moins 70 % : 2 exercices sur 3 (66 %) ne suffisent pas. */
function minimumFromRace(count: number, part: number): number {
	return Math.ceil(count * part - 1e-9);
}

function isRunOrCardio(exercise: Exercise): boolean {
	return exercise.categorie === "course" || exercise.categorie === "cardio";
}

function orderExercises(exercises: readonly Exercise[]): Exercise[] | null {
	const used = new Array<boolean>(exercises.length).fill(false);
	const ordered: Exercise[] = [];

	function walk(): boolean {
		if (ordered.length === exercises.length) return true;
		for (let index = 0; index < exercises.length; index++) {
			if (used[index]) continue;
			const exercise = exercises[index];
			if (!exercise) continue;
			const previous = ordered[ordered.length - 1];
			if (previous && previous.schemaMouvement === exercise.schemaMouvement) {
				continue;
			}
			used[index] = true;
			ordered.push(exercise);
			if (walk()) return true;
			ordered.pop();
			used[index] = false;
		}
		return false;
	}

	return walk() ? ordered : null;
}

function totalSeconds(
	exercises: readonly Exercise[],
	volumes: readonly number[],
): number {
	let total = 0;
	for (let index = 0; index < exercises.length; index++) {
		const exercise = exercises[index];
		const volume = volumes[index];
		const unit = exercise ? secondsPerUnit(exercise) : null;
		if (!exercise || volume === undefined || unit === null) continue;
		total += volume * unit;
	}
	return total;
}

function pack(
	exercises: readonly Exercise[],
	volumes: readonly number[],
): SizedExercise[] | null {
	const sized: SizedExercise[] = [];
	for (let index = 0; index < exercises.length; index++) {
		const exercise = exercises[index];
		const volume = volumes[index];
		const unit = exercise ? secondsPerUnit(exercise) : null;
		if (!exercise || volume === undefined || unit === null || volume < 1) {
			return null;
		}
		sized.push({ exercise, volume, seconds: volume * unit });
	}
	return sized;
}

/** Baisse d'une unité à la fois, sans passer sous 1, jusqu'à tenir dans max. */
function shrink(
	exercises: readonly Exercise[],
	volumes: readonly number[],
	max: number,
): SizedExercise[] | null {
	const next = [...volumes];
	let total = totalSeconds(exercises, next);
	let guard = 0;
	while (total > max && guard < 100_000) {
		guard += 1;
		let best = -1;
		for (let index = 0; index < next.length; index++) {
			const volume = next[index];
			const exercise = exercises[index];
			if (volume === undefined || volume - 1 < 1 || !exercise) continue;
			const bestExercise = exercises[best];
			const bestUnit = bestExercise ? secondsPerUnit(bestExercise) : null;
			const unit = secondsPerUnit(exercise);
			if (
				best === -1 ||
				(unit !== null && bestUnit !== null && unit > bestUnit)
			) {
				best = index;
			}
		}
		const chosen = next[best];
		const exercise = exercises[best];
		const unit = exercise ? secondsPerUnit(exercise) : null;
		if (best === -1 || chosen === undefined || unit === null) return null;
		next[best] = chosen - 1;
		total -= unit;
	}
	if (total > max) return null;
	return pack(exercises, next);
}

/**
 * Ajoute une unité à la fois, à tour de rôle, jusqu'à entrer dans [min, max].
 * On s'arrête dès que le minimum est atteint : on ne rallonge pas au-delà.
 */
function raiseToWindow(
	exercises: readonly Exercise[],
	volumes: readonly number[],
	min: number,
	max: number,
): SizedExercise[] | null {
	const next = [...volumes];
	let total = totalSeconds(exercises, next);
	let guard = 0;
	while (guard < 100_000) {
		guard += 1;
		const allPresent = next.every((volume) => volume >= 1);
		if (total >= min && total <= max && allPresent)
			return pack(exercises, next);
		if (total > max) return null;
		let progressed = false;
		for (let index = 0; index < exercises.length; index++) {
			const exercise = exercises[index];
			const unit = exercise ? secondsPerUnit(exercise) : null;
			const volume = next[index];
			if (unit === null || volume === undefined || total + unit > max) continue;
			next[index] = volume + 1;
			total += unit;
			progressed = true;
			if (total >= min && next.every((value) => value >= 1)) {
				return pack(exercises, next);
			}
		}
		if (!progressed) return null;
	}
	return null;
}

/** Remplit le plafond For Time, sans le dépasser. Chaque exercice a au moins 1 unité. */
function fillToMax(
	exercises: readonly Exercise[],
	max: number,
): SizedExercise[] | null {
	const next = exercises.map(() => 0);
	let total = 0;
	let guard = 0;
	while (guard < 100_000) {
		guard += 1;
		let progressed = false;
		for (let index = 0; index < exercises.length; index++) {
			const exercise = exercises[index];
			const unit = exercise ? secondsPerUnit(exercise) : null;
			const volume = next[index];
			if (unit === null || volume === undefined || total + unit > max) continue;
			next[index] = volume + 1;
			total += unit;
			progressed = true;
		}
		if (!progressed) break;
	}
	return pack(exercises, next);
}

function prescribedVolumes(
	exercises: readonly Exercise[],
	level: WodLevel,
): number[] | null {
	const volumes: number[] = [];
	for (const exercise of exercises) {
		const volume = exercise.volumeParNiveau[level];
		if (volume === null || volume <= 0) return null;
		volumes.push(volume);
	}
	return volumes;
}

function sizeForTime(
	exercises: readonly Exercise[],
	level: WodLevel,
	budget: number,
): SizedExercise[] | null {
	const prescribed = prescribedVolumes(exercises, level);
	if (!prescribed) return fillToMax(exercises, budget);
	if (totalSeconds(exercises, prescribed) <= budget)
		return pack(exercises, prescribed);
	return shrink(exercises, prescribed, budget);
}

function sizeAmrap(
	exercises: readonly Exercise[],
	level: WodLevel,
	config: WodConfig,
): SizedExercise[] | null {
	const min = config.amrapTourMinSec;
	const max = config.amrapTourMaxSec;
	const prescribed = prescribedVolumes(exercises, level);
	if (!prescribed)
		return raiseToWindow(
			exercises,
			exercises.map(() => 0),
			min,
			max,
		);
	const total = totalSeconds(exercises, prescribed);
	if (total >= min && total <= max) return pack(exercises, prescribed);
	if (total > max) {
		const shrunk = shrink(exercises, prescribed, max);
		if (!shrunk) return null;
		const shrunkTotal = shrunk.reduce((sum, item) => sum + item.seconds, 0);
		if (shrunkTotal < min) return null;
		return shrunk;
	}
	return raiseToWindow(exercises, prescribed, min, max);
}

function volumeInWindow(
	unit: number,
	minSeconds: number,
	maxSeconds: number,
	prescribed: number | null,
): number | null {
	if (prescribed !== null && prescribed > 0) {
		const duration = prescribed * unit;
		if (duration >= minSeconds && duration <= maxSeconds) return prescribed;
	}
	const minVolume = Math.ceil(minSeconds / unit);
	const maxVolume = Math.floor(maxSeconds / unit);
	if (minVolume < 1 || minVolume > maxVolume) return null;
	return minVolume;
}

function sizeEmom(
	exercises: readonly Exercise[],
	level: WodLevel,
	config: WodConfig,
): SizedExercise[] | null {
	const sized: SizedExercise[] = [];
	for (const exercise of exercises) {
		const unit = secondsPerUnit(exercise);
		if (unit === null) return null;
		const volume = volumeInWindow(
			unit,
			config.emomTravailMinSec,
			config.emomTravailMaxSec,
			exercise.volumeParNiveau[level],
		);
		if (volume === null) return null;
		sized.push({ exercise, volume, seconds: volume * unit });
	}
	return sized;
}

function sizeIntervals(
	exercises: readonly Exercise[],
	config: WodConfig,
): SizedExercise[] | null {
	const sized: SizedExercise[] = [];
	for (const exercise of exercises) {
		const unit = secondsPerUnit(exercise);
		if (unit === null) return null;
		const volume = Math.floor(config.intervallesTravailSec / unit);
		if (volume < 1) return null;
		sized.push({ exercise, volume, seconds: volume * unit });
	}
	return sized;
}

function sizeExercises(
	exercises: readonly Exercise[],
	params: ResolvedParams,
	config: WodConfig,
): SizedExercise[] | null {
	if (params.format === "forTime") {
		return sizeForTime(
			exercises,
			params.level,
			forTimeBudget(config, params.timeCapMin),
		);
	}
	if (params.format === "amrap")
		return sizeAmrap(exercises, params.level, config);
	if (params.format === "emom")
		return sizeEmom(exercises, params.level, config);
	return sizeIntervals(exercises, config);
}

function fromRace(exercises: readonly Exercise[], race: string): number {
	return exercises.filter((exercise) => exercise.coursesOrigine.includes(race))
		.length;
}

function canReach(
	chosen: readonly Exercise[],
	pool: readonly Exercise[],
	start: number,
	count: number,
	race: string,
	needFromRace: number,
): boolean {
	if (pool.length - start < count - chosen.length) return false;
	let force = chosen.some((exercise) => exercise.categorie === "force");
	let runOrCardio = chosen.some(isRunOrCardio);
	let matching = race === "mix" ? needFromRace : fromRace(chosen, race);
	for (let index = start; index < pool.length; index++) {
		const exercise = pool[index];
		if (!exercise) continue;
		if (exercise.categorie === "force") force = true;
		if (isRunOrCardio(exercise)) runOrCardio = true;
		if (race !== "mix" && exercise.coursesOrigine.includes(race)) matching += 1;
	}
	return force && runOrCardio && matching >= needFromRace;
}

function pickExercises(
	rng: () => number,
	pool: readonly Exercise[],
	params: ResolvedParams,
	config: WodConfig,
): SizedExercise[] | null {
	const shuffled = shuffle(pool, rng);
	const counts = rotatedCounts(rng, config.exercicesMin, config.exercicesMax);

	for (const count of counts) {
		const need =
			params.race === "mix"
				? 0
				: minimumFromRace(count, config.partCourseInspiration);
		const found = search(shuffled, count, params, config, need);
		if (found) return found;
	}
	return null;
}

function search(
	pool: readonly Exercise[],
	count: number,
	params: ResolvedParams,
	config: WodConfig,
	needFromRace: number,
): SizedExercise[] | null {
	const chosen: Exercise[] = [];

	function finish(): SizedExercise[] | null {
		if (!chosen.some(isRunOrCardio)) return null;
		if (!chosen.some((exercise) => exercise.categorie === "force")) return null;
		if (params.race !== "mix" && fromRace(chosen, params.race) < needFromRace) {
			return null;
		}
		const ordered = orderExercises(chosen);
		if (!ordered) return null;
		return sizeExercises(ordered, params, config);
	}

	function walk(start: number): SizedExercise[] | null {
		if (chosen.length === count) return finish();
		if (!canReach(chosen, pool, start, count, params.race, needFromRace))
			return null;
		for (let index = start; index < pool.length; index++) {
			const exercise = pool[index];
			if (!exercise) continue;
			chosen.push(exercise);
			const found = walk(index + 1);
			if (found) return found;
			chosen.pop();
		}
		return null;
	}

	return walk(0);
}

function sumStationSeconds(
	sized: readonly SizedExercise[],
	stations: number,
): number {
	let total = 0;
	for (let index = 0; index < stations; index++) {
		const item = sized[index % sized.length];
		if (!item) return total;
		total += item.seconds;
	}
	return total;
}

function toSession(
	seed: string,
	params: ResolvedParams,
	sized: readonly SizedExercise[],
	config: WodConfig,
): WodSession | null {
	const exercises: WodExercise[] = sized.map((item) => ({
		id: item.exercise.id,
		nom: item.exercise.nom,
		categorie: item.exercise.categorie,
		schemaMouvement: item.exercise.schemaMouvement,
		materiel: item.exercise.materiel,
		unite: item.exercise.unite,
		coursesOrigine: [...item.exercise.coursesOrigine],
		volume: item.volume,
		secondes: item.seconds,
	}));
	const cap = params.timeCapMin * SECONDS_PER_MINUTE;
	const onePass = sized.reduce((sum, item) => sum + item.seconds, 0);
	let workSeconds = onePass;
	let sessionSeconds = onePass;
	let roundSeconds: number | null = null;
	let restSeconds: number | null = null;
	let stations: number | null = null;

	if (params.format === "amrap") {
		roundSeconds = onePass;
		workSeconds = onePass;
		sessionSeconds = cap;
	} else if (params.format === "emom") {
		stations = params.timeCapMin;
		workSeconds = sumStationSeconds(sized, stations);
		sessionSeconds = cap;
	} else if (params.format === "intervalles") {
		const cycle = config.intervallesTravailSec + config.intervallesReposSec;
		if (cycle <= 0) return null;
		stations = Math.floor(cap / cycle);
		if (stations < 1) return null;
		workSeconds = sumStationSeconds(sized, stations);
		sessionSeconds = stations * cycle;
		restSeconds = config.intervallesReposSec;
	}

	return {
		seed,
		timeCapMin: params.timeCapMin,
		race: params.race,
		level: params.level,
		equipment: params.equipment,
		format: params.format,
		exercises,
		workSeconds,
		sessionSeconds,
		warmupMin: config.echauffementMin,
		roundSeconds,
		restSeconds,
		stations,
	};
}

function fitsTimeCap(session: WodSession, config: WodConfig): boolean {
	const cap = session.timeCapMin * SECONDS_PER_MINUTE;
	if (session.sessionSeconds > cap || session.workSeconds > cap) return false;
	if (session.warmupMin !== config.echauffementMin) return false;
	if (session.format === "forTime") {
		return (
			session.workSeconds <= forTimeBudget(config, session.timeCapMin) &&
			session.sessionSeconds === session.workSeconds
		);
	}
	if (session.format === "amrap") {
		return (
			session.roundSeconds !== null &&
			session.roundSeconds >= config.amrapTourMinSec &&
			session.roundSeconds <= config.amrapTourMaxSec &&
			session.sessionSeconds === cap
		);
	}
	if (session.format === "emom") {
		return (
			session.stations === session.timeCapMin &&
			session.sessionSeconds === cap &&
			session.exercises.every(
				(exercise) =>
					exercise.secondes >= config.emomTravailMinSec &&
					exercise.secondes <= config.emomTravailMaxSec,
			)
		);
	}
	const cycle = config.intervallesTravailSec + config.intervallesReposSec;
	return (
		session.stations !== null &&
		session.sessionSeconds === session.stations * cycle &&
		session.sessionSeconds <= cap &&
		session.exercises.every(
			(exercise) =>
				exercise.secondes <= config.intervallesTravailSec &&
				exercise.secondes > 0,
		)
	);
}

/** Construit une séance. `ok: false` si aucune sélection ne respecte les règles. */
export function generateWod(input: GenerateWodInput): WodResult {
	const locks = input.locks ?? {};
	const rng = createRng(input.seed);
	const params = resolveParams(rng, input.races, input.config, locks);
	if (!params) {
		return { ok: false, reason: "Paramètres de séance impossibles à tirer." };
	}
	const pool = buildPool(input.exercises, params, input.config);
	if (pool.length < input.config.exercicesMin) {
		return {
			ok: false,
			reason: "Pas assez d'exercices avec un temps connu pour ce matériel.",
		};
	}
	const sized = pickExercises(rng, pool, params, input.config);
	if (!sized) {
		return {
			ok: false,
			reason:
				"Aucune sélection ne respecte le time cap, les catégories et les schémas de mouvement.",
		};
	}
	const session = toSession(input.seed, params, sized, input.config);
	if (!session || !fitsTimeCap(session, input.config)) {
		return { ok: false, reason: "La séance dépasserait le time cap." };
	}
	return { ok: true, session };
}
