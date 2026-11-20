import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	COUNTDOWN_MS,
	idleTimer,
	pauseTimer,
	planFromSession,
	resumeTimer,
	startTimer,
	type TimerCue,
	type TimerPlan,
	type TimerState,
	tapRound,
	tick,
} from "./timer.ts";

function amrap(seconds = 20 * 60): TimerPlan {
	return planFromSession({
		format: "amrap",
		sessionSeconds: seconds,
		restSeconds: null,
		stations: null,
		exercises: [{}, {}, {}],
	});
}

function cueNames(cues: readonly TimerCue[]): string[] {
	return cues.map((cue) =>
		cue.kind === "count" ? `count-${cue.second}` : cue.kind,
	);
}

function sample(state: TimerState, from: number, to: number, plan: TimerPlan) {
	let current = state;
	const heard: string[] = [];
	for (let now = from; now <= to; now += 100) {
		const result = tick(current, now, plan);
		current = result.state;
		heard.push(...cueNames(result.view.cues));
	}
	return { state: current, heard };
}

describe("planFromSession", () => {
	it("lit le travail et le repos des intervalles sur la séance", () => {
		const plan = planFromSession({
			format: "intervalles",
			sessionSeconds: 120,
			restSeconds: 20,
			stations: 2,
			exercises: [{}, {}],
		});
		expect(plan.workMs).toBe(40_000);
		expect(plan.restMs).toBe(20_000);
		expect(plan.durationMs).toBe(120_000);
		expect(plan.stations).toBe(2);
	});
});

describe("décompte, pause, tours", () => {
	it("bip à 3, à 2, à 1 et au départ, chacun une seule fois", () => {
		const started = startTimer(idleTimer(), 0);
		const { heard, state } = sample(started, 0, COUNTDOWN_MS, amrap());
		expect(heard).toEqual(["count-3", "count-2", "count-1", "go"]);
		expect(state.mode).toBe("active");
		expect(tick(state, COUNTDOWN_MS, amrap()).view.elapsedMs).toBe(0);
	});

	it("un saut d'horloge pendant le décompte émet les bips manqués dans l'ordre", () => {
		const started = startTimer(idleTimer(), 0);
		const jumped = tick(started, COUNTDOWN_MS, amrap());
		expect(cueNames(jumped.view.cues)).toEqual([
			"count-3",
			"count-2",
			"count-1",
			"go",
		]);
	});

	it("la pause gèle le décompte, la reprise le continue", () => {
		const plan = amrap();
		let state = startTimer(idleTimer(), 0);
		state = tick(state, 4_000, plan).state;
		state = pauseTimer(state, 4_000);
		const frozen = tick(state, 64_000, plan).view;
		expect(frozen.phase).toBe("paused");
		expect(frozen.displaySeconds).toBe(6);

		state = resumeTimer(state, 64_000);
		const continued = tick(state, 64_000 + 6_000, plan).view;
		expect(continued.phase).toBe("running");
		expect(continued.elapsedMs).toBe(0);
	});

	it("la pause ne compte pas dans les 20 minutes de séance", () => {
		const plan = amrap();
		let state = startTimer(idleTimer(), 0);
		const runningAt = COUNTDOWN_MS + 5 * 60 * 1000;
		state = tick(state, runningAt, plan).state;
		state = pauseTimer(state, runningAt);
		state = tick(state, runningAt + 10 * 60 * 1000, plan).state;
		expect(tick(state, runningAt + 10 * 60 * 1000, plan).view.elapsedMs).toBe(
			5 * 60 * 1000,
		);
		state = resumeTimer(state, runningAt + 10 * 60 * 1000);
		const later = runningAt + 10 * 60 * 1000 + 60_000;
		expect(tick(state, later, plan).view.elapsedMs).toBe(6 * 60 * 1000);
	});

	it("le compteur de tours n'augmente qu'au tap, et un nouveau départ le remet à zéro", () => {
		let state = startTimer(idleTimer(), 0);
		expect(tapRound(idleTimer()).rounds).toBe(0);
		state = tapRound(state);
		state = tapRound(state);
		expect(state.rounds).toBe(2);
		expect(tick(state, 1_000, amrap()).view.rounds).toBe(2);
		const finished = tick(state, amrap().durationMs + COUNTDOWN_MS, amrap());
		expect(startTimer(finished.state, finished.view.elapsedMs).rounds).toBe(0);
	});
});

describe("formats", () => {
	it("AMRAP compte à rebours sur toute la durée, puis s'arrête", () => {
		const plan = amrap(15 * 60);
		const state = startTimer(idleTimer(), 0);
		const mid = tick(state, COUNTDOWN_MS + 1_000, plan).view;
		expect(mid.segment).toBe("remaining");
		expect(mid.displaySeconds).toBe(15 * 60 - 1);
		const done = tick(state, COUNTDOWN_MS + plan.durationMs, plan).view;
		expect(done.phase).toBe("done");
		expect(done.displaySeconds).toBe(0);
		expect(done.cues.map((cue) => cue.kind)).toContain("done");
	});

	it("EMOM change d'exercice chaque minute et bip à la minute", () => {
		const plan = planFromSession({
			format: "emom",
			sessionSeconds: 180,
			restSeconds: null,
			stations: 3,
			exercises: [{}, {}, {}],
		});
		let state = startTimer(idleTimer(), 0);
		const atMinute = COUNTDOWN_MS + 60_000;
		const first = tick(state, atMinute - 1_000, plan).view;
		expect(first.exerciseIndex).toBe(0);
		expect(first.displaySeconds).toBe(1);
		const next = tick(
			tick(state, atMinute - 1_000, plan).state,
			atMinute,
			plan,
		);
		expect(next.view.exerciseIndex).toBe(1);
		expect(next.view.displaySeconds).toBe(60);
		expect(cueNames(next.view.cues)).toEqual(["minute"]);
		state = tick(state, COUNTDOWN_MS + plan.durationMs, plan).state;
		expect(tick(state, COUNTDOWN_MS + plan.durationMs, plan).view.phase).toBe(
			"done",
		);
	});

	it("For Time monte jusqu'au cap de la séance", () => {
		const plan = planFromSession({
			format: "forTime",
			sessionSeconds: 90,
			restSeconds: null,
			stations: null,
			exercises: [{}],
		});
		const state = startTimer(idleTimer(), 0);
		const mid = tick(state, COUNTDOWN_MS + 65_000, plan).view;
		expect(mid.segment).toBe("elapsed");
		expect(mid.displaySeconds).toBe(65);
		const done = tick(state, COUNTDOWN_MS + 90_000, plan).view;
		expect(done.phase).toBe("done");
		expect(done.displaySeconds).toBe(90);
	});

	it("Intervalles alterne 40 s de travail et 20 s de repos", () => {
		const plan = planFromSession({
			format: "intervalles",
			sessionSeconds: 120,
			restSeconds: 20,
			stations: 2,
			exercises: [{}, {}],
		});
		const state = startTimer(idleTimer(), 0);
		const work = tick(state, COUNTDOWN_MS + 39_000, plan).view;
		expect(work.segment).toBe("work");
		expect(work.exerciseIndex).toBe(0);
		expect(work.displaySeconds).toBe(1);
		const rest = tick(state, COUNTDOWN_MS + 45_000, plan).view;
		expect(rest.segment).toBe("rest");
		expect(rest.displaySeconds).toBe(15);
		const second = tick(state, COUNTDOWN_MS + 60_000, plan).view;
		expect(second.segment).toBe("work");
		expect(second.exerciseIndex).toBe(1);
		const jumped = tick(state, COUNTDOWN_MS + 40_000, plan);
		expect(cueNames(jumped.view.cues)).toContain("rest");
	});
});

describe("dérive", () => {
	it("reste à moins d'une seconde de l'horloge sur 20 minutes", () => {
		const plan = amrap(20 * 60);
		const target = 20 * 60 * 1000 - 250;
		const jumped = tick(
			startTimer(idleTimer(), 0),
			COUNTDOWN_MS + target,
			plan,
		);
		expect(jumped.view.phase).toBe("running");
		expect(Math.abs(jumped.view.elapsedMs - target)).toBeLessThan(1000);
		expect(jumped.view.elapsedMs).toBe(target);

		// Des écarts irréguliers, comme un onglet ralenti. Un minuteur qui
		// ajouterait une seconde par tour serait loin de l'horloge.
		const gaps = [16, 200, 1_200, 50, 4_000, 30];
		let now = 0;
		let state = startTimer(idleTimer(), now);
		const end = COUNTDOWN_MS + 20 * 60 * 1000;
		let step = 0;
		while (now < end) {
			const gap = gaps[step % gaps.length] ?? 16;
			step += 1;
			now = Math.min(end, now + gap);
			state = tick(state, now, plan).state;
		}
		const finished = tick(state, now, plan).view;
		expect(finished.phase).toBe("done");
		expect(Math.abs(finished.elapsedMs - 20 * 60 * 1000)).toBeLessThan(1000);
		expect(finished.elapsedMs).toBe(20 * 60 * 1000);
	});
});

describe("pas de compteur bricolé", () => {
	it("le minuteur n'utilise ni setInterval ni Math.random", () => {
		const files = ["./timer.ts", "../components/WodTimer.svelte"];
		for (const file of files) {
			const source = readFileSync(new URL(file, import.meta.url), "utf8");
			expect(source.includes("setInterval")).toBe(false);
			expect(source.includes("Math.random")).toBe(false);
		}
	});
});
