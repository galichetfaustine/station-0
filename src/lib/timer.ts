// Minuteur (US3.4, specs §8). TypeScript pur : pas d'Astro, pas de Svelte.
// Le temps affiché se calcule à partir d'une horloge passée en argument
// (dans le navigateur : Date.now()). Un appel tardif rattrape l'heure juste :
// on ne compte pas des pas d'une seconde.

export const COUNTDOWN_MS = 10_000;

export type TimerFormat = "amrap" | "emom" | "forTime" | "intervalles";

export type TimerPhase = "idle" | "countdown" | "running" | "paused" | "done";

export type TimerSegment =
	| "ready"
	| "countdown"
	| "remaining"
	| "elapsed"
	| "minute"
	| "work"
	| "rest"
	| "done";

export interface TimerPlan {
	format: TimerFormat;
	durationMs: number;
	/** Intervalles : durée d'un effort. EMOM : une minute. Sinon null. */
	workMs: number | null;
	restMs: number | null;
	stations: number | null;
	exerciseCount: number;
}

/** Les champs de la séance dont le minuteur a besoin. */
export interface TimerSession {
	format: TimerFormat;
	sessionSeconds: number;
	restSeconds: number | null;
	stations: number | null;
	exercises: readonly unknown[];
}

export type TimerCue =
	| { kind: "count"; second: 3 | 2 | 1 }
	| { kind: "go" }
	| { kind: "minute" }
	| { kind: "work" }
	| { kind: "rest" }
	| { kind: "done" };

export interface TimerState {
	mode: "idle" | "active" | "paused" | "done";
	countdownEndsAt: number | null;
	workStartedAt: number | null;
	pausedAt: number | null;
	rounds: number;
	lastSampledAt: number | null;
}

export interface TimerView {
	phase: TimerPhase;
	segment: TimerSegment;
	/** Secondes entières affichées. */
	displaySeconds: number;
	/** Temps de séance déjà écoulé, pauses retirées, plafonné à la durée. */
	elapsedMs: number;
	stationIndex: number | null;
	stationCount: number | null;
	exerciseIndex: number | null;
	rounds: number;
	cues: TimerCue[];
}

export function planFromSession(session: TimerSession): TimerPlan {
	const exerciseCount = Math.max(1, session.exercises.length);
	if (session.format === "intervalles") {
		const stations = Math.max(1, session.stations ?? 1);
		const cycleMs = (session.sessionSeconds * 1000) / stations;
		const restMs = (session.restSeconds ?? 0) * 1000;
		return {
			format: "intervalles",
			durationMs: session.sessionSeconds * 1000,
			workMs: cycleMs - restMs,
			restMs,
			stations,
			exerciseCount,
		};
	}
	if (session.format === "emom") {
		const stations = Math.max(
			1,
			session.stations ?? session.sessionSeconds / 60,
		);
		return {
			format: "emom",
			durationMs: session.sessionSeconds * 1000,
			workMs: 60_000,
			restMs: null,
			stations,
			exerciseCount,
		};
	}
	return {
		format: session.format,
		durationMs: session.sessionSeconds * 1000,
		workMs: null,
		restMs: null,
		stations: null,
		exerciseCount,
	};
}

export function idleTimer(): TimerState {
	return {
		mode: "idle",
		countdownEndsAt: null,
		workStartedAt: null,
		pausedAt: null,
		rounds: 0,
		lastSampledAt: null,
	};
}

export function startTimer(state: TimerState, now: number): TimerState {
	if (state.mode === "active" || state.mode === "paused") return state;
	return {
		mode: "active",
		countdownEndsAt: now + COUNTDOWN_MS,
		workStartedAt: now + COUNTDOWN_MS,
		pausedAt: null,
		rounds: 0,
		lastSampledAt: now,
	};
}

export function pauseTimer(state: TimerState, now: number): TimerState {
	if (state.mode !== "active") return state;
	return { ...state, mode: "paused", pausedAt: now, lastSampledAt: now };
}

/** La pause décale l'heure de fin : le temps passé en pause ne compte pas. */
export function resumeTimer(state: TimerState, now: number): TimerState {
	if (state.mode !== "paused" || state.pausedAt === null) return state;
	const pausedMs = now - state.pausedAt;
	return {
		...state,
		mode: "active",
		pausedAt: null,
		countdownEndsAt: (state.countdownEndsAt ?? now) + pausedMs,
		workStartedAt: (state.workStartedAt ?? now) + pausedMs,
		lastSampledAt: now,
	};
}

export function tapRound(state: TimerState): TimerState {
	if (state.mode === "idle") return state;
	return { ...state, rounds: state.rounds + 1 };
}

export function tick(
	state: TimerState,
	now: number,
	plan: TimerPlan,
): { state: TimerState; view: TimerView } {
	if (
		state.mode !== "active" ||
		state.countdownEndsAt === null ||
		state.workStartedAt === null
	) {
		return { state, view: project(state, now, plan, []) };
	}
	const cues = cuesBetween(state, state.lastSampledAt ?? now, now, plan);
	const elapsed = elapsedMs(state, now, plan);
	const finished = now >= state.workStartedAt && elapsed >= plan.durationMs;
	const next: TimerState = {
		...state,
		mode: finished ? "done" : "active",
		lastSampledAt: now,
	};
	return { state: next, view: project(next, now, plan, cues) };
}

function cursor(state: TimerState, now: number): number {
	if (state.mode === "paused" && state.pausedAt !== null) return state.pausedAt;
	return now;
}

function elapsedMs(state: TimerState, now: number, plan: TimerPlan): number {
	if (state.workStartedAt === null) return 0;
	const at = cursor(state, now);
	if (at <= state.workStartedAt) return 0;
	return Math.min(plan.durationMs, at - state.workStartedAt);
}

function project(
	state: TimerState,
	now: number,
	plan: TimerPlan,
	cues: TimerCue[],
): TimerView {
	const elapsed = elapsedMs(state, now, plan);
	const phase = phaseOf(state, now);
	const segment = segmentOf(state, now, plan, phase);
	const stationCount =
		plan.format === "emom" || plan.format === "intervalles"
			? plan.stations
			: null;
	const stationIndex = stationOf(elapsed, plan, phase);
	const exerciseIndex = exerciseOf(stationIndex, plan, phase);
	return {
		phase,
		segment,
		displaySeconds: displaySeconds(state, now, plan, phase, elapsed),
		elapsedMs: elapsed,
		stationIndex,
		stationCount,
		exerciseIndex,
		rounds: state.rounds,
		cues,
	};
}

function phaseOf(state: TimerState, now: number): TimerPhase {
	if (state.mode === "idle") return "idle";
	if (state.mode === "done") return "done";
	if (state.mode === "paused") return "paused";
	if (state.workStartedAt !== null && now < state.workStartedAt) {
		return "countdown";
	}
	return "running";
}

function segmentOf(
	state: TimerState,
	now: number,
	plan: TimerPlan,
	phase: TimerPhase,
): TimerSegment {
	if (phase === "idle") return "ready";
	if (phase === "done") return "done";
	const at = cursor(state, now);
	if (state.workStartedAt === null || at < state.workStartedAt) {
		return "countdown";
	}
	if (plan.format === "amrap") return "remaining";
	if (plan.format === "forTime") return "elapsed";
	if (plan.format === "emom") return "minute";
	const cycle = (plan.workMs ?? 0) + (plan.restMs ?? 0);
	const into = cycle > 0 ? elapsedMs(state, now, plan) % cycle : 0;
	if (into === 0 || into < (plan.workMs ?? 0)) return "work";
	return "rest";
}

function stationOf(
	elapsed: number,
	plan: TimerPlan,
	phase: TimerPhase,
): number | null {
	if (plan.stations === null || plan.stations < 1) return null;
	if (plan.format !== "emom" && plan.format !== "intervalles") return null;
	if (phase === "idle" || phase === "countdown") return 0;
	const length =
		plan.format === "emom" ? 60_000 : (plan.workMs ?? 0) + (plan.restMs ?? 0);
	if (length <= 0) return 0;
	const index = Math.floor(elapsed / length);
	return Math.min(index, plan.stations - 1);
}

function exerciseOf(
	stationIndex: number | null,
	plan: TimerPlan,
	phase: TimerPhase,
): number | null {
	if (plan.format !== "emom" && plan.format !== "intervalles") return null;
	if (phase === "idle" || phase === "countdown") return 0;
	if (stationIndex === null) return 0;
	return stationIndex % plan.exerciseCount;
}

function displaySeconds(
	state: TimerState,
	now: number,
	plan: TimerPlan,
	phase: TimerPhase,
	elapsed: number,
): number {
	if (phase === "idle") {
		if (plan.format === "forTime") return 0;
		if (plan.format === "emom") return 60;
		if (plan.format === "intervalles") {
			return Math.round((plan.workMs ?? 0) / 1000);
		}
		return Math.round(plan.durationMs / 1000);
	}
	if (
		state.countdownEndsAt !== null &&
		state.workStartedAt !== null &&
		cursor(state, now) < state.workStartedAt
	) {
		const left = state.countdownEndsAt - cursor(state, now);
		return Math.max(1, Math.ceil(left / 1000));
	}
	if (phase === "done" || elapsed >= plan.durationMs) {
		return plan.format === "forTime" ? Math.round(plan.durationMs / 1000) : 0;
	}
	if (plan.format === "forTime") return Math.floor(elapsed / 1000);
	if (plan.format === "amrap") {
		return Math.ceil((plan.durationMs - elapsed) / 1000);
	}
	if (plan.format === "emom") {
		const into = elapsed % 60_000;
		const left = into === 0 ? 60_000 : 60_000 - into;
		return Math.ceil(left / 1000);
	}
	const work = plan.workMs ?? 0;
	const cycle = work + (plan.restMs ?? 0);
	const into = cycle > 0 ? elapsed % cycle : 0;
	if (into === 0) return Math.ceil(work / 1000);
	const left = into < work ? work - into : cycle - into;
	return Math.ceil(left / 1000);
}

interface Mark {
	at: number;
	cue: TimerCue;
}

function cuesBetween(
	state: TimerState,
	from: number,
	to: number,
	plan: TimerPlan,
): TimerCue[] {
	if (
		to <= from ||
		state.countdownEndsAt === null ||
		state.workStartedAt === null
	) {
		return [];
	}
	const marks: Mark[] = [];
	const countdownEnd = state.countdownEndsAt;
	for (const second of [3, 2, 1] as const) {
		pushMark(marks, countdownEnd - second * 1000, from, to, {
			kind: "count",
			second,
		});
	}
	pushMark(marks, countdownEnd, from, to, { kind: "go" });

	const workStart = state.workStartedAt;
	const workEnd = workStart + plan.durationMs;
	const during = (at: number, cue: TimerCue) => {
		if (at < workEnd) pushMark(marks, at, from, to, cue);
	};
	if (plan.format === "emom" && plan.stations !== null) {
		for (let minute = 1; minute < plan.stations; minute++) {
			during(workStart + minute * 60_000, { kind: "minute" });
		}
	}
	if (
		plan.format === "intervalles" &&
		plan.workMs !== null &&
		plan.restMs !== null &&
		plan.stations !== null &&
		plan.restMs > 0
	) {
		const cycle = plan.workMs + plan.restMs;
		for (let station = 0; station < plan.stations; station++) {
			const workAt = workStart + station * cycle;
			if (station > 0) during(workAt, { kind: "work" });
			during(workAt + plan.workMs, { kind: "rest" });
		}
	}
	pushMark(marks, workEnd, from, to, { kind: "done" });
	marks.sort((a, b) => a.at - b.at);
	return marks.map((mark) => mark.cue);
}

function pushMark(
	marks: Mark[],
	at: number,
	from: number,
	to: number,
	cue: TimerCue,
): void {
	if (at > from && at <= to) marks.push({ at, cue });
}
