// Échoue si une dépendance directe est dépréciée sur npm (§10 des specs).
// Usage : node scripts/check-deprecated.ts
import { readFileSync } from "node:fs";
import {
	buildReport,
	type InstalledPackage,
	type Lockfile,
	listInstalledPackages,
} from "./deprecated.ts";

const REGISTRY = "https://registry.npmjs.org";
const CONCURRENCY = 16;

async function fetchDeprecation(
	pkg: InstalledPackage,
): Promise<string | undefined> {
	const name = pkg.name.replace("/", "%2F");
	const response = await fetch(`${REGISTRY}/${name}/${pkg.version}`);
	if (!response.ok)
		throw new Error(
			`Registre npm : ${response.status} pour ${pkg.name}@${pkg.version}`,
		);
	const manifest = (await response.json()) as { deprecated?: string };
	return manifest.deprecated;
}

const lock = JSON.parse(readFileSync("package-lock.json", "utf8")) as Lockfile;
const packages = listInstalledPackages(lock);
const deprecations = new Map<string, string>();

for (let i = 0; i < packages.length; i += CONCURRENCY) {
	const batch = packages.slice(i, i + CONCURRENCY);
	const results = await Promise.all(batch.map(fetchDeprecation));
	results.forEach((message, j) => {
		const pkg = batch[j];
		if (message && pkg) deprecations.set(`${pkg.name}@${pkg.version}`, message);
	});
}

const { errors, warnings } = buildReport(packages, deprecations);
for (const line of warnings)
	console.warn(`⚠ Dépendance indirecte dépréciée : ${line}`);
for (const line of errors)
	console.error(`✗ Dépendance directe dépréciée : ${line}`);
console.log(
	`${packages.length} paquets vérifiés, ${errors.length} erreur(s), ${warnings.length} avertissement(s).`,
);
if (errors.length > 0) process.exit(1);
