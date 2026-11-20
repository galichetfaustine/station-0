import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { eventSchema } from "../../src/lib/schemas.ts";
import { parseAthx } from "./athx.ts";
import { DEADLY_DOZEN, parseDeadlyDozenCountry } from "./deadly-dozen.ts";

// Pages enregistrées le 23/10/2026 : aucun appel réseau dans les tests.
const fixture = (name: string) =>
	readFileSync(
		new URL(`../../fixtures/collect/${name}`, import.meta.url),
		"utf8",
	);

describe("collecteur ATHX", () => {
	const events = parseAthx(fixture("athx-events.html"));

	it("ne garde que les 19 événements en France et pays proches", () => {
		expect(events).toHaveLength(19);
		expect(new Set(events.map((e) => e.pays))).toEqual(
			new Set(["FR", "GB", "ES", "IT", "BE", "CH", "DE"]),
		);
	});

	it("lit la ville, les dates et le lien d'ATHX Paris", () => {
		expect(events.find((e) => e.ville === "Paris")).toEqual({
			course: "athx",
			date: "2027-02-13",
			dateFin: "2027-02-14",
			ville: "Paris",
			pays: "FR",
			lienInscription:
				"https://athxgames.com/events/01krwy3qs5q0357mrpx9b4qxtf",
		});
	});

	it("produit des événements valides pour le schéma", () => {
		for (const event of events)
			expect(eventSchema.safeParse(event).success).toBe(true);
	});

	it("signale clairement une page dont la structure a changé", () => {
		expect(() =>
			parseAthx("<html><body>Nouvelle maquette</body></html>"),
		).toThrow("data-page introuvable");
	});
});

describe("collecteur Deadly Dozen", () => {
	const page = (pays: keyof typeof DEADLY_DOZEN.pages) => {
		const slug = DEADLY_DOZEN.pages[pays].split("/").at(-1);
		return parseDeadlyDozenCountry(fixture(`deadly-dozen-${slug}.html`), pays);
	};

	it("ne garde que les Track Races « Deadly Dozen <ville> »", () => {
		const germany = page("DE");
		expect(germany.map((e) => e.ville)).toEqual([
			"Cologne",
			"Leipzig",
			"Lac de Constance",
			"Karlsruhe",
			"Bottrop",
			"Aschaffenburg",
			"Fürth",
		]);
		expect(page("GB").map((e) => e.ville)).not.toContain("Lee Valley");
	});

	it("lit une plage de dates et garde le lien officiel", () => {
		expect(page("DE").find((e) => e.ville === "Bottrop")).toEqual({
			course: "deadly-dozen",
			date: "2027-06-19",
			dateFin: "2027-06-20",
			ville: "Bottrop",
			pays: "DE",
			lienInscription: "https://www.deadlydozen.com/deadly-dozen-bottrop",
		});
	});

	it("compte 20 Track Races dans la zone, et aucune en France, Belgique et Luxembourg", () => {
		const all = (
			Object.keys(DEADLY_DOZEN.pages) as (keyof typeof DEADLY_DOZEN.pages)[]
		).flatMap(page);
		expect(all).toHaveLength(20);
		expect(page("FR")).toEqual([]);
		expect(page("BE")).toEqual([]);
		expect(page("LU")).toEqual([]);
		for (const event of all)
			expect(eventSchema.safeParse(event).success).toBe(true);
	});
});

describe("villes", () => {
	it("met en forme et traduit les noms de villes", async () => {
		const { frenchCity, titleCase } = await import("./cities.ts");
		expect(titleCase("ST GALLEN")).toBe("St Gallen");
		expect(frenchCity(titleCase("ST GALLEN"))).toBe("Saint-Gall");
		expect(frenchCity("Garda Lake")).toBe("Lac de Garde");
		expect(frenchCity("Bottrop")).toBe("Bottrop");
	});
});
