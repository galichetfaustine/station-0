import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const pages = [
	{ path: "./", title: "Station 0" },
	{ path: "courses/", title: "Courses" },
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

test("le thème suit le réglage du téléphone : sombre par défaut, clair si demandé", async ({
	browser,
	baseURL,
}) => {
	const background = async (colorScheme: "dark" | "light") => {
		const context = await browser.newContext({ colorScheme, baseURL });
		const page = await context.newPage();
		await page.goto("./");
		const color = await page.evaluate(
			() => getComputedStyle(document.body).backgroundColor,
		);
		await context.close();
		return color;
	};
	expect(await background("dark")).toBe("rgb(11, 11, 15)");
	expect(await background("light")).toBe("rgb(247, 246, 243)");
});

test("l'en-tête ne montre que les pages existantes et signale la page en cours", async ({
	page,
}) => {
	await page.goto("./");
	const nav = page.getByRole("navigation", { name: "Navigation principale" });
	await expect(nav.getByRole("link")).toHaveText(["Courses"]);

	await nav.getByRole("link", { name: "Courses" }).click();
	await expect(page).toHaveURL(/\/station-0\/courses\/$/);
	await expect(page.getByRole("heading", { level: 1 })).toHaveText("Courses");
	await expect(nav.getByRole("link", { name: "Courses" })).toHaveAttribute(
		"aria-current",
		"page",
	);
});

test("les liens de l'en-tête font au moins 44 × 44 px", async ({ page }) => {
	await page.goto("./");
	for (const link of await page.locator(".site-header a").all()) {
		const box = await link.boundingBox();
		expect(box?.height).toBeGreaterThanOrEqual(44);
		expect(box?.width).toBeGreaterThanOrEqual(44);
	}
});

test("le lien « Aller au contenu » apparaît au clavier", async ({ page }) => {
	await page.goto("./");
	await page.keyboard.press("Tab");
	await expect(
		page.getByRole("link", { name: "Aller au contenu" }),
	).toBeFocused();
});
