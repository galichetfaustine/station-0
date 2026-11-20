<script lang="ts">
// Îlot d'affichage du minuteur. Le calcul est dans src/lib/timer.ts.
// L'horloge est Date.now() : si le téléphone se verrouille, le temps
// continue, et au retour on relit l'heure au lieu d'ajouter des secondes.
import { onDestroy, onMount } from "svelte";
import {
	idleTimer,
	pauseTimer,
	planFromSession,
	resumeTimer,
	startTimer,
	type TimerCue,
	type TimerState,
	type TimerView,
	tapRound,
	tick,
} from "../lib/timer";
import type { WodSession } from "../lib/wod";

interface Props {
	session: WodSession;
}

const { session }: Props = $props();

const plan = $derived(planFromSession(session));

let engine = $state<TimerState>(idleTimer());
let shown = $state<TimerView>(tick(idleTimer(), 0, plan).view);
let spoken = $state("Prêt.");
let frame = 0;
let audio: AudioContext | null = null;
let sentinel: WakeLockSentinel | null = null;

$effect(() => {
	// On ne lit que la graine : lire le minuteur ici le remettrait à zéro à chaque seconde.
	const seed = session.seed;
	if (seed.length === 0) return;
	const fresh = idleTimer();
	cancelAnimationFrame(frame);
	engine = fresh;
	shown = tick(fresh, 0, plan).view;
	spoken = "Prêt.";
	void releaseScreen();
});

function formatClock(totalSeconds: number): string {
	const safe = Math.max(0, totalSeconds);
	const minutes = Math.floor(safe / 60);
	const seconds = safe % 60;
	return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

const clock = $derived(formatClock(shown.displaySeconds));

const exerciseName = $derived(
	shown.exerciseIndex === null
		? null
		: (session.exercises[shown.exerciseIndex]?.nom ?? null),
);

const status = $derived.by(() => {
	if (shown.phase === "idle") return "Prêt";
	if (shown.phase === "countdown") return "Départ dans";
	if (shown.phase === "paused") return "Pause";
	if (shown.phase === "done") return "Terminé";
	if (shown.segment === "minute" && shown.stationCount) {
		return `Minute ${(shown.stationIndex ?? 0) + 1} sur ${shown.stationCount}`;
	}
	if (shown.segment === "work" && shown.stationCount) {
		return `Travail, tour ${(shown.stationIndex ?? 0) + 1} sur ${shown.stationCount}`;
	}
	if (shown.segment === "rest" && shown.stationCount) {
		return `Repos, tour ${(shown.stationIndex ?? 0) + 1} sur ${shown.stationCount}`;
	}
	if (session.format === "amrap") return "AMRAP";
	if (session.format === "forTime") return "For Time";
	return "En cours";
});

const actionLabel = $derived(
	shown.phase === "idle"
		? "Lancer"
		: shown.phase === "paused"
			? "Reprendre"
			: shown.phase === "done"
				? "Recommencer"
				: "Pause",
);

function sameFace(a: TimerView, b: TimerView): boolean {
	return (
		a.phase === b.phase &&
		a.segment === b.segment &&
		a.displaySeconds === b.displaySeconds &&
		a.stationIndex === b.stationIndex &&
		a.exerciseIndex === b.exerciseIndex &&
		a.rounds === b.rounds
	);
}

function phrase(view: TimerView): string {
	const clockText = formatClock(view.displaySeconds).replace(":", " minutes ");
	if (view.phase === "countdown")
		return `Départ dans ${view.displaySeconds} secondes.`;
	if (view.phase === "paused") return `Pause. ${clockText} secondes.`;
	if (view.phase === "done") return `Terminé. ${clockText} secondes.`;
	if (view.phase === "idle") return "Prêt.";
	const name = exerciseName ? ` ${exerciseName}.` : "";
	return `${status}. ${clockText} secondes.${name}`;
}

function announce(view: TimerView) {
	spoken = phrase(view);
}

function apply(result: { state: TimerState; view: TimerView }) {
	const previous = shown;
	engine = result.state;
	if (!sameFace(previous, result.view)) {
		shown = result.view;
		if (
			result.view.phase !== "running" ||
			result.view.segment !== previous.segment ||
			result.view.stationIndex !== previous.stationIndex ||
			result.view.displaySeconds % 30 === 0 ||
			result.view.displaySeconds <= 3
		) {
			announce(result.view);
		}
	}
	const cue = result.view.cues.at(-1);
	if (cue) play(cue);
	if (result.view.phase === "done") void releaseScreen();
}

function loop() {
	cancelAnimationFrame(frame);
	frame = requestAnimationFrame(() => {
		const result = tick(engine, Date.now(), plan);
		apply(result);
		if (result.view.phase === "countdown" || result.view.phase === "running") {
			loop();
		}
	});
}

function armAudio() {
	if (audio) {
		void audio.resume();
		return;
	}
	const Ctx = window.AudioContext;
	if (!Ctx) return;
	audio = new Ctx();
	void audio.resume();
}

function beep(frequency: number, seconds: number) {
	if (!audio) return;
	const osc = audio.createOscillator();
	const gain = audio.createGain();
	osc.type = "sine";
	osc.frequency.value = frequency;
	const start = audio.currentTime;
	gain.gain.setValueAtTime(0.0001, start);
	gain.gain.exponentialRampToValueAtTime(0.2, start + 0.01);
	gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
	osc.connect(gain);
	gain.connect(audio.destination);
	osc.start(start);
	osc.stop(start + seconds);
}

function play(cue: TimerCue) {
	const strong = cue.kind === "go" || cue.kind === "done";
	beep(strong ? 880 : 660, strong ? 0.18 : 0.1);
	try {
		navigator.vibrate?.(strong ? [40, 30, 40] : 30);
	} catch {
		// Le téléphone refuse la vibration : la séance continue.
	}
}

async function holdScreen(): Promise<void> {
	const locks = navigator.wakeLock;
	if (!locks) return;
	try {
		sentinel = await locks.request("screen");
	} catch {
		sentinel = null;
	}
}

async function releaseScreen(): Promise<void> {
	const current = sentinel;
	sentinel = null;
	try {
		await current?.release();
	} catch {
		// Déjà relâché par le navigateur.
	}
}

function onVisible() {
	if (document.visibilityState !== "visible") return;
	const result = tick(engine, Date.now(), plan);
	apply(result);
	if (
		result.view.phase === "countdown" ||
		result.view.phase === "running" ||
		result.view.phase === "paused"
	) {
		void holdScreen();
	}
	if (result.view.phase === "countdown" || result.view.phase === "running") {
		loop();
	}
}

function primary() {
	const now = Date.now();
	const sampled = tick(engine, now, plan);
	if (shown.phase === "idle" || shown.phase === "done") {
		armAudio();
		engine = startTimer(sampled.state, now);
		apply(tick(engine, now, plan));
		void holdScreen();
		loop();
		return;
	}
	if (shown.phase === "paused") {
		armAudio();
		engine = resumeTimer(sampled.state, now);
		apply(tick(engine, now, plan));
		void holdScreen();
		loop();
		return;
	}
	apply(sampled);
	engine = pauseTimer(engine, now);
	shown = tick(engine, now, plan).view;
	cancelAnimationFrame(frame);
}

function countRound() {
	engine = tapRound(engine);
	shown = { ...shown, rounds: engine.rounds };
}

onMount(() => {
	document.addEventListener("visibilitychange", onVisible);
});

onDestroy(() => {
	cancelAnimationFrame(frame);
	document.removeEventListener("visibilitychange", onVisible);
	void releaseScreen();
	void audio?.close();
});
</script>

<div class="timer">
	<div class="clock">
		<p class="status">{status}</p>
		<p class="digits">{clock}</p>
		{#if exerciseName && (session.format === "emom" || session.format === "intervalles")}
			<p class="current">{exerciseName}</p>
		{/if}
		{#if session.format === "forTime"}
			<p class="cap">Cap {formatClock(Math.round(plan.durationMs / 1000))}</p>
		{/if}
		<p class="visually-hidden" role="timer">{spoken}</p>
	</div>

	<button class="button" type="button" onclick={primary}>{actionLabel}</button>

	{#if shown.phase !== "idle"}
		<button class="secondary" type="button" onclick={countRound}>
			Compter un tour
		</button>
		<p class="rounds">Tours : {shown.rounds}</p>
	{/if}
</div>

<style>
	.timer {
		display: grid;
		gap: var(--space-3);
	}

	.clock {
		display: grid;
		justify-items: center;
		gap: var(--space-2);
		padding: var(--space-4) var(--space-3);
		border-radius: var(--radius);
		background: var(--color-action-bg);
		color: var(--color-action-text);
		text-align: center;
	}

	.status,
	.digits,
	.current,
	.cap,
	.rounds {
		margin: 0;
	}

	.digits {
		font-family: var(--font-title);
		font-weight: 800;
		font-size: clamp(5.5rem, 28vw, 10rem);
		line-height: 0.8;
		letter-spacing: -0.03em;
		font-variant-numeric: tabular-nums;
	}

	.status,
	.current,
	.cap {
		font-weight: 700;
	}

	.current {
		font-size: clamp(1.5rem, 6vw, 2.25rem);
	}

	.timer :global(.button),
	.secondary {
		width: 100%;
	}

	.secondary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: var(--tap-min);
		min-width: var(--tap-min);
		padding: var(--space-2) var(--space-4);
		border: 1px solid var(--color-line);
		border-radius: 999px;
		background: var(--color-surface);
		color: var(--color-text);
		font: inherit;
		font-weight: 700;
	}

	.rounds {
		font-weight: 700;
	}

	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
</style>
