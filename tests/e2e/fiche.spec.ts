import { expect, test } from "@playwright/test";

test("la fiche HYROX Open solo présente les 7 blocs du §4", async ({
	page,
}) => {
	await page.goto("courses/hyrox-open/");
	// 1. En-tête
	await expect(page.getByRole("heading", { level: 1 })).toHaveText(
		"HYROX Open solo",
	);
	await expect(page.locator(".hero .global-value")).toHaveText("4");
	await expect(page.locator(".hero")).toContainText("Durée : 1 h – 1 h 30");
	// 2. Pour qui ? et déroulé dans l'ordre
	await expect(page.getByRole("heading", { name: "Pour qui ?" })).toBeVisible();
	const steps = page.locator(".steps li");
	await expect(steps).toHaveCount(16);
	await expect(steps.nth(0)).toHaveText("Course : 1 km");
	await expect(steps.nth(3)).toHaveText(
		"Sled push — 50 m — 152 kg hommes / 102 kg femmes",
	);
	// 3. Les 4 catégories et leur justification
	await expect(page.locator(".notes details")).toHaveCount(5);
	// 4. Prochaines dates et inscription
	await expect(
		page.getByRole("heading", { name: "Prochaines dates" }),
	).toBeVisible();
	// 5. Site officiel
	await expect(
		page.getByRole("link", { name: "Site officiel : hyrox.com" }),
	).toHaveAttribute("href", "https://hyrox.com");
	// 6. et 7. Générateur et quiz
	await expect(
		page.getByText("Essayer un WOD inspiré de cette course"),
	).toBeVisible();
	await expect(page.getByText("Pas sûr que ce soit pour toi ?")).toBeVisible();
});

test("« Pourquoi 5/5 ? » affiche la donnée qui justifie la note", async ({
	page,
}) => {
	await page.goto("courses/hyrox-open/");
	const course = page.getByText("Pourquoi 5/5 ?");
	await course.click();
	await expect(page.getByText("8 km de course au total")).toBeVisible();
});

test("HYROX : le lien d'inscription mène à la page d'accueil de hyrox.com", async ({
	page,
}) => {
	await page.goto("courses/hyrox-doubles/");
	const link = page.locator("a.button", {
		hasText: "Inscriptions sur hyrox.com",
	});
	await expect(link).toHaveAttribute("href", "https://hyrox.com");
	await expect(link).toHaveAttribute("target", "_blank");
});

test("une note globale en demi-point et une durée estimée s'affichent", async ({
	page,
}) => {
	await page.goto("courses/deadly-dozen/");
	await expect(page.locator(".hero .global-value")).toHaveText("3,5");
	await expect(page.locator(".hero")).toContainText("Durée : environ 1 h 10");
});

test("Turf Games : note à venir et remarques visibles", async ({ page }) => {
	await page.goto("courses/turf-games/");
	await expect(page.locator(".hero")).toContainText(
		"Note à venir — règlement non public",
	);
	await expect(page.getByRole("heading", { name: "À savoir" })).toBeVisible();
});

test("le catalogue mène à la fiche de chaque course", async ({ page }) => {
	await page.goto("courses/");
	await page.getByRole("link", { name: "DEKA STRONG" }).click();
	await expect(page).toHaveURL(/\/station-0\/courses\/deka-strong\/$/);
	await expect(page.getByRole("heading", { level: 1 })).toHaveText(
		"DEKA STRONG",
	);
});

test.describe("sans JavaScript", () => {
	test.use({ javaScriptEnabled: false });

	test("la fiche et ses explications fonctionnent", async ({ page }) => {
		await page.goto("courses/hyrox-open/");
		await page.getByText("Pourquoi 4/5 ?").first().click();
		await expect(page.locator(".notes details[open]")).toHaveCount(1);
	});
});

test("la page « Comment on note » reprend le barème depuis la configuration", async ({
	page,
}) => {
	await page.goto("methode/");
	await expect(page.getByRole("heading", { level: 1 })).toHaveText(
		"Comment on note",
	);
	const rows = page.locator("tbody tr");
	await expect(rows).toHaveCount(5);
	await expect(rows.nth(4)).toContainText("à partir de 8 km");
	await expect(rows.nth(3)).toContainText("Sled lourd (100 kg et plus)");
});
