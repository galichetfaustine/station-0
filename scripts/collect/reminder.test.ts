import { describe, expect, it } from "vitest";
import { reminderBody } from "./reminder.ts";

describe("reminderBody", () => {
	it("liste chaque fichier manuel avec sa vérification et ses dates à venir", () => {
		const body = reminderBody(
			[
				{
					name: "xenom.json",
					file: {
						source: "manuel",
						verifieLe: "2026-10-23T17:15:00+02:00",
						courses: ["xenom"],
						evenements: [],
					},
				},
				{
					name: "turf-games.json",
					file: {
						source: "manuel",
						verifieLe: "2026-10-23T17:05:00+02:00",
						courses: ["turf-games"],
						evenements: [
							{
								course: "turf-games",
								date: "2027-02-06",
								dateFin: "2027-02-07",
								ville: "Londres",
								pays: "GB",
								lienInscription: "https://turfgames.com",
							},
						],
					},
				},
			],
			"2026-11-01",
		);
		expect(body).toContain(
			"- [ ] `data/events-manual/xenom.json` (xenom) : vérifié le 23 octobre 2026, 0 date(s) à venir",
		);
		expect(body).toContain(
			"`data/events-manual/turf-games.json` (turf-games) : vérifié le 23 octobre 2026, 1 date(s) à venir",
		);
	});
});
