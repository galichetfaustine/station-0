<script lang="ts">
// Îlot du générateur (US3.3). Le tirage vit dans src/lib/wod.ts.
// La graine et les verrous vivent dans l'adresse : le même lien redonne la même séance.
import { onMount } from "svelte";
import type { Exercise, WodConfig } from "../lib/schemas";
import { generateWod, type WodSession } from "../lib/wod";
import {
	describeSession,
	EQUIPMENT_LABEL,
	FORMAT_LABEL,
	LEVEL_LABEL,
	locksFromSelection,
	MIX,
	parseWodSearch,
	seedFromBytes,
	serializeWodSearch,
	toGeneratorLocks,
	type WodAddressLocks,
	type WodRaceOption,
} from "../lib/wod-page";

interface Props {
	exercises: Exercise[];
	races: WodRaceOption[];
	config: WodConfig;
}

const { exercises, races, config }: Props = $props();

let ready = $state(false);
let seed = $state<string | null>(null);
let cap = $state("");
let course = $state("");
let level = $state("debutant");
let equipment = $state("");
let format = $state("");
let session = $state<WodSession | null>(null);
let error = $state<string | null>(null);
let shareHref = $state("");
let copyMessage = $state("");

const consignes = $derived(
	new Map(exercises.map((exercise) => [exercise.id, exercise.consigne])),
);
const brief = $derived(
	session ? describeSession(session, races, consignes) : null,
);

function slugs(): string[] {
	return races.map((race) => race.slug);
}

function freshSeed(): string {
	// Nouvelle graine : l'API du navigateur. La séance ne dépend ensuite que de cette graine.
	const bytes = new Uint8Array(8);
	crypto.getRandomValues(bytes);
	return seedFromBytes(bytes);
}

function selectionLocks(): WodAddressLocks {
	return locksFromSelection({ cap, course, level, equipment, format }, slugs());
}

function run(nextSeed: string, locks: WodAddressLocks) {
	const result = generateWod({
		seed: nextSeed,
		exercises,
		races: slugs(),
		config,
		locks: toGeneratorLocks(locks),
	});
	seed = nextSeed;
	copyMessage = "";
	if (result.ok) {
		session = result.session;
		error = null;
	} else {
		session = null;
		error = result.reason;
	}
	const query = serializeWodSearch({ seed: nextSeed, locks }).toString();
	const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}`;
	const current = `${window.location.pathname}${window.location.search}`;
	if (nextUrl !== current) window.history.replaceState(null, "", nextUrl);
	shareHref = window.location.href;
	const target = result.ok ? "seance-titre" : "seance-erreur";
	queueMicrotask(() => document.getElementById(target)?.focus());
}

function generate() {
	if (!ready) return;
	run(freshSeed(), selectionLocks());
}

async function copyLink() {
	try {
		await navigator.clipboard.writeText(shareHref);
		copyMessage = "Lien copié.";
	} catch {
		copyMessage = "Sélectionne le lien pour le copier.";
	}
}

onMount(() => {
	const parsed = parseWodSearch(
		new URLSearchParams(window.location.search),
		slugs(),
	);
	cap = parsed.locks.timeCapMin ? String(parsed.locks.timeCapMin) : "";
	course = parsed.locks.race ?? "";
	level = parsed.locks.level;
	equipment = parsed.locks.equipment ?? "";
	format = parsed.locks.format ?? "";
	if (parsed.seed) run(parsed.seed, parsed.locks);
	ready = true;
});
</script>

<form
	onsubmit={(event) => {
		event.preventDefault();
		generate();
	}}
>
	<fieldset>
		<legend>À verrouiller</legend>
		<p class="hint">« Au hasard » change quand tu relances. Une valeur choisie reste.</p>

		<div class="field">
			<label for="wod-duree">Durée</label>
			<select id="wod-duree" bind:value={cap}>
				<option value="">Au hasard</option>
				<option value="15">15 min</option>
				<option value="20">20 min</option>
			</select>
		</div>

		<div class="field">
			<label for="wod-course">Course</label>
			<select id="wod-course" bind:value={course}>
				<option value="">Au hasard</option>
				<option value={MIX}>Mix</option>
				{#each races as race (race.slug)}
					<option value={race.slug}>{race.nom}</option>
				{/each}
			</select>
		</div>

		<div class="field">
			<label for="wod-niveau">Niveau</label>
			<select id="wod-niveau" bind:value={level} aria-describedby="niveau-hint">
				{#each Object.entries(LEVEL_LABEL) as [value, label] (value)}
					<option {value}>{label}</option>
				{/each}
			</select>
			<p id="niveau-hint" class="hint">
				Le niveau n'est pas tiré au sort. Sans autre choix, c'est débutant.
			</p>
		</div>

		<div class="field">
			<label for="wod-materiel">Matériel</label>
			<select id="wod-materiel" bind:value={equipment}>
				<option value="">Au hasard</option>
				{#each Object.entries(EQUIPMENT_LABEL) as [value, label] (value)}
					<option {value}>{label}</option>
				{/each}
			</select>
		</div>

		<div class="field">
			<label for="wod-format">Format</label>
			<select id="wod-format" bind:value={format}>
				<option value="">Au hasard</option>
				{#each Object.entries(FORMAT_LABEL) as [value, label] (value)}
					<option {value}>{label}</option>
				{/each}
			</select>
		</div>
	</fieldset>

	<button class="button" type="submit" disabled={!ready}>
		{seed ? "Relancer" : "Générer"}
	</button>
</form>

{#if error}
	<p id="seance-erreur" class="error" tabindex="-1" role="alert">
		{error} Relance, ou change un verrou.
	</p>
{/if}

{#if brief}
	<section id="seance" aria-labelledby="seance-titre">
		<h2 id="seance-titre" tabindex="-1">Séance</h2>
		<ul class="facts" aria-label="Réglages de la séance">
			{#each brief.facts as fact (fact.label)}
				<li><span>{fact.label}</span> {fact.value}</li>
			{/each}
		</ul>
		<p>{brief.detail}</p>
		<p>{brief.warmup}</p>
		<ol>
			{#each brief.steps as step (step.label)}
				<li>
					<p class="step-label">{step.label}</p>
					<p class="volume">{step.volume}</p>
					<p class="name">{step.nom}</p>
					{#if step.consigne}
						<p class="consigne">{step.consigne}</p>
					{/if}
				</li>
			{/each}
		</ol>
		<div class="share">
			<label for="wod-lien">Lien de la séance</label>
			<input id="wod-lien" readonly spellcheck="false" value={shareHref} />
			<p class="hint">Ce lien redonne cette séance.</p>
			<button class="secondary" type="button" onclick={copyLink}>Copier le lien</button>
			{#if copyMessage}
				<p role="status">{copyMessage}</p>
			{/if}
		</div>
	</section>
{/if}

<style>
	form,
	section {
		display: grid;
		gap: var(--space-3);
		max-width: 36rem;
	}

	fieldset {
		display: grid;
		gap: var(--space-3);
		margin: 0;
		padding: 0;
		border: 0;
	}

	legend {
		margin-bottom: var(--space-2);
		padding: 0;
		font-weight: 700;
	}

	.field {
		display: grid;
		gap: var(--space-1);
	}

	label {
		font-weight: 600;
	}

	select,
	input {
		min-height: var(--tap-min);
		width: 100%;
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--color-line);
		border-radius: var(--radius);
		background: var(--color-surface);
		color: var(--color-text);
		font: inherit;
	}

	.hint,
	.consigne,
	.step-label {
		margin: 0;
		color: var(--color-text-muted);
	}

	.button {
		width: 100%;
	}

	.error {
		margin: 0;
	}

	h2 {
		font-size: clamp(2rem, 8vw, 3rem);
	}

	.facts {
		display: grid;
		gap: var(--space-2);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.facts li {
		min-height: var(--tap-min);
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--color-line);
		border-radius: var(--radius);
		background: var(--color-surface);
	}

	.facts span {
		display: block;
		color: var(--color-text-muted);
		font-size: 0.875rem;
		font-weight: 600;
	}

	ol {
		display: grid;
		gap: var(--space-3);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	ol li {
		padding: var(--space-3);
		border: 1px solid var(--color-line);
		border-radius: var(--radius);
		background: var(--color-surface);
	}

	.volume,
	.name,
	.consigne {
		margin: 0;
	}

	.volume {
		font-family: var(--font-title);
		font-weight: 800;
		font-size: clamp(2.5rem, 12vw, 4.5rem);
		line-height: 0.9;
		letter-spacing: 0.01em;
	}

	.name {
		margin-top: var(--space-2);
		font-weight: 700;
	}

	.share {
		display: grid;
		gap: var(--space-2);
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
		background: transparent;
		color: var(--color-text);
		font: inherit;
		font-weight: 600;
	}
</style>
