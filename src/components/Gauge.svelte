<script lang="ts">
// Jauge de difficulté en 5 pastilles (§9) ; la note est aussi écrite en toutes lettres.
interface Props {
	label: string;
	note: number | null;
}
const { label, note }: Props = $props();
</script>

<div class="gauge">
	<span class="label">{label}</span>
	<span class="dots" aria-hidden="true">
		{#each [1, 2, 3, 4, 5] as step (step)}
			<span class="dot" class:on={note !== null && step <= note}></span>
		{/each}
	</span>
	<span class="value">{note === null ? "?" : note}/5</span>
</div>

<style>
	.gauge {
		display: grid;
		grid-template-columns: 7.5rem auto auto;
		align-items: center;
		gap: var(--space-2);
		font-size: 0.875rem;
	}

	.label {
		color: var(--color-text-muted);
	}

	.dots {
		display: inline-flex;
		gap: 3px;
	}

	.dot {
		width: 0.75rem;
		height: 0.75rem;
		border-radius: 50%;
		border: 1px solid var(--color-line);
	}

	.dot.on {
		background: var(--color-text);
		border-color: var(--color-text);
	}

	.value {
		font-weight: 600;
	}
</style>
