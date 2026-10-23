import { describe, expect, it } from "vitest";
import { withBase } from "./paths.ts";

describe("withBase", () => {
	it("préfixe le chemin par le sous-dossier du site", () => {
		expect(withBase("/station-0", "/quiz/")).toBe("/station-0/quiz/");
	});

	it("évite les doubles barres obliques", () => {
		expect(withBase("/station-0/", "/quiz/")).toBe("/station-0/quiz/");
		expect(withBase("/station-0/", "quiz/")).toBe("/station-0/quiz/");
	});

	it("fonctionne à la racine", () => {
		expect(withBase("/", "/")).toBe("/");
	});
});
