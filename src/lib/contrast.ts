// Contraste entre deux couleurs selon la formule WCAG 2.x.

/** Convertit « #rrggbb » ou « #rgb » en composantes 0–255. */
export function parseHex(hex: string): [number, number, number] {
	const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
	if (!match?.[1]) throw new Error(`Couleur invalide : ${hex}`);
	const digits =
		match[1].length === 3 ? [...match[1]].map((d) => d + d).join("") : match[1];
	return [0, 2, 4].map((i) => Number.parseInt(digits.slice(i, i + 2), 16)) as [
		number,
		number,
		number,
	];
}

/** Luminance relative, de 0 (noir) à 1 (blanc). */
export function relativeLuminance(hex: string): number {
	const [r, g, b] = parseHex(hex).map((value) => {
		const channel = value / 255;
		return channel <= 0.04045
			? channel / 12.92
			: ((channel + 0.055) / 1.055) ** 2.4;
	}) as [number, number, number];
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Rapport de contraste, de 1 (identiques) à 21 (noir sur blanc). */
export function contrastRatio(foreground: string, background: string): number {
	const [light, dark] = [
		relativeLuminance(foreground),
		relativeLuminance(background),
	].sort((a, b) => b - a) as [number, number];
	return (light + 0.05) / (dark + 0.05);
}

/**
 * Lit les variables de couleur d'un bloc CSS (« --nom: #hex » ou « --nom: var(--autre) »).
 * Le bloc `overrides` (ex. le mode clair) remplace les valeurs du bloc de base.
 */
export function resolveColorTokens(
	base: string,
	overrides = "",
): Record<string, string> {
	const raw: Record<string, string> = {};
	for (const css of [base, overrides]) {
		for (const [, name, value] of css.matchAll(
			/(--color-[\w-]+)\s*:\s*([^;]+);/g,
		)) {
			if (name && value) raw[name] = value.trim();
		}
	}
	const resolve = (name: string, depth = 0): string => {
		const value = raw[name];
		if (value === undefined || depth > 10)
			throw new Error(`Variable introuvable : ${name}`);
		const reference = /^var\((--[\w-]+)\)$/.exec(value);
		return reference?.[1] ? resolve(reference[1], depth + 1) : value;
	};
	return Object.fromEntries(
		Object.keys(raw).map((name) => [name, resolve(name)]),
	);
}
