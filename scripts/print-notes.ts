// Affiche les notes calculées des 11 courses et leurs justifications (aide à la relecture du barème).
// Usage : node scripts/print-notes.ts
import { readdirSync, readFileSync } from "node:fs";
import {
	CATEGORIES,
	CATEGORY_LABELS,
	computeNotes,
} from "../src/lib/bareme.ts";
import { baremeConfigSchema, raceSchema } from "../src/lib/schemas.ts";

const config = baremeConfigSchema.parse(
	JSON.parse(readFileSync("data/config/bareme.json", "utf8")),
);
const show = (note: number | null) => (note === null ? "?" : String(note));

for (const file of readdirSync("data/races").filter((name) =>
	name.endsWith(".json"),
)) {
	const race = raceSchema.parse(
		JSON.parse(readFileSync(`data/races/${file}`, "utf8")),
	);
	const { categories, globale } = computeNotes(
		race.bareme,
		race.dureeMoyenneMin,
		config,
	);
	console.log(
		`\n${race.nom} — globale ${show(globale.note)}/5 (${globale.justification})`,
	);
	for (const category of CATEGORIES) {
		const { note, justification } = categories[category];
		console.log(
			`  ${CATEGORY_LABELS[category].padEnd(14)} ${show(note)}  ${justification}`,
		);
	}
}
