// Construit un lien interne qui tient compte du sous-dossier du site (/station-0 sur GitHub Pages).
export function withBase(base: string, path: string): string {
	const prefix = base.endsWith("/") ? base.slice(0, -1) : base;
	const suffix = path.startsWith("/") ? path : `/${path}`;
	return `${prefix}${suffix}`;
}
