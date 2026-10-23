import { expect, test } from "@playwright/test";

const cards = (page: import("@playwright/test").Page) =>
	page.locator(".cards > li.card");

test.describe("sans JavaScript", () => {
	test.use({ javaScriptEnabled: false });

	test("la liste des 11 courses s'affiche", async ({ page }) => {
		await page.goto("courses/");
		await expect(cards(page)).toHaveCount(11);
		await expect(
			page.getByRole("heading", { level: 2, name: "HYROX Open solo" }),
		).toBeVisible();
	});
});

test("chaque carte montre la note globale, les 4 jauges et les formats", async ({
	page,
}) => {
	await page.goto("courses/");
	const hyrox = cards(page).filter({ hasText: "HYROX Open solo" });
	await expect(hyrox.locator(".global-value")).toHaveText("4");
	await expect(hyrox.locator(".gauge")).toHaveCount(4);
	await expect(hyrox.getByText("Course", { exact: true })).toBeVisible();
	await expect(
		hyrox.getByRole("listitem").filter({ hasText: "Solo" }),
	).toBeVisible();
});

test("les filtres de l'URL s'appliquent à l'ouverture", async ({ page }) => {
	await page.goto("courses/?format=duo&tri=difficulte");
	await expect(page.getByRole("radio", { name: "Duo" })).toBeChecked();
	await expect(cards(page).first()).toContainText("DEKA STRONG");
	for (const card of await cards(page).all())
		await expect(card.locator(".badges")).toContainText("Duo");
});

test("changer un filtre met à jour la liste et l'URL", async ({ page }) => {
	await page.goto("courses/");
	await page.getByLabel("Type").selectOption("obstacles");
	await expect(cards(page)).toHaveCount(1);
	await expect(cards(page)).toContainText("Course à obstacles");
	await expect(page).toHaveURL(/\?type=obstacles$/);

	await page.getByLabel("Type").selectOption("");
	await page.getByRole("checkbox", { name: "Sans course à pied" }).check();
	await expect(cards(page)).toHaveCount(1);
	await expect(cards(page)).toContainText("DEKA STRONG");
	await expect(page).toHaveURL(/\?sansCourse=1$/);
});

test("une note maximale écarte les courses plus dures et celles à confirmer", async ({
	page,
}) => {
	await page.goto("courses/?noteMax=2");
	await expect(cards(page)).toHaveCount(1);
	await expect(cards(page)).toContainText("DEKA STRONG");
});
