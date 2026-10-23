import { describe, expect, it } from "vitest";
import { SITE } from "./site";

describe("SITE", () => {
	it("porte le nom validé en D1", () => {
		expect(SITE.name).toBe("Station 0");
	});

	it("est en français", () => {
		expect(SITE.lang).toBe("fr");
	});
});
