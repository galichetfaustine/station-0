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
	it("ne montre que les pages qui existent : Courses", () => {
		expect(NAV.map((item) => item.label)).toEqual(["Courses"]);
	});
});
