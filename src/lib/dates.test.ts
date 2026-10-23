import { describe, expect, it } from "vitest";
import { cityKey, type EventFile, lastChecked, mergeEvents } from "./dates.ts";

const event = (
	course: string,
	date: string,
	ville: string,
	lien = "https://exemple.fr",
) => ({
	course,
	date,
	ville,
	pays: "FR" as const,
	lienInscription: lien,
});

const collected: EventFile[] = [
	{
		source: "athx",
		verifieLe: "2026-10-24T03:00:00+02:00",
		courses: ["athx"],
		evenements: [
			event("athx", "2027-02-13", "Paris", "https://athxgames.com/paris"),
			event("athx", "2027-09-10", "Marseille"),
		],
	},
];

describe("cityKey", () => {
	it("compare les villes sans accents, casse ni précision entre parenthèses", () => {
		expect(cityKey("Paris (Grand Palais)")).toBe("paris");
		expect(cityKey("Düsseldorf")).toBe(cityKey("dusseldorf"));
	});
});

describe("mergeEvents", () => {
	it("sans saisie manuelle, garde les dates collectées, triées", () => {
		const events = mergeEvents(collected, []);
		expect(events.map((e) => e.ville)).toEqual(["Paris", "Marseille"]);
		expect(events[0]?.origine).toBe("collecte");
		expect(events[0]?.verifieLe).toBe("2026-10-24T03:00:00+02:00");
	});

	it("une saisie manuelle remplace la date collectée de la même course dans la même ville", () => {
		const manual: EventFile[] = [
			{
				source: "manuel",
				verifieLe: "2026-10-25T10:00:00+02:00",
				courses: ["athx"],
				evenements: [
					event("athx", "2027-02-20", "paris", "https://correction.fr"),
				],
			},
		];
		const events = mergeEvents(collected, manual);
		const paris = events.filter((e) => cityKey(e.ville) === "paris");
		expect(paris).toHaveLength(1);
		expect(paris[0]).toMatchObject({
			date: "2027-02-20",
			origine: "manuel",
			lienInscription: "https://correction.fr",
		});
		expect(events.map((e) => e.ville)).toContain("Marseille");
	});

	it("une ville nouvelle en saisie manuelle s'ajoute", () => {
		const manual: EventFile[] = [
			{
				source: "manuel",
				verifieLe: "2026-10-25T10:00:00+02:00",
				courses: ["athx"],
				evenements: [event("athx", "2027-05-28", "Montpellier")],
			},
		];
		expect(mergeEvents(collected, manual)).toHaveLength(3);
	});

	it("ne remplace pas la même ville d'une autre course", () => {
		const manual: EventFile[] = [
			{
				source: "manuel",
				verifieLe: "2026-10-25T10:00:00+02:00",
				courses: ["athx"],
				evenements: [event("hyrox-open", "2026-12-12", "Paris")],
			},
		];
		expect(mergeEvents(collected, manual)).toHaveLength(3);
	});
});

describe("lastChecked", () => {
	const files: EventFile[] = [
		...collected,
		{
			source: "manuel",
			verifieLe: "2026-10-23T17:00:00+02:00",
			courses: ["athx"],
			evenements: [],
		},
		{
			source: "manuel",
			verifieLe: "2026-10-23T17:15:00+02:00",
			courses: ["xenom"],
			evenements: [],
		},
	];

	it("renvoie la vérification la plus récente parmi les sources de la course", () => {
		expect(lastChecked(files, "athx")).toBe("2026-10-24T03:00:00+02:00");
	});

	it("couvre une course sans aucune date à venir", () => {
		expect(lastChecked(files, "xenom")).toBe("2026-10-23T17:15:00+02:00");
		expect(lastChecked(files, "turf-games")).toBeNull();
	});
});
