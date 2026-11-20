import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const shared =
	"wod/?graine=abcdef0123456789&course=hyrox-open&cap=20&format=forTime";

test("un clic génère une séance, et le même lien la redonne", async ({
	page,
}) => {
	await page.goto("wod/");
	const generate = page.getByRole("button", { name: "Générer" });
	await expect(generate).toBeEnabled();
	await expect(page.locator("main .button")).toHaveCount(1);
	await expect(page.getByRole("heading", { name: "Séance" })).toHaveCount(0);

	await generate.focus();
	await page.keyboard.press("Enter");
	await expect(page).toHaveURL(/graine=[a-z0-9]{16}/);
	// Sans verrou, quelques graines ne donnent aucune séance : on relance.
	const session = page.getByRole("heading", { name: "Séance" });
	for (
		let attempt = 0;
		attempt < 5 && !(await session.isVisible());
		attempt++
	) {
		await page.getByRole("button", { name: "Relancer" }).click();
	}
	await expect(session).toBeVisible();
	await expect(page.locator("#seance .name").first()).toBeVisible();
	await expect(page.getByLabel("Lien de la séance")).toHaveValue(/graine=/);

	const names = await page.locator("#seance .name").allTextContents();
	expect(names.length).toBeGreaterThanOrEqual(3);
	const link = page.url();

	await page.reload();
	await expect(page.getByRole("button", { name: "Relancer" })).toBeEnabled();
	await expect(page.locator("#seance .name")).toHaveText(names);
	expect(page.url()).toBe(link);

	const results = await new AxeBuilder({ page }).analyze();
	expect(results.violations).toEqual([]);
});

test("Relancer garde les verrous et change seulement la graine", async ({
	page,
}) => {
	await page.goto("wod/");
	await page.getByLabel("Course").selectOption("mix");
	await page.getByLabel("Matériel").selectOption("aucun");
	await page.getByLabel("Format").selectOption("forTime");
	await page.getByRole("button", { name: "Générer" }).click();
	await expect(page.getByRole("heading", { name: "Séance" })).toBeVisible();
	await page.getByLabel("Durée").selectOption("15");
	await page.getByLabel("Format").selectOption("amrap");
	await page.getByLabel("Niveau").selectOption("intermediaire");
	await page.getByRole("button", { name: "Relancer" }).click();

	await expect(page).toHaveURL(/cap=15/);
	await expect(page).toHaveURL(/course=mix/);
	await expect(page).toHaveURL(/materiel=aucun/);
	await expect(page).toHaveURL(/format=amrap/);
	await expect(page).toHaveURL(/niveau=intermediaire/);
	await expect(page.locator("#seance")).toContainText("15 min");
	await expect(page.locator("#seance")).toContainText("Mix");
	await expect(page.locator("#seance")).toContainText("AMRAP");
	await expect(page.locator("#seance")).toContainText("Intermédiaire");
	const firstSeed = new URL(page.url()).searchParams.get("graine");

	await page.getByRole("button", { name: "Relancer" }).click();
	const secondSeed = new URL(page.url()).searchParams.get("graine");
	expect(secondSeed).not.toBe(firstSeed);
	expect(secondSeed).toMatch(/^[a-z0-9]{16}$/);
	await expect(page).toHaveURL(/cap=15/);
	await expect(page).toHaveURL(/course=mix/);
	await expect(page).toHaveURL(/format=amrap/);
	await expect(page).toHaveURL(/niveau=intermediaire/);
	await expect(page.locator("main .button")).toHaveCount(1);

	await page.getByLabel("Durée").selectOption({ label: "Au hasard" });
	await page.getByRole("button", { name: "Relancer" }).click();
	await expect(page).not.toHaveURL(/cap=/);
	await expect(page).toHaveURL(/format=amrap/);
});

test("?course=slug verrouille la course, un slug inconnu non", async ({
	page,
}) => {
	await page.goto("wod/?course=hyrox-open");
	await expect(page.getByLabel("Course")).toHaveValue("hyrox-open");
	await expect(page.getByRole("heading", { name: "Séance" })).toHaveCount(0);
	await page.getByLabel("Format").selectOption("forTime");
	await page.getByRole("button", { name: "Générer" }).click();
	await expect(page).toHaveURL(/course=hyrox-open/);
	await expect(page).toHaveURL(/graine=/);
	await expect(page.locator("#seance")).toContainText("HYROX Open solo");
	await expect(page).not.toHaveURL(/niveau=/);

	await page.goto("wod/?course=mix");
	await expect(page.getByLabel("Course")).toHaveValue("mix");

	await page.goto("wod/?course=inconnue");
	await expect(page.getByLabel("Course")).toHaveValue("");
});

test("le lien partagé redonne les mêmes exercices et les mêmes verrous", async ({
	page,
}) => {
	await page.goto(shared);
	await expect(page.getByRole("button", { name: "Relancer" })).toBeEnabled();
	await expect(page.getByLabel("Course")).toHaveValue("hyrox-open");
	await expect(page.getByLabel("Durée")).toHaveValue("20");
	await expect(page.getByLabel("Format")).toHaveValue("forTime");
	await expect(page.locator("#seance")).toContainText("For Time");
	await expect(page.locator("#seance")).toContainText("20 min");
	await expect(page.locator("#seance")).toContainText("HYROX Open solo");
	await expect(page.locator("#seance")).toContainText(
		"Échauffement proposé : 5 min",
	);
	const names = await page.locator("#seance .name").allTextContents();
	expect(names.length).toBeGreaterThanOrEqual(3);

	await page.reload();
	await expect(page.locator("#seance .name")).toHaveText(names);
});

test("les zones tactiles font au moins 44 px", async ({ page }) => {
	await page.goto("wod/");
	await expect(page.getByRole("button", { name: "Générer" })).toBeEnabled();
	const button = await page
		.getByRole("button", { name: "Générer" })
		.boundingBox();
	expect(button?.height).toBeGreaterThanOrEqual(44);
	expect(button?.width).toBeGreaterThanOrEqual(44);
	for (const select of await page.getByRole("combobox").all()) {
		const box = await select.boundingBox();
		expect(box?.height).toBeGreaterThanOrEqual(44);
	}
});
