import { expect, test } from "@playwright/test";

test("l'accueil affiche le nom et la promesse", async ({ page }) => {
	await page.goto("./");
	await expect(page.getByRole("heading", { level: 1 })).toHaveText(
		"Trouve ta première course.",
	);
	await expect(page.getByText("notées de 1 à 5")).toBeVisible();
});

test("l'accueil mène au catalogue par une seule action", async ({ page }) => {
	await page.goto("./");
	await expect(page.locator("main .button")).toHaveCount(1);
	await page.getByRole("link", { name: "Voir les courses" }).click();
	await expect(page).toHaveURL(/\/courses\/$/);
});

test("« Par où commencer ? » propose les 3 courses les plus accessibles", async ({
	page,
}) => {
	await page.goto("./");
	const starters = page.locator(".starters a");
	await expect(starters).toHaveCount(3);
	await expect(starters.first()).toContainText("DEKA STRONG");
	await starters.first().click();
	await expect(page).toHaveURL(/\/courses\/deka-strong\/$/);
});
