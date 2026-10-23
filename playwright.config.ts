import { defineConfig, devices } from "@playwright/test";

const port = 4321;

export default defineConfig({
	testDir: "tests/e2e",
	use: {
		baseURL: `http://localhost:${port}/station-0/`,
	},
	// Mobile d'abord : on teste sur un téléphone simulé.
	projects: [{ name: "mobile", use: { ...devices["Pixel 7"] } }],
	webServer: {
		// --ignore-lock : garde le serveur au premier plan (Astro 7 le passe sinon en
		// arrière-plan quand il détecte un agent IA, et Playwright croit à un plantage).
		command: `npm run build && npm run preview -- --port ${port} --ignore-lock`,
		url: `http://localhost:${port}/station-0/`,
		reuseExistingServer: !process.env.CI,
	},
});
