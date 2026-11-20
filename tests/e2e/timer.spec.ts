import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const forTime =
	"wod/?graine=abcdef0123456789&course=hyrox-open&cap=20&format=forTime";
const emom =
	"wod/?graine=abcdef0123456789&course=hyrox-open&cap=20&format=emom";

test("le minuteur suit l'horloge, la pause et les tours", async ({ page }) => {
	await page.clock.install({ time: new Date("2026-11-20T10:00:00Z") });
	await page.goto(forTime);
	const start = page.getByRole("button", { name: "Lancer", exact: true });
	await expect(start).toBeEnabled();
	await expect(page.locator(".digits")).toHaveText("00:00");
	await expect(page.locator(".status")).toHaveText("Prêt");
	await expect(page.locator("main .button")).toHaveCount(1);

	await start.click();
	await expect(page.locator(".status")).toHaveText("Départ dans");
	await expect(page.locator(".digits")).toHaveText("00:10");

	await page.clock.fastForward(3_000);
	await expect(page.locator(".digits")).toHaveText("00:07");
	await page.getByRole("button", { name: "Pause" }).click();
	await page.clock.fastForward(5_000);
	await expect(page.locator(".digits")).toHaveText("00:07");
	await expect(page.locator(".status")).toHaveText("Pause");

	await page.getByRole("button", { name: "Compter un tour" }).click();
	await page.getByRole("button", { name: "Compter un tour" }).click();
	await expect(page.locator(".rounds")).toHaveText("Tours : 2");

	const results = await new AxeBuilder({ page }).analyze();
	expect(results.violations).toEqual([]);

	await page.getByRole("button", { name: "Reprendre" }).click();
	await page.clock.fastForward(7_000);
	await expect(page.locator(".status")).toHaveText("For Time");
	await expect(page.locator(".digits")).toHaveText("00:00");
	await page.clock.fastForward(5_000);
	await expect(page.locator(".digits")).toHaveText("00:05");
});

test("EMOM affiche l'exercice en cours, Intervalles le travail", async ({
	page,
}) => {
	await page.goto(emom);
	await expect(page.locator(".digits")).toHaveText("01:00");
	await expect(page.locator(".current")).not.toBeEmpty();

	await page.goto(
		"wod/?graine=abcdef0123456789&course=hyrox-open&cap=20&format=intervalles",
	);
	await expect(page.locator(".digits")).toHaveText("00:40");
	await expect(page.locator(".status")).toHaveText("Prêt");
	await expect(page.locator(".current")).not.toBeEmpty();
});

test("les boutons du minuteur font au moins 44 px", async ({ page }) => {
	await page.goto(forTime);
	await page.getByRole("button", { name: "Lancer", exact: true }).click();
	for (const name of ["Pause", "Compter un tour"]) {
		const box = await page.getByRole("button", { name }).boundingBox();
		expect(box?.height).toBeGreaterThanOrEqual(44);
		expect(box?.width).toBeGreaterThanOrEqual(44);
	}
});
