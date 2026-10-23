// Logique pure du contrôle des dépendances dépréciées (§10 des specs) :
// sans réseau, donc testable sur des données d'exemple.

export interface InstalledPackage {
	name: string;
	version: string;
	direct: boolean;
}

interface LockEntry {
	name?: string;
	version?: string;
	link?: boolean;
}

export interface Lockfile {
	packages: Record<
		string,
		LockEntry & {
			dependencies?: Record<string, string>;
			devDependencies?: Record<string, string>;
		}
	>;
}

/** Liste les paquets installés d'après package-lock.json, sans doublon. */
export function listInstalledPackages(lock: Lockfile): InstalledPackage[] {
	const root = lock.packages[""] ?? {};
	const directNames = new Set([
		...Object.keys(root.dependencies ?? {}),
		...Object.keys(root.devDependencies ?? {}),
	]);
	const seen = new Map<string, InstalledPackage>();

	for (const [path, entry] of Object.entries(lock.packages)) {
		if (path === "" || entry.link || !entry.version) continue;
		const name =
			entry.name ??
			path.slice(path.lastIndexOf("node_modules/") + "node_modules/".length);
		const key = `${name}@${entry.version}`;
		// Seul un paquet à la racine de node_modules est une dépendance directe.
		const direct = path === `node_modules/${name}` && directNames.has(name);
		const previous = seen.get(key);
		seen.set(key, {
			name,
			version: entry.version,
			direct: direct || (previous?.direct ?? false),
		});
	}
	return [...seen.values()];
}

export interface DeprecationReport {
	errors: string[];
	warnings: string[];
}

/**
 * Dépendance directe dépréciée → erreur (la CI échoue).
 * Dépendance indirecte dépréciée → simple avertissement.
 */
export function buildReport(
	packages: InstalledPackage[],
	deprecations: Map<string, string>,
): DeprecationReport {
	const report: DeprecationReport = { errors: [], warnings: [] };
	for (const pkg of packages) {
		const message = deprecations.get(`${pkg.name}@${pkg.version}`);
		if (message === undefined) continue;
		const line = `${pkg.name}@${pkg.version} : ${message}`;
		(pkg.direct ? report.errors : report.warnings).push(line);
	}
	return report;
}
