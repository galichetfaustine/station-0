import { describe, expect, it } from "vitest";
import {
	addMonths,
	cityKey,
	type EventFile,
	formatCheckedOn,
	formatEventDates,
	isPast,
	lastChecked,
	mergeEvents,
	startsWithinMonths,
	todayInParis,
	upcomingEvents,
} from "./dates.ts";

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

describe("addMonths", () => {
	it("ajoute des mois, en restant au dernier jour du mois", () => {
		expect(addMonths("2026-10-23", 3)).toBe("2027-01-23");
		expect(addMonths("2026-10-23", 18)).toBe("2028-04-23");
		expect(addMonths("2026-11-30", 3)).toBe("2027-02-28");
	});
});

describe("upcomingEvents", () => {
	const all = [
		event("athx", "2026-10-20", "Passé"),
		{ ...event("athx", "2026-10-22", "En cours"), dateFin: "2026-10-24" },
		event("athx", "2027-02-13", "Paris"),
		event("athx", "2026-12-01", "Lyon"),
		event("athx", "2028-06-01", "Trop loin"),
		event("hyrox-open", "2026-12-12", "Paris"),
	];

	it("garde les dates à venir de la course dans les 18 mois, triées", () => {
		expect(
			upcomingEvents(all, "athx", "2026-10-23").map((e) => e.ville),
		).toEqual(["En cours", "Lyon", "Paris"]);
	});

	it("n'affiche jamais une date passée", () => {
		expect(
			upcomingEvents(all, "athx", "2026-10-25").map((e) => e.ville),
		).toEqual(["Lyon", "Paris"]);
		expect(
			isPast({ date: "2026-10-22", dateFin: "2026-10-24" }, "2026-10-24"),
		).toBe(false);
		expect(
			isPast({ date: "2026-10-22", dateFin: "2026-10-24" }, "2026-10-25"),
		).toBe(true);
	});
});

describe("startsWithinMonths", () => {
	it("sait si un événement commence dans les 3 mois", () => {
		expect(startsWithinMonths({ date: "2027-01-23" }, "2026-10-23", 3)).toBe(
			true,
		);
		expect(startsWithinMonths({ date: "2027-01-24" }, "2026-10-23", 3)).toBe(
			false,
		);
	});
});

describe("mise en forme", () => {
	it("écrit une date simple ou une plage de dates en français", () => {
		expect(formatEventDates({ date: "2026-11-28" })).toBe("28 nov. 2026");
		expect(
			formatEventDates({ date: "2026-12-12", dateFin: "2026-12-20" }),
		).toMatch(/^12\s?–\s?20 déc\. 2026$/);
		expect(
			formatEventDates({ date: "2026-10-29", dateFin: "2026-11-01" }),
		).toMatch(/^29 oct\.\s?–\s?1 nov\. 2026$/);
	});

	it("écrit la date de vérification en toutes lettres", () => {
		expect(formatCheckedOn("2026-10-23T16:35:00+02:00")).toBe(
			"23 octobre 2026",
		);
	});

	it("donne la date du jour à l'heure de Paris", () => {
		expect(todayInParis(new Date("2026-10-23T23:30:00Z"))).toBe("2026-10-24");
	});
});
