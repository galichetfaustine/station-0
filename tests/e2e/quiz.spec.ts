import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("l'en-tête mène au quiz et signale la page", async ({ page }) => {
	await page.goto("./");
	const nav = page.getByRole("navigation", { name: "Navigation principale" });
	await expect(nav.getByRole("link", { name: "WOD" })).toHaveCount(0);
	await nav.getByRole("link", { name: "Quiz" }).click();
	await expect(page).toHaveURL(/\/quiz\/$/);
	await expect(page.getByRole("heading", { level: 1 })).toHaveText("Quiz");
	await expect(nav.getByRole("link", { name: "Quiz" })).toHaveAttribute(
		"aria-current",
		"page",
	);
});

test("l'accueil propose le quiz sans deuxième bouton orange", async ({
	page,
}) => {
	await page.goto("./");
	await expect(page.locator("main .button")).toHaveCount(1);
	await page
		.getByRole("link", { name: "Pas sûr que ce soit pour toi ? Fais le quiz" })
		.click();
	await expect(page).toHaveURL(/\/quiz\/$/);
});

test("une question à la fois, au clavier, et chaque réponse met l'adresse à jour", async ({
	page,
}) => {
	await page.goto("quiz/");
	await expect(page.locator("#quiz-progress")).toHaveText("Question 1 sur 7");
	await expect(
		page.getByRole("group", { name: /Courir 5 km sans t'arrêter/ }),
	).toBeVisible();
	await expect(page.getByRole("group", { name: /Les charges/ })).toBeHidden();
	await expect(page.locator("main .button")).toHaveCount(1);

	const pasEncore = page.getByRole("radio", { name: "Pas encore possible" });
	await pasEncore.focus();
	await page.keyboard.press("ArrowDown");
	await expect(
		page.getByRole("radio", { name: "Faisable mais dur" }),
	).toBeChecked();
	await expect(page).toHaveURL(/course=faisable/);
	await expect(page.getByText("Choisie")).toBeVisible();

	await page.keyboard.press("Tab");
	await expect(page.getByRole("button", { name: "Continuer" })).toBeFocused();
	await page.keyboard.press("Enter");

	await expect(page.locator("#quiz-progress")).toHaveText("Question 2 sur 7");
	await expect(page.locator("#quiz-question")).toBeFocused();
	await expect(page).toHaveURL(/etape=2/);
	await expect(page.getByRole("group", { name: /Les charges/ })).toBeVisible();

	await page.getByRole("button", { name: "Retour" }).click();
	await expect(page.locator("#quiz-progress")).toHaveText("Question 1 sur 7");
	await expect(
		page.getByRole("radio", { name: "Faisable mais dur" }),
	).toBeChecked();

	await page.reload();
	await expect(page.locator("#quiz-progress")).toHaveText("Question 1 sur 7");
	await expect(
		page.getByRole("radio", { name: "Faisable mais dur" }),
	).toBeChecked();
});

test("les zones tactiles des réponses font au moins 44 px", async ({
	page,
}) => {
	await page.goto("quiz/");
	await expect(page.locator("#quiz-progress")).toHaveText("Question 1 sur 7");
	for (const choice of await page.locator(".choice:visible").all()) {
		const box = await choice.boundingBox();
		expect(box?.height).toBeGreaterThanOrEqual(44);
	}
	const button = await page
		.getByRole("button", { name: "Continuer" })
		.boundingBox();
	expect(button?.height).toBeGreaterThanOrEqual(44);
	expect(button?.width).toBeGreaterThanOrEqual(44);
});

test("les sept questions du §7 sont dans la page", async ({ page }) => {
	await page.goto("quiz/");
	await expect(page.locator("legend")).toHaveCount(7);
	await expect(page.locator("legend").nth(3)).toContainText(
		"Le mouvement le plus technique que tu maîtrises",
	);
	await expect(page.locator("legend").nth(6)).toContainText(
		"Jusqu'où es-tu prêt·e à aller ?",
	);
});

const reference =
	"quiz/?course=faisable&force=regulierement&cardio=souvent&gym=boxJumps&format=duo&objectif=chrono&zone=frontaliers";

test("terminer les 7 questions montre la course, et l'adresse redonne le même résultat", async ({
	page,
}) => {
	await page.goto("quiz/");
	await expect(page.locator("#quiz-progress")).toHaveText("Question 1 sur 7");
	const steps: [string, string][] = [
		["Faisable mais dur", "Continuer"],
		["Régulièrement", "Continuer"],
		["Souvent, 20 min et plus", "Continuer"],
		["Box jumps", "Continuer"],
		["À deux", "Continuer"],
		["Me tester sur un chrono", "Continuer"],
		["France et pays frontaliers", "Voir ma course"],
	];
	for (const [answer, button] of steps) {
		await page.getByRole("radio", { name: answer }).check();
		await page.getByRole("button", { name: button }).click();
	}
	await expect(
		page.getByRole("heading", { level: 2, name: "Deadly Dozen" }),
	).toBeVisible();
	await expect(page.getByText("Score : 100 %")).toBeVisible();
	await expect(page).toHaveURL(/course=faisable/);
	await expect(page).not.toHaveURL(/etape=/);
	await expect(page.locator("main .button")).toHaveCount(1);

	await page.getByRole("link", { name: "Modifier mes réponses" }).click();
	await expect(page.locator("#quiz-progress")).toHaveText("Question 1 sur 7");
	await expect(
		page.getByRole("radio", { name: "Faisable mais dur" }),
	).toBeChecked();
});

test("l'adresse du résultat redonne Deadly Dozen, l'alternative et le lien WOD", async ({
	page,
}) => {
	await page.goto(reference);
	await expect(
		page.getByRole("heading", { level: 2, name: "Deadly Dozen" }),
	).toBeVisible();
	await expect(page.locator("article li")).toHaveText(["Course", "Force"]);
	await expect(
		page.getByRole("heading", { name: "Point d'attention" }),
	).toHaveCount(0);
	await expect(page.getByRole("link", { name: "DEKA MILE" })).toHaveAttribute(
		"href",
		/\/courses\/deka-mile\/$/,
	);
	await expect(
		page.getByRole("link", { name: "Voir la fiche" }),
	).toHaveAttribute("href", /\/courses\/deadly-dozen\/$/);
	const results = await new AxeBuilder({ page }).analyze();
	expect(results.violations).toEqual([]);

	await page.getByRole("link", { name: "WOD pour progresser" }).click();
	await expect(page.getByRole("heading", { level: 1 })).toHaveText(
		"Bientôt disponible",
	);
	await expect(
		page.getByRole("navigation").getByRole("link", { name: "WOD" }),
	).toHaveCount(0);
});

test("sous 40 %, on montre la plus accessible et le message honnête", async ({
	page,
}) => {
	await page.goto(
		"quiz/?course=pasEncore&force=regulierement&cardio=jamais&gym=aucun&format=solo&objectif=kiffer&zone=frontaliers",
	);
	await expect(
		page.getByText("Pas encore, mais voici par où commencer"),
	).toBeVisible();
	await expect(
		page.getByRole("heading", { level: 2, name: "DEKA STRONG" }),
	).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Point d'attention" }),
	).toBeVisible();
	await expect(page.getByRole("heading", { name: "Alternative" })).toHaveCount(
		0,
	);
	await expect(page.locator("main .button")).toHaveCount(1);
});

test("en mode clair, le quiz reste un écran encre", async ({ page }) => {
	await page.emulateMedia({ colorScheme: "light" });
	await page.goto("quiz/");
	await expect(page.locator("body")).toHaveCSS(
		"background-color",
		"rgb(11, 11, 15)",
	);
	await expect(page.locator("body")).toHaveCSS("color", "rgb(255, 255, 255)");
	await expect(page.locator(".site-header")).toHaveCSS(
		"color",
		"rgb(255, 255, 255)",
	);
	const question = page.locator("#quiz-question");
	await expect(question).toBeVisible();
	expect(
		await question.evaluate((el) =>
			Number.parseFloat(getComputedStyle(el).fontSize),
		),
	).toBeGreaterThanOrEqual(40);

	await page.goto(reference);
	const band = page.locator("header.band");
	await expect(band).toHaveCSS("background-color", "rgb(61, 72, 255)");
	const name = band.getByRole("heading", { level: 2 });
	await expect(name).toHaveCSS("color", "rgb(255, 255, 255)");
	expect(
		await name.evaluate((el) =>
			Number.parseFloat(getComputedStyle(el).fontSize),
		),
	).toBeGreaterThanOrEqual(64);
	await expect(page.locator("main .button")).toHaveCount(1);
	expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

	await page.goto("courses/");
	await expect(page.locator("body")).toHaveCSS(
		"background-color",
		"rgb(247, 246, 243)",
	);
});

test.describe("sans JavaScript", () => {
	test.use({ javaScriptEnabled: false });

	test("les 7 questions s'affichent et le formulaire écrit l'adresse", async ({
		page,
	}) => {
		await page.goto("quiz/");
		await expect(page.locator("legend")).toHaveCount(7);
		await expect(page.getByText("Muscle-up")).toBeVisible();
		await page.getByRole("radio", { name: "Facile" }).check();
		await page.getByRole("radio", { name: "Un peu en salle" }).check();
		await page.getByRole("radio", { name: "De temps en temps" }).check();
		await page.getByRole("radio", { name: "Burpees" }).check();
		await page.getByRole("radio", { name: "À deux" }).check();
		await page.getByRole("radio", { name: "Finir et kiffer" }).check();
		await page.getByRole("radio", { name: "France uniquement" }).check();
		await page.getByRole("button", { name: "Continuer" }).click();
		await expect(page).toHaveURL(/course=facile/);
		await expect(page).toHaveURL(/force=unPeu/);
		await expect(page).toHaveURL(/cardio=parfois/);
		await expect(page).toHaveURL(/gym=burpees/);
		await expect(page).toHaveURL(/format=duo/);
		await expect(page).toHaveURL(/objectif=kiffer/);
		await expect(page).toHaveURL(/zone=france/);
	});
});
