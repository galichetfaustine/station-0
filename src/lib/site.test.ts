import { describe, expect, it } from "vitest";
import { NAV, SITE } from "./site";

describe("SITE", () => {
	it("porte le nom validé en D1", () => {
		expect(SITE.name).toBe("Station 0");
	});

	it("est en français", () => {
		expect(SITE.lang).toBe("fr");
	});
});

describe("NAV", () => {
	it("montre les pages qui existent : Courses, Quiz et WOD", () => {
		expect(NAV.map((item) => item.label)).toEqual(["Courses", "Quiz", "WOD"]);
		expect(NAV.map((item) => item.path)).toEqual([
			"/courses/",
			"/quiz/",
			"/wod/",
		]);
	});
});
