import { describe, expect, it } from "vitest";
import {
	formatDistance,
	formatSegment,
	registrationLabel,
	siteName,
} from "./race-page.ts";

describe("formatDistance", () => {
	it("écrit les mètres sous 1 km et les kilomètres au-delà", () => {
		expect([400, 1000, 4800].map(formatDistance)).toEqual([
			"400 m",
			"1 km",
			"4,8 km",
		]);
	});
});

describe("formatSegment", () => {
	it("décrit une course", () => {
		expect(formatSegment({ type: "course", distanceM: 1000 })).toBe(
			"Course : 1 km",
		);
	});

	it("décrit un exercice avec volume et charges hommes / femmes", () => {
		const segment = {
			type: "exercice" as const,
			nom: "Sled push",
			volume: 50,
			unite: "metres" as const,
			chargeKg: { homme: 152, femme: 102 },
		};
		expect(formatSegment(segment)).toBe(
			"Sled push — 50 m — 152 kg hommes / 102 kg femmes",
		);
	});

	it("décrit des répétitions, des calories et un exercice sans volume fixé", () => {
		expect(
			formatSegment({
				type: "exercice",
				nom: "Wall balls",
				volume: 100,
				unite: "repetitions",
			}),
		).toBe("Wall balls — 100 répétitions");
		expect(
			formatSegment({
				type: "exercice",
				nom: "Air bike",
				volume: 25,
				unite: "calories",
			}),
		).toBe("Air bike — 25 calories");
		expect(
			formatSegment({ type: "exercice", nom: "SkiErg en distance maximale" }),
		).toBe("SkiErg en distance maximale");
		expect(
			formatSegment({
				type: "exercice",
				nom: "Farmers carry",
				volume: 100,
				unite: "metres",
				chargeKg: { homme: 27.5, femme: 17.5 },
			}),
		).toBe("Farmers carry — 100 m — 27,5 kg hommes / 17,5 kg femmes");
	});
});

describe("liens officiels", () => {
	it("donne le nom du site sans www", () => {
		expect(siteName("https://www.deadlydozen.com")).toBe("deadlydozen.com");
	});

	it("HYROX : « Inscriptions sur hyrox.com », vers la page d'accueil", () => {
		expect(registrationLabel({ siteOfficiel: "https://hyrox.com" })).toBe(
			"Inscriptions sur hyrox.com",
		);
	});
});
