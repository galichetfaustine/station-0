import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const pages = [
	{ path: "./", title: "Station 0" },
	{ path: "courses/", title: "Courses" },
	{ path: "courses/hyrox-open/", title: "Fiche HYROX Open solo" },
	{ path: "courses/turf-games/", title: "Fiche Turf Games (note à venir)" },
	{ path: "methode/", title: "Comment on note" },
	{ path: "quiz/", title: "Quiz" },
	{ path: "wod/", title: "WOD" },
];

for (const colorScheme of ["dark", "light"] as const) {
	test.describe(`thème ${colorScheme === "dark" ? "sombre" : "clair"}`, () => {
		test.use({ colorScheme });

		for (const { path, title } of pages) {
			test(`${title} : aucune erreur d'accessibilité (contrastes compris)`, async ({
				page,
			}) => {
				await page.goto(path);
				const results = await new AxeBuilder({ page }).analyze();
				expect(results.violations).toEqual([]);
			});
		}
	});
}

test("le site reste sombre, même si le téléphone est en mode clair", async ({
	browser,
	baseURL,
}) => {
	const context = await browser.newContext({
		colorScheme: "light",
		baseURL,
	});
	const page = await context.newPage();
	for (const path of ["./", "courses/", "courses/hyrox-open/", "methode/"]) {
		await page.goto(path);
		await expect(page.locator("body")).toHaveCSS(
			"background-color",
			"rgb(11, 11, 15)",
		);
		await expect(page.locator("body")).toHaveCSS("color", "rgb(255, 255, 255)");
	}
	await context.close();
});

test("l'en-tête ne montre que les pages existantes et signale la page en cours", async ({
	page,
}) => {
	await page.goto("./");
	const nav = page.getByRole("navigation", { name: "Navigation principale" });
	await expect(nav.getByRole("link")).toHaveText(["Courses", "Quiz"]);

	await nav.getByRole("link", { name: "Courses" }).click();
	await expect(page).toHaveURL(/\/courses\/$/);
	await expect(page.getByRole("heading", { level: 1 })).toHaveText("Courses");
	const coursesLink = nav.getByRole("link", { name: "Courses" });
	await expect(coursesLink).toHaveAttribute("aria-current", "page");
	await expect(coursesLink).toHaveCSS("text-decoration-line", "underline");
	await expect(coursesLink).toHaveCSS("outline-style", "none");
	await expect(page.locator(".site-header .logo")).toHaveCSS(
		"text-transform",
		"none",
	);
});

test("les liens de l'en-tête font au moins 44 × 44 px", async ({ page }) => {
	for (const path of ["./", "courses/"]) {
		await page.goto(path);
		for (const link of await page.locator(".site-header a").all()) {
			const box = await link.boundingBox();
			expect(box?.height).toBeGreaterThanOrEqual(44);
			expect(box?.width).toBeGreaterThanOrEqual(44);
		}
	}
});

test("le lien « Aller au contenu » apparaît au clavier", async ({ page }) => {
	await page.goto("./");
	await page.keyboard.press("Tab");
	await expect(
		page.getByRole("link", { name: "Aller au contenu" }),
	).toBeFocused();
});
