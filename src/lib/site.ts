// Nom du site centralisé (décision D1) : le changer ici le change partout.
export const SITE = {
	name: "Station 0",
	tagline:
		"Trouve ta première course hybride, et commence à t'y préparer aujourd'hui.",
	lang: "fr",
} as const;

/** Entrées de la navigation. La page WOD existe, sans lien : le générateur arrive au Lot 3. */
export const NAV = [
	{ label: "Courses", path: "/courses/" },
	{ label: "Quiz", path: "/quiz/" },
] as const;
