# Journal des décisions

Chaque décision prise en route est notée ici (date, décision, raison) et reportée dans `docs/SPECS.md` dans la même Pull Request. Les décisions D1 à D9 sont au §3 des specs.

## Décisions prises

| Date | Décision | Raison |
| --- | --- | --- |
| 2026-10-23 | **Astro 7** au lieu d'Astro 6. | La 7.0 est sortie le 22/06/2026 ; la 6.x ne reçoit plus de mise à jour depuis le 17/06/2026. |
| 2026-10-23 | **TypeScript 6**, pas 7. Dependabot ignore TypeScript 7 (PR #4). | `@astrojs/check` et `@astrojs/svelte` n'acceptent que TypeScript 5 ou 6 ; la mise à jour vers la 7 casse l'installation (PR #3 fermée). |
| 2026-10-23 | **Node 26** fixé tout de suite. | Passe en LTS le 28/10/2026, fin de vie avril 2029 (contre avril 2028 pour la 24). Choix de Faustine. |
| 2026-10-23 | **D1 = Station 0**, **D5 = Spartan Sprint inclus** comme 11e course « cousine ». | Statuts « Modifié » des specs ; CLAUDE.md n'était pas à jour. |
| 2026-10-23 | Dépôt public **`station-0`**, site sur `https://galichetfaustine.github.io/station-0/`. | Nom choisi par Faustine. |
| 2026-10-23 | **Dépendances dépréciées** : la CI échoue si une dépendance *directe* est dépréciée ; simple avertissement pour les dépendances indirectes. | On ne choisit pas les dépendances de nos dépendances ; les bloquer rendrait la CI rouge sans moyen de corriger. |
| 2026-10-23 | **Audit de sécurité** bloquant à partir des failles hautes (`npm audit --audit-level=high`). | §10 des specs. |
| 2026-10-23 | **Protection de `main`** : Pull Request et CI verte obligatoires, 0 approbation, suppression et réécriture d'historique interdites (`.github/ruleset-main.json`). | Faustine ouvre les PR depuis son propre compte et ne peut pas s'auto-approuver. |
| 2026-10-23 | **Biome ne formate pas les fichiers Markdown.** | Depuis la 2.6, il réécrivait CLAUDE.md et les specs. |
| 2026-10-23 | **Façon de travailler** : Claude Code avance en autonomie, sans plan à valider ; il ne s'arrête que si une spec est ambiguë. Une branche et une PR par story, fusionnée par Faustine. Une seule commande prête à copier quand une action exige ses droits. | Simplifier le travail de Faustine. |
| 2026-10-23 | **`docs/SPECS.md` du dépôt est la source de vérité** ; chaque décision y est reportée et notée ici. | Éviter que les specs et le code divergent. |
| 2026-10-23 | **Déploiement** par GitHub Actions (`deploy.yml`) à chaque fusion sur `main`, sans relancer les tests. | Les vérifications ont déjà tourné sur la Pull Request et `main` n'accepte que des PR vertes. |

## Points ouverts

| Depuis | Sujet | À traiter |
| --- | --- | --- |
| 2026-10-23 | **D4 contre la protection de `main`.** La collecte de nuit doit commiter sur `main`, que la protection interdit aux envois directs. Options : autoriser le robot à contourner la règle, ou passer par une PR fusionnée automatiquement quand la CI est verte. | Lot 1 (US1.5) |
