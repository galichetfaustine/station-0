import { describe, expect, it } from "vitest";
import { parseDateRange } from "./date-text.ts";

describe("parseDateRange", () => {
	it("lit une date simple", () => {
		expect(parseDateRange("24 Apr 2027")).toEqual({ date: "2027-04-24" });
		expect(parseDateRange("07 Nov 2026")).toEqual({ date: "2026-11-07" });
	});

	it("lit une plage dans le même mois, avec ou sans espaces", () => {
		expect(parseDateRange("19-20 Jun 2027")).toEqual({
			date: "2027-06-19",
			dateFin: "2027-06-20",
		});
		expect(parseDateRange("13 - 14 Feb 2027")).toEqual({
			date: "2027-02-13",
			dateFin: "2027-02-14",
		});
	});

	it("lit une plage sur deux mois ou deux années", () => {
		expect(parseDateRange("30 Jul - 1 Aug 2027")).toEqual({
			date: "2027-07-30",
			dateFin: "2027-08-01",
		});
		expect(parseDateRange("30 Dec - 2 Jan 2027")).toEqual({
			date: "2026-12-30",
			dateFin: "2027-01-02",
		});
		expect(parseDateRange("30 Dec 2026 - 2 Jan 2027")).toEqual({
			date: "2026-12-30",
			dateFin: "2027-01-02",
		});
	});

	it("refuse un texte qui n'est pas une date valide", () => {
		expect(parseDateRange("Date coming soon!")).toBeNull();
		expect(parseDateRange("31 Feb 2027")).toBeNull();
		expect(parseDateRange("20-19 Jun 2027")).toBeNull();
	});
});
