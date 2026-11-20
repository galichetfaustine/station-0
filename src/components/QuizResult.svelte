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
			<p>
				<a class="text-link" href={withBase(base, `/courses/${alternative.slug}/`)}>
					{alternative.nom}
				</a>
				· {formatScore(alternative.score)}
			</p>
			<p>Prochaine date : {nextDate(alternative.slug)}</p>
		</section>
	{/if}

	<p>
		<a class="text-link" href={withBase(base, "/wod/")}>WOD pour progresser</a>
	</p>
	<p>
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
	</p>
</article>

<style>
	.result {
		display: grid;
		gap: var(--space-4);
		max-width: 36rem;
	}

	.band {
		display: grid;
		gap: var(--space-2);
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

	.score {
		font-family: var(--font-title);
		font-size: 2.5rem;
		font-weight: 800;
		line-height: 1;
	}

	ul {
		margin: var(--space-2) 0 0;
		padding-left: 1.25rem;
	}

	.button {
		justify-self: start;
	}

	.text-link {
		display: inline-flex;
		align-items: center;
		min-height: var(--tap-min);
		min-width: var(--tap-min);
	}
</style>
