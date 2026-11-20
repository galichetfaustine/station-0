// Construit un lien interne à partir de la base du site.
// Sur Vercel la base est "/" (le site est à la racine). La fonction accepte aussi un préfixe, par exemple "/station-0" : les tests unitaires vérifient ce cas, pas l'adresse du site.
export function withBase(base: string, path: string): string {
	const prefix = base.endsWith("/") ? base.slice(0, -1) : base;
	const suffix = path.startsWith("/") ? path : `/${path}`;
	return `${prefix}${suffix}`;
}
