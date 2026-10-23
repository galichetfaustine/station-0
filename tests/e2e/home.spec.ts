import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("la page d'accueil affiche le nom du site", async ({ page }) => {
	await page.goto("./");
	await expect(page.getByRole("heading", { level: 1 })).toHaveText("Station 0");
});

test("la page d'accueil n'a aucune erreur d'accessibilité", async ({
	page,
}) => {
	await page.goto("./");
	const results = await new AxeBuilder({ page }).analyze();
	expect(results.violations).toEqual([]);
});
