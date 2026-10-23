// Rappel mensuel (US1.5) : corps du ticket qui liste les dates saisies à la main à revoir.
// Usage : node scripts/collect/reminder.ts > rappel.md
import { readdirSync, readFileSync } from "node:fs";
import {
	formatCheckedOn,
	todayInParis,
	upcomingEvents,
} from "../../src/lib/dates.ts";
import { type EventFile, eventFileSchema } from "../../src/lib/schemas.ts";

/** Texte du ticket : une ligne par fichier manuel, avec la date de dernière vérification et les dates à venir. */
export function reminderBody(
	files: { name: string; file: EventFile }[],
	today: string,
): string {
	const lines = files.map(({ name, file }) => {
		const upcoming = file.courses.reduce(
			(count, course) =>
				count + upcomingEvents(file.evenements, course, today).length,
			0,
		);
		return `- [ ] \`data/events-manual/${name}\` (${file.courses.join(", ")}) : vérifié le ${formatCheckedOn(file.verifieLe)}, ${upcoming} date(s) à venir`;
	});
	return [
		"Rappel mensuel : revoir les dates saisies à la main (sites des organisateurs).",
		"",
		"Pour chaque fichier : ajouter les nouvelles dates, retirer les annulations, puis mettre à jour `verifieLe`.",
		"",
		...lines,
	].join("\n");
}

if (import.meta.main) {
	const files = readdirSync("data/events-manual")
		.filter((name) => name.endsWith(".json"))
		.sort()
		.map((name) => ({
			name,
			file: eventFileSchema.parse(
				JSON.parse(readFileSync(`data/events-manual/${name}`, "utf8")),
			),
		}));
	console.log(reminderBody(files, todayInParis()));
}
