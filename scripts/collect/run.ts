// Collecte de nuit (US1.5) : un passage par source, requêtes identifiées et espacées, garde-fou (§6).
// Usage : node scripts/collect/run.ts — écrit data/events/<source>.json et un rapport des anomalies.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { todayInParis } from "../../src/lib/dates.ts";
import {
	type EventFile,
	eventFileSchema,
	type RaceEvent,
} from "../../src/lib/schemas.ts";
import { ATHX, parseAthx } from "./athx.ts";
import { DEADLY_DOZEN, parseDeadlyDozenCountry } from "./deadly-dozen.ts";
import { applyGuard } from "./guard.ts";

const USER_AGENT =
	"Station0-collecte/1.0 (+https://github.com/galichetfaustine/station-0)";
const PAUSE_MS = 3000;
const pause = () => new Promise((resolve) => setTimeout(resolve, PAUSE_MS));

async function get(url: string): Promise<string> {
	const response = await fetch(url, {
		headers: { "user-agent": USER_AGENT, accept: "text/html" },
	});
	if (!response.ok) throw new Error(`HTTP ${response.status} sur ${url}`);
	return response.text();
}

async function attempt(
	collect: () => Promise<RaceEvent[]>,
): Promise<RaceEvent[] | Error> {
	try {
		return await collect();
	} catch (error) {
		return error instanceof Error ? error : new Error(String(error));
	}
}

const sources = [
	{ ...ATHX, collect: async () => parseAthx(await get(ATHX.url)) },
	{
		...DEADLY_DOZEN,
		collect: async () => {
			const events: RaceEvent[] = [];
			for (const [pays, url] of Object.entries(DEADLY_DOZEN.pages)) {
				events.push(
					...parseDeadlyDozenCountry(await get(url), pays as RaceEvent["pays"]),
				);
				await pause();
			}
			return events;
		},
	},
];

const now = new Date();
const today = todayInParis(now);
const report: { source: string; anomaly: string }[] = [];

for (const source of sources) {
	const path = `data/events/${source.source}.json`;
	const previous: EventFile | null = existsSync(path)
		? eventFileSchema.parse(JSON.parse(readFileSync(path, "utf8")))
		: null;
	const { file, anomaly } = applyGuard(
		source,
		await attempt(source.collect),
		previous,
		now,
		today,
	);
	writeFileSync(path, `${JSON.stringify(file, null, "\t")}\n`);
	console.log(
		`${source.source} : ${file.evenements.length} événement(s)${anomaly ? ` — ANOMALIE : ${anomaly}` : ""}`,
	);
	if (anomaly) report.push({ source: source.source, anomaly });
	await pause();
}

writeFileSync(
	process.env.COLLECT_REPORT ?? "collect-report.json",
	`${JSON.stringify(report, null, "\t")}\n`,
);
