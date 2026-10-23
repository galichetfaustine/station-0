<script lang="ts">
// Îlot du catalogue (US1.1) : la liste est rendue au build, les filtres s'activent avec JavaScript.
import { onMount } from "svelte";
import { CATEGORIES, CATEGORY_LABELS, formatNote } from "../lib/bareme";
import {
	applyFilters,
	type CatalogueFilters,
	type CatalogueRace,
	DEFAULT_FILTERS,
	parseFilters,
	serializeFilters,
} from "../lib/catalogue";
import Gauge from "./Gauge.svelte";

interface Props {
	races: CatalogueRace[];
}
const { races }: Props = $props();

let filters = $state<CatalogueFilters>({ ...DEFAULT_FILTERS });
let ready = $state(false);
const visible = $derived(applyFilters(races, filters));

const FORMAT_LABELS = {
	solo: "Solo",
	duo: "Duo",
	relais: "Relais",
	equipe: "Équipe",
} as const;

onMount(() => {
	filters = parseFilters(new URLSearchParams(window.location.search));
	ready = true;
});

$effect(() => {
	if (!ready) return;
	const query = serializeFilters(filters).toString();
	const url = `${window.location.pathname}${query ? `?${query}` : ""}`;
	window.history.replaceState(null, "", url);
});
</script>

{#if ready}
	<form class="filters" aria-label="Filtrer les courses" onsubmit={(event) => event.preventDefault()}>
		<fieldset>
			<legend>Format</legend>
			{#each [["", "Tous"], ["solo", "Solo"], ["duo", "Duo"], ["equipe", "Équipe"]] as [value, label] (value)}
				<label class="choice">
					<input
						type="radio"
						name="format"
						{value}
						checked={(filters.format ?? "") === value}
						onchange={() => (filters.format = (value || null) as CatalogueFilters["format"])}
					/>
					{label}
				</label>
			{/each}
		</fieldset>

		<label class="field">
			Difficulté maximale
			<select
				value={filters.noteMax === null ? "" : String(filters.noteMax)}
				onchange={(event) => {
					const value = event.currentTarget.value;
					filters.noteMax = value ? Number(value) : null;
				}}
			>
				<option value="">Toutes</option>
				{#each [1, 2, 3, 4, 5] as max (max)}
					<option value={String(max)}>Jusqu'à {max}/5</option>
				{/each}
			</select>
		</label>

		<label class="field">
			Type
			<select
				value={filters.type ?? ""}
				onchange={(event) => (filters.type = (event.currentTarget.value || null) as CatalogueFilters["type"])}
			>
				<option value="">Tous</option>
				<option value="hybride">Hybride</option>
				<option value="obstacles">Course à obstacles</option>
			</select>
		</label>

		<label class="field">
			Trier par
			<select
				value={filters.tri}
				onchange={(event) => (filters.tri = event.currentTarget.value as CatalogueFilters["tri"])}
			>
				<option value="date">Prochaine date</option>
				<option value="difficulte">Difficulté croissante</option>
			</select>
		</label>

		<label class="choice">
			<input type="checkbox" checked={filters.sansCourse} onchange={(event) => (filters.sansCourse = event.currentTarget.checked)} />
			Sans course à pied
		</label>
	</form>
{/if}

<p class="count" aria-live="polite">{visible.length} {visible.length > 1 ? "courses" : "course"}</p>

<ul class="cards">
	{#each visible as race (race.slug)}
		<li class="card">
			<div class="head">
				<div>
					<h2>{race.nom}</h2>
					<p class="meta">{race.organisateur} · {race.duree}</p>
				</div>
				{#if race.noteGlobale === null}
					<p class="global pending">Note à venir — règlement non public</p>
				{:else}
					<p class="global">
						<span class="global-value">{formatNote(race.noteGlobale)}</span><span class="global-max">/5</span>
						<span class="visually-hidden">de difficulté globale</span>
					</p>
				{/if}
			</div>
			<div class="gauges">
				<Gauge label="Globale" note={race.noteGlobale} />
				{#each CATEGORIES as category (category)}
					<Gauge label={CATEGORY_LABELS[category]} note={race.notes[category].note} />
				{/each}
			</div>
			<ul class="badges" aria-label="Formats de participation">
				{#each race.formats as format (format)}
					<li class={format === "solo" ? "badge" : "badge-duo"}>{FORMAT_LABELS[format]}</li>
				{/each}
				{#if race.typeCourse === "obstacles"}
					<li class="badge badge-obstacles">Course à obstacles</li>
				{/if}
			</ul>
		</li>
	{:else}
		<li class="empty">Aucune course ne correspond à ces filtres.</li>
	{/each}
</ul>

<style>
	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		align-items: end;
		margin-bottom: var(--space-4);
	}

	fieldset {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-3);
		border: 0;
		padding: 0;
		margin: 0;
	}

	legend,
	.field {
		font-size: 0.875rem;
		color: var(--color-text-muted);
	}

	.field {
		display: grid;
		gap: var(--space-1);
	}

	.choice {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		min-height: var(--tap-min);
	}

	input {
		width: 1.25rem;
		height: 1.25rem;
		accent-color: var(--color-action-bg);
	}

	select {
		min-height: var(--tap-min);
		padding-inline: var(--space-2);
		border: 1px solid var(--color-line);
		border-radius: 0.5rem;
		background: var(--color-surface);
		color: var(--color-text);
		font: inherit;
	}

	.count {
		color: var(--color-text-muted);
	}

	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 20rem), 1fr));
		gap: var(--space-3);
		padding: 0;
		list-style: none;
	}

	.card {
		display: grid;
		gap: var(--space-3);
		padding: var(--space-4);
		border-radius: var(--radius);
		background: var(--color-surface);
		border: 1px solid var(--color-line);
	}

	.head {
		display: flex;
		justify-content: space-between;
		gap: var(--space-3);
	}

	h2 {
		font-size: 1.75rem;
		margin-bottom: var(--space-1);
	}

	.meta {
		margin: 0;
		color: var(--color-text-muted);
		font-size: 0.875rem;
	}

	.global {
		margin: 0;
		font-family: var(--font-title);
		font-weight: 800;
		line-height: 1;
		white-space: nowrap;
	}

	.global.pending {
		max-width: 9rem;
		font-family: var(--font-text);
		font-weight: 600;
		font-size: 0.875rem;
		line-height: 1.3;
		white-space: normal;
		text-align: right;
		color: var(--color-text-muted);
	}

	.global-value {
		font-size: 3rem;
	}

	.global-max {
		font-size: 1.25rem;
		color: var(--color-text-muted);
	}

	.gauges {
		display: grid;
		gap: var(--space-1);
	}

	.badges {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		padding: 0;
		margin: 0;
		list-style: none;
	}

	.badge {
		padding: var(--space-1) var(--space-2);
		border: 1px solid var(--color-line);
		border-radius: 999px;
		font-size: 0.875rem;
		font-weight: 600;
	}

	.empty {
		color: var(--color-text-muted);
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
