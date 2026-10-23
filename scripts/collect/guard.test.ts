import { describe, expect, it } from "vitest";
import type { EventFile, RaceEvent } from "../../src/lib/schemas.ts";
import { applyGuard, keepUsable } from "./guard.ts";

const TODAY = "2026-10-23";
const NOW = new Date("2026-10-23T02:17:00Z");
const SOURCE = { source: "athx", courses: ["athx"] } as const;
const event = (date: string, ville = "Paris"): RaceEvent => ({
	course: "athx",
	date,
	ville,
	pays: "FR",
	lienInscription: "https://athxgames.com/events/x",
});
const previous: EventFile = {
	source: "athx",
	verifieLe: "2026-10-22T02:17:00.000Z",
	courses: ["athx"],
	evenements: [
		event("2027-01-10", "A"),
		event("2027-02-10", "B"),
		event("2027-03-10", "C"),
		event("2027-04-10", "D"),
	],
};

describe("keepUsable", () => {
	it("écarte les dates passées et celles au-delà de 18 mois", () => {
		const kept = keepUsable(
			[event("2026-10-01"), event("2027-01-01"), event("2028-06-01")],
			TODAY,
		);
		expect(kept.map((e) => e.date)).toEqual(["2027-01-01"]);
	});
});

describe("applyGuard", () => {
	it("accepte une collecte normale et met à jour la date de vérification", () => {
		const { file, anomaly } = applyGuard(
			SOURCE,
			previous.evenements.slice(0, 3),
			previous,
			NOW,
			TODAY,
		);
		expect(anomaly).toBeNull();
		expect(file.verifieLe).toBe("2026-10-23T02:17:00.000Z");
		expect(file.evenements).toHaveLength(3);
		expect(file.aVerifier).toBeUndefined();
	});

	it("0 événement : garde les données précédentes, marquées « à vérifier »", () => {
		const { file, anomaly } = applyGuard(SOURCE, [], previous, NOW, TODAY);
		expect(anomaly).toBe("0 événement à venir collecté");
		expect(file).toEqual({ ...previous, aVerifier: true });
	});

	it("plus de la moitié perdue d'un coup : garde les données précédentes", () => {
		const { file, anomaly } = applyGuard(
			SOURCE,
			[event("2027-01-10")],
			previous,
			NOW,
			TODAY,
		);
		expect(anomaly).toContain("plus de la moitié perdue");
		expect(file.evenements).toHaveLength(4);
		expect(file.aVerifier).toBe(true);
	});

	it("source en panne : garde les données précédentes et explique pourquoi", () => {
		const { file, anomaly } = applyGuard(
			SOURCE,
			new Error("HTTP 503"),
			previous,
			NOW,
			TODAY,
		);
		expect(anomaly).toBe("source en panne : HTTP 503");
		expect(file.verifieLe).toBe(previous.verifieLe);
	});

	it("premier passage en échec : fichier vide « à vérifier », valide pour le schéma", () => {
		const { file, anomaly } = applyGuard(SOURCE, [], null, NOW, TODAY);
		expect(anomaly).not.toBeNull();
		expect(file).toMatchObject({
			source: "athx",
			courses: ["athx"],
			aVerifier: true,
			evenements: [],
		});
	});
});
