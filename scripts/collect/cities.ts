// Noms de villes en français pour l'affichage et pour la priorité des saisies manuelles (même ville = même clé).

const FRENCH_NAMES: Record<string, string> = {
	antwerp: "Anvers",
	barcelona: "Barcelone",
	basel: "Bâle",
	bodensee: "Lac de Constance",
	brussels: "Bruxelles",
	cologne: "Cologne",
	edinburgh: "Édimbourg",
	florence: "Florence",
	frankfurt: "Francfort",
	"frankfurt am main": "Francfort",
	"garda lake": "Lac de Garde",
	geneva: "Genève",
	ghent: "Gand",
	hamburg: "Hambourg",
	köln: "Cologne",
	london: "Londres",
	mechelen: "Malines",
	milan: "Milan",
	munich: "Munich",
	münchen: "Munich",
	naples: "Naples",
	rome: "Rome",
	seville: "Séville",
	"st gallen": "Saint-Gall",
	"st. gallen": "Saint-Gall",
	turin: "Turin",
	venice: "Venise",
};

/** « LONDON » → « London » ; « ST GALLEN » → « St Gallen ». */
export function titleCase(text: string): string {
	return text
		.toLowerCase()
		.replace(
			/(^|[\s-])(\p{L})/gu,
			(_, separator: string, letter: string) =>
				separator + letter.toUpperCase(),
		);
}

/** Nom français d'une ville quand il diffère, sinon le nom d'origine. */
export function frenchCity(name: string): string {
	const clean = name.trim();
	return FRENCH_NAMES[clean.toLowerCase()] ?? clean;
}
