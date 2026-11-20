// Mise en forme de la fiche course (§4, US1.3).
import type { Race } from "./schemas.ts";

type Segment = Race["deroule"][number];

const numberFormat = new Intl.NumberFormat("fr-FR", {
	maximumFractionDigits: 2,
});
const formatNumber = (value: number) => numberFormat.format(value);

const UNIT_LABELS = {
	repetitions: "répétitions",
	metres: "m",
	calories: "calories",
	secondes: "s",
} as const;

/** Distance lisible : « 400 m », « 1 km », « 4,8 km ». */
export function formatDistance(meters: number): string {
	return meters < 1000
		? `${formatNumber(meters)} m`
		: `${formatNumber(meters / 1000)} km`;
}

/** Une ligne du déroulé : « Course : 1 km », « Sled push — 50 m — 152 kg hommes / 102 kg femmes ». */
export function formatSegment(segment: Segment): string {
	if (segment.type === "course")
		return `Course : ${formatDistance(segment.distanceM)}`;
	const parts = [segment.nom];
	if (segment.volume !== undefined && segment.unite !== undefined) {
		parts.push(
			segment.unite === "metres"
				? formatDistance(segment.volume)
				: `${formatNumber(segment.volume)} ${UNIT_LABELS[segment.unite]}`,
		);
	}
	if (segment.chargeKg) {
		parts.push(
			`${formatNumber(segment.chargeKg.homme)} kg hommes / ${formatNumber(segment.chargeKg.femme)} kg femmes`,
		);
	}
	return parts.join(" — ");
}

/** Nom de domaine sans « www. » : « hyrox.com ». */
export function siteName(url: string): string {
	return new URL(url).hostname.replace(/^www\./, "");
}

/** Mention du lien d'inscription, toujours vers le site officiel (HYROX : page d'accueil uniquement). */
export function registrationLabel(race: Pick<Race, "siteOfficiel">): string {
	return `Inscriptions sur ${siteName(race.siteOfficiel)}`;
}

export const FORMAT_LABELS: Record<Race["formats"][number], string> = {
	solo: "Solo",
	duo: "Duo",
	relais: "Relais",
	equipe: "Équipe",
};
