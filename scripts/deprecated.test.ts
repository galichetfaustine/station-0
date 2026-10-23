import { describe, expect, it } from "vitest";
import {
	buildReport,
	type Lockfile,
	listInstalledPackages,
} from "./deprecated.ts";

const lock: Lockfile = {
	packages: {
		"": {
			dependencies: { astro: "7.4.2" },
			devDependencies: { vitest: "5.0.5" },
		},
		"node_modules/astro": { version: "7.4.2" },
		"node_modules/vitest": { version: "5.0.5" },
		"node_modules/vite": { version: "8.0.0" },
		"node_modules/astro/node_modules/vitest": { version: "4.0.0" },
		"node_modules/@scope/outil": { version: "1.0.0" },
		"node_modules/lien-local": { version: "1.0.0", link: true },
	},
};

describe("listInstalledPackages", () => {
	const packages = listInstalledPackages(lock);
	const find = (name: string, version: string) =>
		packages.find((p) => p.name === name && p.version === version);

	it("marque comme directes les dépendances déclarées dans package.json", () => {
		expect(find("astro", "7.4.2")?.direct).toBe(true);
		expect(find("vitest", "5.0.5")?.direct).toBe(true);
	});

	it("marque comme indirectes les autres, même si elles portent le nom d'une directe", () => {
		expect(find("vite", "8.0.0")?.direct).toBe(false);
		expect(find("vitest", "4.0.0")?.direct).toBe(false);
	});

	it("lit les noms à portée (@scope/nom) et ignore les liens locaux", () => {
		expect(find("@scope/outil", "1.0.0")).toBeDefined();
		expect(packages.some((p) => p.name === "lien-local")).toBe(false);
	});
});

describe("buildReport", () => {
	const packages = listInstalledPackages(lock);

	it("renvoie une erreur pour une dépendance directe dépréciée", () => {
		const report = buildReport(
			packages,
			new Map([["astro@7.4.2", "utilisez autre-chose"]]),
		);
		expect(report.errors).toEqual(["astro@7.4.2 : utilisez autre-chose"]);
		expect(report.warnings).toEqual([]);
	});

	it("renvoie un simple avertissement pour une dépendance indirecte dépréciée", () => {
		const report = buildReport(packages, new Map([["vite@8.0.0", "obsolète"]]));
		expect(report.errors).toEqual([]);
		expect(report.warnings).toEqual(["vite@8.0.0 : obsolète"]);
	});

	it("ne signale rien quand rien n'est déprécié", () => {
		expect(buildReport(packages, new Map())).toEqual({
			errors: [],
			warnings: [],
		});
	});
});
