// Listes du générateur, sans Zod.
// Le schéma les réutilise. La page les importe d'ici pour ne pas envoyer Zod au téléphone :
// la validation des données a déjà eu lieu au build.

/** Matériel, du plus léger au plus complet (paramètre « Matériel » du générateur). */
export const MATERIELS = [
	"aucun",
	"halteresKettlebell",
	"salleComplete",
] as const;

export const WOD_LEVELS = ["debutant", "intermediaire", "confirme"] as const;

export const WOD_FORMATS = ["amrap", "emom", "forTime", "intervalles"] as const;
