// Calcul des notes de difficulté (§5, US1.2) depuis les données brutes du règlement.
// Les seuils viennent de data/config/bareme.json : les modifier recalcule toutes les notes.
import type { Bareme, BaremeConfig } from "./schemas.ts";

export const CATEGORIES = ["course", "force", "cardio", "gym"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
	course: "Course",
	force: "Force",
	cardio: "Cardio / ergo",
	gym: "Gym / agilité",
};

export const MOVEMENT_LABELS: Record<
	keyof BaremeConfig["gym"]["mouvements"],
	string
> = {
	marcher: "marcher",
	porter: "porter",
	burpees: "burpees",
	fentes: "fentes",
	wallBalls: "wall balls",
	boxJumps: "box jumps",
	bearCrawl: "bear crawl",
	snatchHaltere: "snatch haltère",
	tractions: "tractions",
	toesToBar: "toes-to-bar",
	obstaclesSimples: "obstacles simples",
	muscleUp: "muscle-up",
	handstandPushUp: "handstand push-up",
	obstaclesTechniques: "obstacles techniques",
};

/** Note d'une catégorie et la donnée qui la justifie ; note null si l'information manque. */
export interface CategoryNote {
	note: number | null;
	justification: string;
}

export interface RaceNotes {
	categories: Record<Category, CategoryNote>;
	globale: CategoryNote & { moyenne: number | null; ajustement: number };
}

type Palier = BaremeConfig["course"]["distanceM"][number];

/** Note de 1 à 5 : la plus haute dont le palier est atteint, 1 sinon. */
export function levelFor(value: number, paliers: Palier[]): number {
	let note = 1;
	for (const palier of paliers) {
		const reached =
			"min" in palier ? value >= palier.min : value > palier.plusDe;
		if (reached && palier.note > note) note = palier.note;
	}
	return note;
}

const numberFormat = new Intl.NumberFormat("fr-FR", {
	maximumFractionDigits: 2,
});
const formatNumber = (value: number) => numberFormat.format(value);
const formatKm = (meters: number) => `${formatNumber(meters / 1000)} km`;

function courseNote(bareme: Bareme, config: BaremeConfig): CategoryNote {
	if (!bareme.course)
		return { note: null, justification: "Distance de course à confirmer" };
	const { distanceM } = bareme.course;
	const note = levelFor(distanceM, config.course.distanceM);
	if (distanceM === 0) return { note, justification: "Aucune course à pied" };
	const perAthlete = bareme.partageEffort > 1 ? " par athlète" : " au total";
	return {
		note,
		justification: `${formatKm(distanceM)} de course${perAthlete}`,
	};
}

function forceNote(bareme: Bareme, config: BaremeConfig): CategoryNote {
	if (!bareme.force)
		return { note: null, justification: "Charges à confirmer" };
	const { chargeLibreMaxKg, sledKg, barre } = bareme.force;
	const genre = config.chargeReference;
	const genreLabel = genre === "homme" ? "charges hommes" : "charges femmes";
	const candidates: CategoryNote[] = [];

	if (chargeLibreMaxKg) {
		const load = chargeLibreMaxKg[genre];
		candidates.push({
			note: levelFor(load, config.force.chargeLibreKg),
			justification:
				load === 0
					? "Poids du corps uniquement"
					: `Charge la plus lourde : ${formatNumber(load)} kg (${genreLabel})`,
		});
	}
	if (sledKg) {
		const sled = sledKg[genre];
		const heavy = sled >= config.force.sledLourdKgMin;
		candidates.push({
			note: heavy ? config.force.noteSledLourd : config.force.noteSledLeger,
			justification: `Sled de ${formatNumber(sled)} kg, ${heavy ? "lourd" : "léger"} (${genreLabel})`,
		});
	}
	if (barre === "sousMax") {
		candidates.push({
			note: config.force.noteBarreSousMax,
			justification: "Barre à charge sous-maximale",
		});
	}
	if (barre === "testMax") {
		candidates.push({
			note: config.force.noteTestMax,
			justification: "Tests de charge maximale (1RM, 2RM, 3RM…)",
		});
	}
	return candidates.reduce<CategoryNote>(
		(best, candidate) =>
			(candidate.note ?? 0) > (best.note ?? 0) ? candidate : best,
		{ note: null, justification: "Charges à confirmer" },
	);
}

function cardioNote(bareme: Bareme, config: BaremeConfig): CategoryNote {
	if (!bareme.cardio)
		return {
			note: null,
			justification: "Volume d'ergo et durée d'effort à confirmer",
		};
	const { ergoM, dureeEffortMin } = bareme.cardio;
	const shared = bareme.partageEffort > 1 ? " par athlète" : "";
	const ergo = ergoM === null ? null : Math.round(ergoM / bareme.partageEffort);
	const byErgo = ergo === null ? 0 : levelFor(ergo, config.cardio.ergoM);
	const byDuration =
		dureeEffortMin === null
			? 0
			: levelFor(dureeEffortMin, config.cardio.dureeEffortMin);
	const ergoText =
		ergo === null
			? "volume d'ergo non fixé"
			: ergo === 0
				? "aucun ergo"
				: `${formatNumber(ergo)} m d'ergo${shared}`;
	const durationText =
		dureeEffortMin === null
			? "durée d'effort inconnue"
			: `environ ${dureeEffortMin} min d'effort`;
	// La donnée qui produit la note est citée en premier.
	const justification =
		byErgo >= byDuration
			? `${capitalize(ergoText)}, ${durationText}`
			: `${capitalize(durationText)}, ${ergoText}`;
	return { note: Math.max(byErgo, byDuration), justification };
}

function gymNote(bareme: Bareme, config: BaremeConfig): CategoryNote {
	if (!bareme.gym)
		return { note: null, justification: "Mouvements à confirmer" };
	const movement = bareme.gym.mouvementLePlusTechnique;
	return {
		note: config.gym.mouvements[movement],
		justification: `Mouvement le plus technique : ${MOVEMENT_LABELS[movement]}`,
	};
}

function capitalize(text: string): string {
	return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Calcule les 4 notes et la note globale d'une course. */
export function computeNotes(
	bareme: Bareme,
	dureeMoyenneMin: number,
	config: BaremeConfig,
): RaceNotes {
	const categories: Record<Category, CategoryNote> = {
		course: courseNote(bareme, config),
		force: forceNote(bareme, config),
		cardio: cardioNote(bareme, config),
		gym: gymNote(bareme, config),
	};

	const missing = CATEGORIES.filter(
		(category) => categories[category].note === null,
	);
	const {
		dureeCourteMoinsDe,
		ajustementCourt,
		dureeLonguePlusDe,
		ajustementLong,
	} = config.globale;
	const ajustement =
		dureeMoyenneMin < dureeCourteMoinsDe
			? ajustementCourt
			: dureeMoyenneMin > dureeLonguePlusDe
				? ajustementLong
				: 0;

	if (missing.length > 0) {
		const labels = missing
			.map((category) => CATEGORY_LABELS[category].toLowerCase())
			.join(", ");
		return {
			categories,
			globale: {
				note: null,
				moyenne: null,
				ajustement,
				justification: `À confirmer (${labels})`,
			},
		};
	}

	const moyenne =
		CATEGORIES.reduce(
			(sum, category) => sum + (categories[category].note ?? 0),
			0,
		) / CATEGORIES.length;
	const note = Math.min(5, Math.max(1, Math.round(moyenne + ajustement)));
	const ajustementText =
		ajustement === 0
			? ""
			: `, ${ajustement > 0 ? "+" : "−"}${formatNumber(Math.abs(ajustement))} pour la durée (${dureeMoyenneMin} min)`;
	return {
		categories,
		globale: {
			note,
			moyenne,
			ajustement,
			justification: `Moyenne des 4 catégories : ${formatNumber(moyenne)}${ajustementText}`,
		},
	};
}
