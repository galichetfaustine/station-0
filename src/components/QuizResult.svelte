<script lang="ts">
// Affichage du résultat (US2.3). Le choix de la course est déjà fait dans src/lib/quiz.ts.
import { CATEGORY_LABELS } from "../lib/bareme";
import { COUNTRY_LABELS, formatEventDates, upcomingEvents } from "../lib/dates";
import { withBase } from "../lib/paths";
import type { QuizExplanation } from "../lib/quiz";
import type { RaceEvent } from "../lib/schemas";

interface Props {
	result: QuizExplanation;
	events: RaceEvent[];
	today: string;
	base: string;
	editHref: string;
	onedit: () => void;
}
const { result, events, today, base, editHref, onedit }: Props = $props();

const course = $derived(result.course);
const alternative = $derived(result.alternative);

function formatScore(score: number): string {
	return `${score.toLocaleString("fr-FR")} %`;
}

function nextDate(slug: string): string {
	const next = upcomingEvents(events, slug, today)[0];
	if (!next) return "Pas de date annoncée";
	return `${formatEventDates(next)} · ${next.ville} (${COUNTRY_LABELS[next.pays]})`;
}
</script>

<article class="result">
	<header class="band">
		<p class="kicker">
			{result.plancher
				? "Pas encore, mais voici par où commencer"
				: "Course recommandée"}
		</p>
		<h2 id="recommandation" tabindex="-1">{course.nom}</h2>
		<p class="score">Score : {formatScore(course.score)}</p>
	</header>

	<section aria-labelledby="pourquoi">
		<h3 id="pourquoi">Pourquoi elle te va</h3>
		<ul>
			{#each course.pourquoi as category (category)}
				<li>{CATEGORY_LABELS[category]}</li>
			{/each}
		</ul>
	</section>

	{#if course.pointAttention}
		<section aria-labelledby="attention">
			<h3 id="attention">Point d'attention</h3>
			<p>{CATEGORY_LABELS[course.pointAttention]}</p>
		</section>
	{/if}

	<section aria-labelledby="date">
		<h3 id="date">Prochaine date</h3>
		<p>{nextDate(course.slug)}</p>
	</section>

	<a class="button" href={withBase(base, `/courses/${course.slug}/`)}>Voir la fiche</a>

	{#if alternative}
		<section aria-labelledby="alternative">
			<h3 id="alternative">Alternative</h3>
			<p class="alt-line">
				<a class="alt-name" href={withBase(base, `/courses/${alternative.slug}/`)}>
					{alternative.nom}
				</a>
				<span>{formatScore(alternative.score)}</span>
			</p>
			<p>Prochaine date : {nextDate(alternative.slug)}</p>
		</section>
	{/if}

	<div class="links">
		<a class="text-link" href={withBase(base, "/wod/")}>WOD pour progresser</a>
		<a
			class="text-link"
			href={editHref}
			onclick={(event) => {
				event.preventDefault();
				onedit();
			}}
		>
			Modifier mes réponses
		</a>
	</div>
</article>

<style>
	.result {
		display: grid;
		gap: var(--space-5);
		max-width: 40rem;
		margin-top: var(--space-5);
	}

	.band {
		display: grid;
		gap: var(--space-3);
		margin-inline: calc(-1 * var(--space-3));
		padding: var(--space-5) var(--space-3);
		border-radius: 0 0 var(--radius) var(--radius);
	}

	.kicker,
	.score,
	p {
		margin: 0;
	}

	.kicker {
		font-weight: 600;
	}

	h2,
	h3 {
		margin: 0;
	}

	h2 {
		max-width: 8ch;
		font-size: clamp(4.25rem, 12vw, 6.75rem);
		line-height: 0.86;
		letter-spacing: -0.03em;
		text-wrap: balance;
	}

	h3 {
		font-size: clamp(1.35rem, 3vw, 1.75rem);
		letter-spacing: -0.02em;
	}

	.score {
		font-family: var(--font-title);
		font-size: clamp(2rem, 5vw, 2.75rem);
		font-weight: 800;
		line-height: 1;
	}

	section {
		display: grid;
		gap: var(--space-3);
	}

	section p {
		max-width: 36rem;
		font-size: 1.125rem;
	}

	ul {
		display: grid;
		margin: 0;
		padding: 0;
		list-style: none;
		border-bottom: 1px solid var(--color-line);
	}

	li {
		padding-block: var(--space-3);
		border-top: 1px solid var(--color-line);
		font-family: var(--font-title);
		font-size: clamp(1.35rem, 4vw, 1.75rem);
		font-weight: 800;
		line-height: 1.05;
		letter-spacing: 0.01em;
		text-transform: uppercase;
	}

	.button {
		justify-self: start;
	}

	.alt-line {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--space-2) var(--space-3);
	}

	.alt-name {
		display: inline-flex;
		align-items: center;
		min-height: var(--tap-min);
		font-family: var(--font-title);
		font-size: clamp(1.75rem, 4vw, 2.25rem);
		font-weight: 800;
		line-height: 1;
		letter-spacing: 0.01em;
		text-transform: uppercase;
		text-decoration: none;
	}

	.alt-name:hover {
		text-decoration: underline;
		text-underline-offset: 0.12em;
	}

	.alt-line span {
		font-family: var(--font-title);
		font-size: 1.5rem;
		font-weight: 800;
	}

	.links {
		display: grid;
		justify-items: start;
		gap: var(--space-1);
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
