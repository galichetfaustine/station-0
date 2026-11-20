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

test("le titre, le texte, le bouton et le lien quiz restent entiers", async ({
	page,
}) => {
	for (const width of [390, 1280]) {
		await page.setViewportSize({ width, height: 800 });
		await page.goto("./");

		const report = await page.evaluate(async () => {
			await document.fonts.ready;
			const viewWidth = document.documentElement.clientWidth;
			const limit = viewWidth - 24;
			const selectors = ["h1", ".pitch", ".hero .button", ".quiz-entry a"];
			const overflow: { sel: string; left: number; right: number }[] = [];

			for (const sel of selectors) {
				const el = document.querySelector(sel);
				if (!el) {
					overflow.push({ sel, left: -1, right: -1 });
					continue;
				}
				const range = document.createRange();
				range.selectNodeContents(el);
				const rects = [el.getBoundingClientRect(), ...range.getClientRects()];
				for (const rect of rects) {
					if (rect.width < 0.5 || rect.height < 0.5) continue;
					if (rect.right > limit + 0.5 || rect.left < -0.5) {
						overflow.push({
							sel,
							left: Math.round(rect.left),
							right: Math.round(rect.right),
						});
					}
				}
			}

			const splitWords = (root: Element | null) => {
				const split: string[] = [];
				if (!root) return split;
				const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
				while (walker.nextNode()) {
					const node = walker.currentNode;
					const raw = node.textContent ?? "";
					let offset = 0;
					for (const word of raw.split(/\s+/).filter(Boolean)) {
						const start = raw.indexOf(word, offset);
						const wordRange = document.createRange();
						wordRange.setStart(node, start);
						wordRange.setEnd(node, start + word.length);
						const wordRects = [...wordRange.getClientRects()].filter(
							(rect) => rect.width > 0.5,
						);
						if (wordRects.length > 1) split.push(word);
						offset = start + word.length;
					}
				}
				return split;
			};

			const h1 = document.querySelector("h1");
			const copy = document.querySelector(".hero-copy");
			const copyBox = copy?.getBoundingClientRect();
			const parentWidth = copyBox?.width ?? 0;
			const specified = h1 ? getComputedStyle(h1).maxWidth : "0px";
			const titleMax = specified.endsWith("%")
				? (Number.parseFloat(specified) / 100) * parentWidth
				: Number.parseFloat(specified);

			return {
				overflow,
				split: [
					...splitWords(h1),
					...splitWords(document.querySelector(".quiz-entry a")),
				],
				titleWiderThanBlock: titleMax > parentWidth + 0.5,
				titleOverflowsBox: h1 ? h1.scrollWidth > h1.clientWidth + 1 : true,
				scroll:
					document.documentElement.scrollWidth -
					document.documentElement.clientWidth,
				copyLeft: copyBox ? Math.round(copyBox.left) : null,
				copyRight: copyBox ? Math.round(copyBox.right) : null,
				viewWidth,
			};
		});

		expect(report.overflow).toEqual([]);
		expect(report.split).toEqual([]);
		expect(report.titleWiderThanBlock).toBe(false);
		expect(report.titleOverflowsBox).toBe(false);
		expect(report.scroll).toBeLessThanOrEqual(1);
		expect(report.copyRight).not.toBeNull();
		expect(report.copyRight ?? 0).toBeLessThanOrEqual(report.viewWidth - 24);
		if (width >= 1000) {
			expect(report.copyLeft ?? 0).toBeGreaterThan(report.viewWidth / 2);
		} else {
			expect(report.copyLeft ?? 999).toBeLessThan(report.viewWidth / 2);
		}
	}
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
