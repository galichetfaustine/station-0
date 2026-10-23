// Valide tous les fichiers JSON de data/ avant le build (US0.5).
// Usage : node scripts/validate-data.ts
import { readdirSync, readFileSync } from "node:fs";
import { validateDataFiles } from "../src/lib/data-validation.ts";

const files = readdirSync("data", { recursive: true, encoding: "utf8" })
	.filter((name) => name.endsWith(".json"))
	.map((name) => {
		const path = `data/${name.replaceAll("\\", "/")}`;
		return { path, content: readFileSync(path, "utf8") };
	});

const errors = validateDataFiles(files);
if (errors.length > 0) {
	console.error(`✗ ${errors.length} erreur(s) dans les données :`);
	for (const error of errors) console.error(`  - ${error}`);
	process.exit(1);
}
console.log(`✓ ${files.length} fichier(s) de données valides.`);
