// Nom du site centralisé (décision D1) : le changer ici le change partout.
export const SITE = {
	name: "Station 0",
	tagline:
		"Trouve ta première course hybride, et commence à t'y préparer aujourd'hui.",
	lang: "fr",
} as const;

/** Entrées de la navigation. Le WOD y est depuis que la page du générateur existe (US3.3). */
export const NAV = [
	{ label: "Courses", path: "/courses/" },
	{ label: "Quiz", path: "/quiz/" },
	{ label: "WOD", path: "/wod/" },
] as const;
