import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	contrastRatio,
	parseHex,
	relativeLuminance,
	resolveColorTokens,
} from "./contrast.ts";

describe("contrastRatio", () => {
	it("donne 21 pour du noir sur blanc et 1 pour deux couleurs identiques", () => {
		expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
		expect(contrastRatio("#3d48ff", "#3d48ff")).toBeCloseTo(1, 5);
	});

	it("ne dépend pas de l'ordre des couleurs", () => {
		expect(contrastRatio("#ff8a3d", "#0b0b0f")).toBeCloseTo(
			contrastRatio("#0b0b0f", "#ff8a3d"),
			10,
		);
	});

	it("accepte la forme courte #rgb", () => {
		expect(parseHex("#fff")).toEqual([255, 255, 255]);
		expect(relativeLuminance("#fff")).toBeCloseTo(1, 5);
	});

	it("refuse une couleur invalide", () => {
		expect(() => parseHex("orange")).toThrow("Couleur invalide");
	});
});

describe("resolveColorTokens", () => {
	it("résout les var() et applique les surcharges", () => {
		const tokens = resolveColorTokens(
			"--color-a: #111111; --color-b: var(--color-a);",
			"--color-a: #222222;",
		);
		expect(tokens["--color-b"]).toBe("#222222");
	});
});

// --- Contrastes de la DA (US0.4) : toutes les combinaisons utilisées, dans les deux thèmes ---

const css = readFileSync(
	new URL("../styles/tokens.css", import.meta.url),
	"utf8",
);
const [darkBlock = "", lightBlock = ""] = css.split(
	"@media (prefers-color-scheme: light)",
);
const themes = {
	sombre: resolveColorTokens(darkBlock),
	clair: resolveColorTokens(darkBlock, lightBlock),
};

const TEXT = 4.5; // WCAG AA, texte courant
const UI = 3; // WCAG AA, éléments d'interface (focus, bordures)

/** [texte ou élément, fond, seuil minimal] */
const usedPairs: Array<[string, string, number]> = [
	["--color-text", "--color-bg", TEXT],
	["--color-text", "--color-surface", TEXT],
	["--color-text-muted", "--color-bg", TEXT],
	["--color-text-muted", "--color-surface", TEXT],
	["--color-action-text", "--color-action-bg", TEXT],
	["--color-duo-text", "--color-duo-bg", TEXT],
	["--color-band-text", "--color-band-bg", TEXT],
	["--color-focus", "--color-bg", UI],
	["--color-focus", "--color-surface", UI],
	["--color-line", "--color-bg", UI],
];

describe.each(Object.entries(themes))("contrastes du thème %s", (_, tokens) => {
	it.each(usedPairs)("%s sur %s ≥ %d:1", (foreground, background, minimum) => {
		const fg = tokens[foreground];
		const bg = tokens[background];
		expect(fg, foreground).toBeDefined();
		expect(bg, background).toBeDefined();
		expect(contrastRatio(fg as string, bg as string)).toBeGreaterThanOrEqual(
			minimum,
		);
	});
});

describe("règles de la DA", () => {
	it("le texte sur orange et sur lavande est toujours en encre", () => {
		for (const tokens of Object.values(themes)) {
			expect(tokens["--color-action-text"]).toBe(tokens["--color-ink"]);
			expect(tokens["--color-duo-text"]).toBe(tokens["--color-ink"]);
		}
	});
});
