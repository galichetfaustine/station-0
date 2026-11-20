// Lecture des dates écrites en anglais par les organisateurs : « 24 Apr 2027 », « 19-20 Jun 2027 »,
// « 13 - 14 Feb 2027 », « 30 Jul - 1 Aug 2027 », « 30 Dec 2026 - 2 Jan 2027 ».

const MONTHS: Record<string, number> = {
	jan: 1,
	feb: 2,
	mar: 3,
	apr: 4,
	may: 5,
	jun: 6,
	jul: 7,
	aug: 8,
	sep: 9,
	oct: 10,
	nov: 11,
	dec: 12,
};

const iso = (year: number, month: number, day: number) =>
	`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

function isValid(year: number, month: number, day: number): boolean {
	const date = new Date(Date.UTC(year, month - 1, day));
	return (
		date.getUTCFullYear() === year &&
		date.getUTCMonth() === month - 1 &&
		date.getUTCDate() === day
	);
}

/** Renvoie { date, dateFin? } au format AAAA-MM-JJ, ou null si le texte n'est pas une date reconnue. */
export function parseDateRange(
	text: string,
): { date: string; dateFin?: string } | null {
	const match =
		/^(\d{1,2})(?:\s+([a-z]{3})[a-z]*)?(?:\s+(\d{4}))?\s*(?:-|–)\s*(\d{1,2})\s+([a-z]{3})[a-z]*\s+(\d{4})$|^(\d{1,2})\s+([a-z]{3})[a-z]*\s+(\d{4})$/i.exec(
			text.trim(),
		);
	if (!match) return null;

	if (match[7]) {
		const [day, month, year] = [
			Number(match[7]),
			MONTHS[(match[8] ?? "").toLowerCase()],
			Number(match[9]),
		];
		return month && isValid(year, month, day)
			? { date: iso(year, month, day) }
			: null;
	}

	const endDay = Number(match[4]);
	const endMonth = MONTHS[(match[5] ?? "").toLowerCase()];
	const endYear = Number(match[6]);
	const startDay = Number(match[1]);
	const startMonth = match[2] ? MONTHS[match[2].toLowerCase()] : endMonth;
	if (!endMonth || !startMonth) return null;
	const startYear = match[3]
		? Number(match[3])
		: startMonth > endMonth
			? endYear - 1
			: endYear;
	if (
		!isValid(startYear, startMonth, startDay) ||
		!isValid(endYear, endMonth, endDay)
	)
		return null;

	const date = iso(startYear, startMonth, startDay);
	const dateFin = iso(endYear, endMonth, endDay);
	if (dateFin < date) return null;
	return dateFin === date ? { date } : { date, dateFin };
}
