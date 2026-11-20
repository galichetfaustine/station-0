<script lang="ts">
// Îlot du quiz (US2.2, US2.3). Les textes, le profil et le résultat vivent dans src/lib/quiz.ts.
// Avec JavaScript : une question à la fois, puis le résultat. Sans : les 7 questions dans l'adresse.
import { onMount } from "svelte";
import { todayInParis } from "../lib/dates";
import {
	emptyQuizAnswers,
	explainQuiz,
	parseQuizSearch,
	profileFromAnswers,
	QUIZ_QUESTIONS,
	type QuizAnswerMap,
	type QuizFacts,
	rankRaces,
	serializeQuizSearch,
} from "../lib/quiz";
import type { QuizConfig, RaceEvent } from "../lib/schemas";
import QuizResult from "./QuizResult.svelte";

interface Props {
	/** Adresse du formulaire, pour le fonctionnement sans JavaScript. */
	action: string;
	base: string;
	races: QuizFacts[];
	events: RaceEvent[];
	config: QuizConfig;
	/** Date du build, remplacée par la date du jour dans le navigateur. */
	buildDate: string;
}
const { action, base, races, events, config, buildDate }: Props = $props();

const total = QUIZ_QUESTIONS.length;
let answers = $state<QuizAnswerMap>(emptyQuizAnswers());
let step = $state(1);
let ready = $state(false);
let showResult = $state(false);
let today = $state(buildDate);

const profile = $derived(profileFromAnswers(answers));
const result = $derived(
	profile
		? explainQuiz(
				profile,
				rankRaces(profile, races, events, config, today),
				races,
				config,
			)
		: null,
);
const editHref = $derived(
	`${action}?${serializeQuizSearch(answers, 1).toString()}`,
);

onMount(() => {
	const parsed = parseQuizSearch(new URLSearchParams(window.location.search));
	answers = parsed.answers;
	step = parsed.etape ?? 1;
	today = todayInParis();
	showResult =
		profileFromAnswers(parsed.answers) !== null && parsed.etape === null;
	ready = true;
});

$effect(() => {
	if (!ready) return;
	const query = serializeQuizSearch(
		answers,
		showResult ? null : step,
	).toString();
	const url = `${window.location.pathname}${query ? `?${query}` : ""}`;
	const current = `${window.location.pathname}${window.location.search}`;
	if (url !== current) window.history.replaceState(null, "", url);
});

function focusQuestion() {
	queueMicrotask(() => document.getElementById("quiz-question")?.focus());
}

function focusResult() {
	queueMicrotask(() => document.getElementById("recommandation")?.focus());
}

function choose(id: (typeof QUIZ_QUESTIONS)[number]["id"], value: string) {
	answers[id] = value;
}

function editAnswers() {
	delete document.documentElement.dataset.quizResultat;
	showResult = false;
	step = 1;
	focusQuestion();
}
</script>

{#if showResult && result}
	<QuizResult {result} {events} {today} {base} {editHref} onedit={editAnswers} />
{:else if showResult}
	<p class="empty">Aucune course notée ne correspond à ce format.</p>
	<p><a class="text-link" href={editHref} onclick={(event) => { event.preventDefault(); editAnswers(); }}>Modifier mes réponses</a></p>
{:else}
<form
	method="get"
	{action}
	autocomplete="off"
	onsubmit={(event) => {
		if (!ready) return;
		event.preventDefault();
		if (step < total) {
			step += 1;
			focusQuestion();
		} else if (profile) {
			showResult = true;
			document.documentElement.dataset.quizResultat = "1";
			focusResult();
		}
	}}
>
	{#if ready}
		<p id="quiz-progress">Question {step} sur {total}</p>
		<progress value={step} max={total} aria-labelledby="quiz-progress"></progress>
	{/if}

	{#each QUIZ_QUESTIONS as question, index (question.id)}
		<fieldset hidden={ready && index !== step - 1}>
			<legend
				id={ready && index === step - 1 ? "quiz-question" : undefined}
				tabindex="-1"
			>
				{#if ready}
					<span class="visually-hidden">Question {index + 1} sur {total}. </span>
				{/if}
				{question.prompt}
			</legend>
			{#each question.options as option (option.value)}
				<label class="choice">
					<input
						type="radio"
						name={question.id}
						value={option.value}
						checked={answers[question.id] === option.value}
						required={!ready || index === step - 1}
						onchange={() => choose(question.id, option.value)}
					/>
					<span class="label">{option.label}</span>
					{#if answers[question.id] === option.value}
						<span class="chosen">Choisie</span>
					{/if}
				</label>
			{/each}
		</fieldset>
	{/each}

	<div class="actions">
		{#if !ready || step < total}
			<button class="button" type="submit">Continuer</button>
		{:else}
			<button class="button" type="submit">Voir ma course</button>
		{/if}
		{#if ready && step > 1}
			<button
				class="back"
				type="button"
				onclick={() => {
					step -= 1;
					focusQuestion();
				}}
			>
				Retour
			</button>
		{/if}
	</div>
</form>
{/if}

<style>
	:global(html[data-quiz-resultat="1"]) form {
		display: none;
	}

	form {
		display: grid;
		gap: var(--space-4);
		max-width: 40rem;
		margin-top: var(--space-5);
	}

	#quiz-progress {
		margin: 0 0 calc(-1 * var(--space-3));
		color: var(--color-text-muted);
		font-weight: 600;
	}

	progress {
		width: 100%;
		height: 0.35rem;
		border: 0;
		border-radius: 999px;
		background: var(--color-surface);
		color: var(--color-text);
	}

	progress::-webkit-progress-bar {
		background: var(--color-surface);
		border-radius: 999px;
	}

	progress::-webkit-progress-value {
		background: var(--color-text);
		border-radius: 999px;
	}

	progress::-moz-progress-bar {
		background: var(--color-text);
		border-radius: 999px;
	}

	fieldset {
		display: grid;
		gap: 0;
		margin: 0;
		padding: 0;
		border: 0;
		border-bottom: 1px solid var(--color-line);
		min-inline-size: 0;
	}

	/* Le style ci-dessus gagne sur l'attribut hidden : on le rétablit. */
	fieldset[hidden] {
		display: none;
	}

	legend {
		max-width: 14ch;
		margin: 0 0 var(--space-4);
		padding: 0;
		font-family: var(--font-title);
		font-size: clamp(2.75rem, 8vw, 4.5rem);
		font-weight: 800;
		line-height: 0.92;
		letter-spacing: -0.03em;
		text-transform: none;
		text-wrap: balance;
	}

	.choice {
		position: relative;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2) var(--space-3);
		min-height: var(--tap-min);
		padding-block: var(--space-3);
		border-top: 1px solid var(--color-line);
		cursor: pointer;
	}

	/* Ligne choisie : trait plus fort et le mot « Choisie », pas seulement une couleur. */
	.choice:has(:checked) {
		background: var(--color-surface);
		box-shadow:
			inset 0 2px 0 var(--color-text),
			inset 0 -2px 0 var(--color-text);
	}

	.label {
		font-family: var(--font-title);
		font-size: clamp(1.35rem, 4vw, 1.75rem);
		font-weight: 800;
		line-height: 1.05;
		letter-spacing: 0.01em;
		text-transform: uppercase;
	}

	@media (hover: hover) {
		.choice:hover .label {
			text-decoration: underline;
			text-underline-offset: 0.12em;
		}
	}

	/* Case native invisible, étirée sur la ligne : le clic et le focus couvrent toute la réponse. */
	input {
		position: absolute;
		z-index: 1;
		inset: 0;
		width: 100%;
		height: 100%;
		margin: 0;
		appearance: none;
		border: 0;
		background: transparent;
		cursor: pointer;
	}

	.chosen {
		margin-left: auto;
		font-weight: 700;
	}

	.actions {
		display: grid;
		justify-items: start;
		gap: var(--space-2);
		margin-top: var(--space-2);
	}

	.back {
		display: inline-flex;
		align-items: center;
		min-height: var(--tap-min);
		min-width: var(--tap-min);
		padding: 0;
		border: 0;
		background: none;
		color: var(--color-text-muted);
		font: inherit;
		font-weight: 600;
		text-decoration: underline;
		text-underline-offset: 0.25em;
		cursor: pointer;
	}

	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}

	.empty {
		max-width: 36rem;
		font-size: 1.25rem;
	}

	.text-link {
		display: inline-flex;
		align-items: center;
		min-height: var(--tap-min);
		min-width: var(--tap-min);
		color: var(--color-text-muted);
		text-underline-offset: 0.25em;
	}
</style>
