// Validation de tous les fichiers de data/ (US0.5) : chaque erreur nomme le fichier et le champ fautif.
import type * as z from "zod";
import {
	baremeConfigSchema,
	type Exercise,
	eventFileSchema,
	exerciseBankSchema,
	MATERIELS,
	raceSchema,
} from "./schemas.ts";

export interface DataFile {
	/** Chemin depuis la racine du dépôt, ex. « data/races/hyrox.json ». */
	path: string;
	content: string;
}

function formatIssues(path: string, error: z.ZodError): string[] {
	return error.issues.map((issue) => {
		const field = issue.path.join(".");
		return field
			? `${path} → ${field} : ${issue.message}`
			: `${path} : ${issue.message}`;
	});
}

function fileName(path: string): string {
	return path.slice(path.lastIndexOf("/") + 1).replace(/\.json$/, "");
}

/** Les alternatives existent, utilisent moins de matériel, et un exercice avec matériel en a au moins une. */
function checkExerciseBank(path: string, exercises: Exercise[]): string[] {
	const errors: string[] = [];
	const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
	const rank = (materiel: Exercise["materiel"]) => MATERIELS.indexOf(materiel);

	exercises.forEach((exercise, index) => {
		if (exercises.findIndex((other) => other.id === exercise.id) !== index) {
			errors.push(
				`${path} → ${index}.id : identifiant « ${exercise.id} » en double`,
			);
		}
		if (exercise.materiel !== "aucun" && exercise.alternatives.length === 0) {
			errors.push(
				`${path} → ${index}.alternatives : au moins une alternative sans ce matériel est requise`,
			);
		}
		exercise.alternatives.forEach((alternativeId, altIndex) => {
			const alternative = byId.get(alternativeId);
			const field = `${path} → ${index}.alternatives.${altIndex}`;
			if (!alternative) {
				errors.push(
					`${field} : exercice « ${alternativeId} » introuvable dans la banque`,
				);
			} else if (rank(alternative.materiel) >= rank(exercise.materiel)) {
				errors.push(
					`${field} : « ${alternativeId} » doit demander moins de matériel que « ${exercise.id} »`,
				);
			}
		});
	});
	return errors;
}

/** Valide l'ensemble des fichiers de données et renvoie la liste des erreurs (vide si tout est valide). */
export function validateDataFiles(files: DataFile[]): string[] {
	const errors: string[] = [];
	const parsed = new Map<string, unknown>();

	for (const file of files) {
		try {
			parsed.set(file.path, JSON.parse(file.content));
		} catch (error) {
			errors.push(`${file.path} : JSON invalide (${(error as Error).message})`);
		}
	}

	const raceSlugs = new Set<string>();
	const references: Array<{ field: string; slug: string }> = [];

	for (const [path, data] of parsed) {
		if (path.startsWith("data/races/")) {
			const result = raceSchema.safeParse(data);
			if (!result.success) {
				errors.push(...formatIssues(path, result.error));
				continue;
			}
			raceSlugs.add(result.data.slug);
			if (result.data.slug !== fileName(path)) {
				errors.push(
					`${path} → slug : « ${result.data.slug} » doit être identique au nom du fichier`,
				);
			}
		} else if (
			path.startsWith("data/events/") ||
			path.startsWith("data/events-manual/")
		) {
			const result = eventFileSchema.safeParse(data);
			if (!result.success) {
				errors.push(...formatIssues(path, result.error));
				continue;
			}
			result.data.evenements.forEach((event, index) => {
				references.push({
					field: `${path} → evenements.${index}.course`,
					slug: event.course,
				});
			});
		} else if (path === "data/config/bareme.json") {
			const result = baremeConfigSchema.safeParse(data);
			if (!result.success) errors.push(...formatIssues(path, result.error));
		} else if (path === "data/exercises.json") {
			const result = exerciseBankSchema.safeParse(data);
			if (!result.success) {
				errors.push(...formatIssues(path, result.error));
				continue;
			}
			errors.push(...checkExerciseBank(path, result.data));
			result.data.forEach((exercise, index) => {
				exercise.coursesOrigine.forEach((slug, slugIndex) => {
					references.push({
						field: `${path} → ${index}.coursesOrigine.${slugIndex}`,
						slug,
					});
				});
			});
		}
	}

	for (const { field, slug } of references) {
		if (!raceSlugs.has(slug))
			errors.push(`${field} : course « ${slug} » introuvable dans data/races/`);
	}
	return errors;
}
