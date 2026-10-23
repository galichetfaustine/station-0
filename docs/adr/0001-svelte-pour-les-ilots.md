# ADR 0001 — Svelte 5 pour les îlots interactifs

- **Date** : 23/10/2026
- **Statut** : accepté (décision D2 des specs)

## Contexte

Station 0 est un site statique (Astro) : la plupart des pages n'ont besoin d'aucun JavaScript. Quatre parties sont interactives : les filtres du catalogue, le quiz, le générateur de WOD et le minuteur. Astro permet d'y brancher des « îlots » écrits avec un framework de composants. Contraintes : moins de 50 Ko de JavaScript par page, Lighthouse ≥ 95 sur mobile, code relu par une débutante.

## Options

| Option | Pour | Contre |
| --- | --- | --- |
| **Svelte 5** | Compilé : très peu de JavaScript envoyé (pas de runtime lourd) ; syntaxe proche du HTML, facile à relire ; intégration officielle `@astrojs/svelte` | Moins de ressources en ligne que React |
| React 19 | Écosystème et ressources très larges ; compétence demandée | Runtime d'environ 45 Ko à charger, presque tout le budget de 50 Ko |
| JavaScript sans framework | Aucune dépendance | Plus de code à écrire et à tester pour le quiz, le générateur et le minuteur |

## Décision

**Svelte 5**, uniquement pour les îlots. Toute la logique métier (barème, quiz, générateur, minuteur) reste en TypeScript pur dans `src/lib/`, sans import de Svelte : les composants ne font qu'afficher.

## Conséquences

- Les pages sans îlot n'envoient **aucun JavaScript** (vérifié au Lot 0 : 0 Ko).
- Remplacer Svelte un jour ne toucherait que l'affichage, pas les règles du produit.
- Dépendances à l'exécution ajoutées : `svelte` 5.57 et `@astrojs/svelte` 9.1.
