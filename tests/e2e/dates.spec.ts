import { expect, test } from "@playwright/test";

const card = (page: import("@playwright/test").Page, name: string) =>
	page
		.locator(".cards > li.card")
		.filter({
			has: page.getByRole("heading", { level: 2, name, exact: true }),
		});

test("les cartes montrent la prochaine date, ou « Pas de date annoncée » en fin de liste", async ({
	page,
}) => {
	await page.goto("courses/");
	await expect(card(page, "HYROX Open solo")).toContainText("Prochaine date :");
	await expect(card(page, "XENOM")).toContainText("Pas de date annoncée");
	await expect(page.locator(".cards > li.card").last()).toContainText(
		"Pas de date annoncée",
	);
});

test("le filtre pays ne garde que les courses avec une date dans ce pays", async ({
	page,
}) => {
	await page.goto("courses/?pays=CH");
	await expect(page.getByLabel("Pays")).toHaveValue("CH");
	const cards = page.locator(".cards > li.card");
	await expect(cards).toHaveCount(2);
	await expect(cards.first()).toContainText("HYROX");
});

test("le filtre « date dans les 3 mois » se reflète dans l'URL", async ({
	page,
}) => {
	await page.goto("courses/");
	await page.getByRole("checkbox", { name: "Date dans les 3 mois" }).check();
	await expect(page).toHaveURL(/dans3Mois=1/);
	await expect(card(page, "XENOM")).toHaveCount(0);
});

test("la fiche affiche au plus 3 prochaines dates et la date de vérification", async ({
	page,
}) => {
	await page.goto("courses/hyrox-open/");
	const dates = page.locator(".events li:not([hidden])");
	await expect(dates).toHaveCount(3);
	await expect(dates.first().getByRole("link")).toHaveAttribute(
		"href",
		"https://hyrox.com",
	);
	await expect(page.locator(".dates")).toContainText(
		"Dates vérifiées le 23 octobre 2026",
	);
});

test("XENOM : « Pas de date annoncée »", async ({ page }) => {
	await page.goto("courses/xenom/");
	await expect(page.locator(".dates .no-date")).toBeVisible();
	await expect(page.locator(".dates .no-date")).toHaveText(
		"Pas de date annoncée.",
	);
});

test.describe("une date passée n'apparaît jamais, même si le site n'a pas été reconstruit", () => {
	test.beforeEach(async ({ page }) => {
		await page.clock.setFixedTime(new Date("2027-06-15T12:00:00+02:00"));
	});

	test("sur la fiche", async ({ page }) => {
		await page.goto("courses/hyrox-open/");
		for (const item of await page.locator(".events li:not([hidden])").all()) {
			expect(await item.getAttribute("data-end")).toEqual(
				expect.stringMatching(/^2027-(0[6-9]|1[0-2])/),
			);
		}
		await expect(page.locator(".dates .no-date")).toBeVisible();
	});

	test("dans le catalogue", async ({ page }) => {
		await page.goto("courses/");
		await expect(card(page, "HYROX Open solo")).toContainText(
			"Pas de date annoncée",
		);
		await expect(card(page, "The Hybrid Games")).toContainText(
			"Prochaine date :",
		);
	});
});
