<script lang="ts">
// Îlot du catalogue (US1.1, US1.4) : la liste est rendue au build, les filtres s'activent avec JavaScript.
// Au chargement, la date du jour remplace celle du build : une date passée depuis n'est jamais affichée.
import { onMount } from "svelte";
import { CATEGORIES, CATEGORY_LABELS, formatNote } from "../lib/bareme";
import {
	applyFilters,
	type CatalogueFilters,
	type CatalogueRace,
	COUNTRY_VALUES,
	DEFAULT_FILTERS,
	nextEvent,
	parseFilters,
	serializeFilters,
} from "../lib/catalogue";
import { COUNTRY_LABELS, formatEventDates, todayInParis } from "../lib/dates";
import { withBase } from "../lib/paths";
import Gauge from "./Gauge.svelte";

interface Props {
	races: CatalogueRace[];
	/** Sous-dossier du site, pour les liens vers les fiches. */
	base: string;
	/** Date du build (AAAA-MM-JJ), remplacée par la date du jour dans le navigateur. */
	buildDate: string;
}
const { races, base, buildDate }: Props = $props();

let filters = $state<CatalogueFilters>({ ...DEFAULT_FILTERS });
let ready = $state(false);
let today = $state(buildDate);
const visible = $derived(applyFilters(races, filters, today));

const FORMAT_LABELS = {
	solo: "Solo",
	duo: "Duo",
	relais: "Relais",
	equipe: "Équipe",
} as const;

type Dot = "full" | "half" | "empty";

/** 5 pastilles à partir de la note (elle reste aussi écrite à côté). */
function dots(note: number | null): Dot[] {
	return [0, 1, 2, 3, 4].map((index) => {
		if (note === null || note < index + 0.5) return "empty";
		if (note < index + 1) return "half";
		return "full";
	});
}

onMount(() => {
	filters = parseFilters(new URLSearchParams(window.location.search));
	today = todayInParis();
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
			Pays
			<select
				value={filters.pays ?? ""}
				onchange={(event) => (filters.pays = (event.currentTarget.value || null) as CatalogueFilters["pays"])}
			>
				<option value="">Tous</option>
				{#each COUNTRY_VALUES as code (code)}
					<option value={code}>{COUNTRY_LABELS[code]}</option>
				{/each}
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

		<label class="choice">
			<input type="checkbox" checked={filters.dans3Mois} onchange={(event) => (filters.dans3Mois = event.currentTarget.checked)} />
			Date dans les 3 mois
		</label>
	</form>
{/if}

<p class="count" aria-live="polite">{visible.length} {visible.length > 1 ? "courses" : "course"}</p>

<ul class="cards">
	{#each visible as race (race.slug)}
		{@const next = nextEvent(race, today)}
		<li class="card">
			<div class="head">
				<div>
					<h2><a href={withBase(base, `/courses/${race.slug}/`)}>{race.nom}</a></h2>
					<p class="meta">{race.organisateur} · {race.duree}</p>
				</div>
				{#if race.noteGlobale === null}
					<p class="global pending">Note à venir — règlement non public</p>
				{:else}
					<p class="global">
						<span class="dots" aria-hidden="true">
							{#each dots(race.noteGlobale) as dot, index (index)}
								<i class={dot}></i>
							{/each}
						</span>
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
			{#if next}
				<p class="next">
					Prochaine date : <strong>{formatEventDates(next)}</strong> · {next.ville} ({COUNTRY_LABELS[next.pays]})
				</p>
			{:else}
				<p class="next none">Pas de date annoncée</p>
			{/if}
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
		accent-color: var(--color-text);
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
		max-width: 42rem;
		margin: 0;
		padding: 0;
		list-style: none;
		border-bottom: 1px solid var(--color-line);
	}

	.card {
		position: relative;
		display: grid;
		gap: var(--space-3);
		padding-block: var(--space-4);
		border-top: 1px solid var(--color-line);
		background: transparent;
	}

	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2) var(--space-3);
	}

	h2 {
		font-size: clamp(1.75rem, 4vw, 2.25rem);
		margin-bottom: var(--space-1);
	}

	h2 a {
		text-decoration: none;
	}

	/* Toute la ligne est cliquable via le lien du titre. */
	h2 a::after {
		content: "";
		position: absolute;
		inset: 0;
	}

	h2 a:hover {
		text-decoration: underline;
	}

	.meta {
		margin: 0;
		color: var(--color-text-muted);
		font-size: 0.875rem;
	}

	.global {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		margin: 0;
		font-family: var(--font-title);
		font-weight: 800;
		line-height: 1;
		white-space: nowrap;
	}

	.dots {
		display: inline-flex;
		gap: 5px;
	}

	.dots i {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--color-text);
	}

	.dots i.empty {
		background: transparent;
		box-shadow: inset 0 0 0 1.5px var(--color-line);
	}

	.dots i.half {
		background: linear-gradient(90deg, var(--color-text) 50%, transparent 50%);
		box-shadow: inset 0 0 0 1.5px var(--color-text);
	}

	.global.pending {
		max-width: 16rem;
		font-family: var(--font-text);
		font-weight: 600;
		font-size: 0.875rem;
		line-height: 1.3;
		white-space: normal;
		color: var(--color-text-muted);
	}

	.global-value {
		font-size: 1.5rem;
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

	.next {
		margin: 0;
		font-size: 0.875rem;
	}

	.next.none {
		color: var(--color-text-muted);
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
