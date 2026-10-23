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
| 2026-10-23 | **Texte sur cobalt toujours en blanc** (5,9:1) ; l'encre sur cobalt échoue (3,3:1). | Calcul de contraste, US0.4. Reporté au §9 des specs. |
| 2026-10-23 | **En mode clair, orange et lavande uniquement en fond**, avec texte et bordure encre ; le contour de focus passe en cobalt. | Orange et lavande sur fond clair : 2,2:1, sous les seuils 4,5:1 et 3:1. Reporté au §9. |
| 2026-10-23 | Polices via le fournisseur **Fontsource** de l'API Fonts d'Astro : téléchargées au build, servies par le site. | Aucun appel à Google côté visiteur (RGPD), comme prévu au §10. |
| 2026-10-23 | **Pages provisoires** Courses, Quiz et WOD (« arrive au Lot N »). | La navigation de US0.4 ne doit pas mener à des pages introuvables. |
| 2026-10-23 | **Champs des événements et des exercices** définis et ajoutés aux specs (§4, §8). | Les specs ne les nommaient pas ; demandé par Faustine (camelCase en français). |
| 2026-10-23 | Champs de course ajoutés : **`typeCourse`** (hybride / obstacles) et **`categorieNotee`** ; **`bareme`** détaillé (`partageEffort`, `distanceM`, `chargeMaxKg` + `equipement`, `ergoM`, `mouvementLePlusTechnique`). | Nécessaires au filtre « Type » (§4) et au calcul des notes (§5) sans saisir de note à la main. |
| 2026-10-23 | **`notes` n'est pas dans les fichiers** de course : un fichier qui en contient est refusé. | « Notes calculées, jamais saisies à la main » (§4, §5). |
| 2026-10-23 | **Alternatives d'un exercice = autres exercices de la banque**, avec moins de matériel ; obligatoires dès qu'il faut du matériel. | Chaque alternative a ainsi son propre temps estimé, ce qui permet au générateur de respecter le time cap. |
| 2026-10-23 | Le schéma vérifie qu'une date est **valide**, pas qu'elle est **future** ; ce contrôle est fait par la collecte. | Sinon, un événement qui vient de passer ferait échouer le build. |
| 2026-10-23 | **Validation des données par un script** (`npm run validate:data`) lancé avant chaque build, avec **Zod** (même version qu'Astro) en dépendance directe. | Messages en français qui nomment le fichier et le champ, contrôles entre fichiers, schémas sans dépendance à Astro dans `src/lib/`. |
| 2026-10-23 | **Objectif d'automatisation révisé : 2 courses sur 11** (ATHX, Deadly Dozen) au lieu de 7. | HYROX et Spartan interdisent la collecte dans leurs CGU ; The Hybrid Games, Turf Games et XENOM n'ont que du texte libre ou rien. Détail : `docs/sources-dates.md`. |
| 2026-10-23 | **Pas de source tierce** (RoxRadar…) pour contourner une interdiction d'organisateur. | Ce serait contourner l'interdiction de HYROX, avec un intermédiaire fragile en plus. |
| 2026-10-23 | **Un passage par source et par nuit** (specs §6), et non « une requête » comme l'écrivait CLAUDE.md : quelques requêtes espacées et un cache sont permis. CLAUDE.md aligné en US0.7. | Les specs l'emportent sur CLAUDE.md ; Deadly Dozen demande une requête par pays. |
| 2026-10-23 | **ADR** de D2 (Svelte) et D3 (GitHub Pages + Actions) dans `docs/adr/`. | US0.7. |
| 2026-10-23 | **Objectif d'automatisation validé : 2 sur 11** (ATHX, Deadly Dozen), 9 courses en saisie manuelle. | Validé par Faustine (revue du Lot 0). |
| 2026-10-23 | **Liens HYROX uniquement vers la page d'accueil** de hyrox.com, avec la mention « Inscriptions sur hyrox.com ». | CGU HYROX art. 7.4. |
| 2026-10-23 | **D4** : le robot de collecte contourne la protection de `main` ; à défaut, PR fusionnée automatiquement si la CI est verte. | Le robot valide ses données avant d'écrire. Mise en place en US1.5. |
| 2026-10-23 | **`dureeMoyenneMin` reste obligatoire** ; estimation sourcée pour Deadly Dozen et The Hybrid Games, affichée « environ » sur la fiche. | Validé par Faustine. |
| 2026-10-23 | **Deadly Dozen = format « Track Race » (12 × 400 m) uniquement.** | Le site propose aussi Sprint, Gross, Hybrid, Ultra. |
| 2026-10-23 | **XENOM gardée**, saisie manuelle, « Pas de date annoncée » tant que rien n'est confirmé ; site officiel xenomfitness.com. | Validé par Faustine. |
| 2026-10-23 | **The Hybrid Games** : site thehybridgames.com, formats solo et duo, pas de relais. | Page « race format » officielle. |
| 2026-10-23 | **Rappel mensuel automatique** (ticket GitHub) pour revoir les dates manuelles. | Mise en place en US1.5. |
| 2026-10-23 | **En-tête : uniquement les pages existantes** (Courses) ; pages provisoires Quiz et WOD supprimées. | Consigne de Faustine (Lot 1). |
| 2026-10-23 | **`svelte-check`** ajouté à `check:types` (outil officiel Svelte, dev uniquement). | `astro check` ne vérifie pas les fichiers `.svelte`. |
| 2026-10-23 | Schéma de course : charges par genre, sled à part, barre (`sousMax`, `testMax`), durée d'effort, catégories `null` si introuvables, `dureeTexte`, `dureeEstimee`, `remarques` ; déroulé vide autorisé ; saison « 2027 » acceptée. | Coller aux règlements relevés sans deviner (US1.1). |
| 2026-10-23 | Filtres « pays » et « date dans les 3 mois » et tri par prochaine date : livrés avec l'affichage des dates (US1.4). | Ils dépendent des dates (US1.6). |
| 2026-10-23 | **Note globale arrondie au demi-point** (et non à l'entier) ; la jauge affiche les demi-pastilles. | Revue des notes par Faustine. SPECS §5. |
| 2026-10-23 | **En duo, la note cardio ne compte que le volume d'ergo par athlète**, sans la durée : HYROX Doubles passe à cardio 3. | Revue des notes. SPECS §5. |
| 2026-10-23 | **Turf Games et XENOM** : « Note à venir — règlement non public » dans le catalogue, exclus du classement du quiz tant qu'une note manque. | Revue des notes. SPECS §4, §5, §7. |
| 2026-10-23 | **Les 10 précisions de calcul du barème sont validées** (bornes, distance complète par athlète en duo, charges hommes, sled lourd ≥ 100 kg, charge libre ≥ 30 kg → 3, cardio = max sauf en duo, DEKA gym 2, Spartan obstacles simples, durées estimées, notes « ? »). | Revue des notes. SPECS §5 corrigé. |
| 2026-10-23 | **Résultats de référence** testés : HYROX 4, ATHX 4, Hybrid Games 4, Spartan Sprint 4, HYROX Doubles 3,5, Deadly Dozen 3,5, DEKA FIT 3, DEKA MILE 2,5, DEKA STRONG 2. | Garde-fou contre toute régression du barème. |
| 2026-10-23 | **Fiche course** : blocs 6 (WOD) et 7 (quiz) affichés « bientôt disponible », sans lien, tant que le générateur (Lot 3) et le quiz (Lot 2) n'existent pas ; bloc 4 « Pas de date annoncée » jusqu'à US1.4. | Pas de lien vers une page qui n'existe pas (même règle que l'en-tête). |
| 2026-10-23 | **Page « Comment on note »** (`/methode/`) générée depuis `data/config/bareme.json`, liée depuis le catalogue et chaque fiche (pas depuis l'en-tête, réservé à Courses, Quiz, WOD). | Critère d'US1.2, oublié dans la PR #10. |
| 2026-10-23 | La fiche affiche les **remarques** de la course (« À savoir ») et tous les liens de règlement consultés. | Transparence sur les estimations et les infos manquantes. |
| 2026-10-23 | **Priorité de la saisie manuelle** : elle remplace les dates collectées de la même course **dans la même ville** ; une ville nouvelle s'ajoute. | La spec ne disait pas comment reconnaître « la même » date ; règle proposée, à valider. SPECS §6. |
| 2026-10-23 | **Champ `courses`** dans chaque fichier de dates : les courses couvertes par la source. | Afficher « Dates vérifiées le… » même pour une course sans date (XENOM). SPECS §4. |
| 2026-10-23 | **Dates manuelles initiales** = relevés de l'étude US0.6 (59 dates) ; les dates HYROX valent pour Open solo et Doubles (mêmes événements) ; lien HYROX vers l'accueil. | Consigne de Faustine (US1.6). |
| 2026-10-23 | **Affichage des dates** : fenêtre de 18 mois aussi à l'affichage ; un événement sur plusieurs jours reste visible jusqu'à son dernier jour ; la fiche reçoit jusqu'à 6 dates et le navigateur garde les 3 premières encore à venir. | « Une date passée n'apparaît jamais, même si la dernière reconstruction a échoué » (US1.4). |
| 2026-10-23 | **Date du jour à l'heure de Paris** (`Europe/Paris`), au build comme dans le navigateur. | Cible France ; évite un décalage d'un jour autour de minuit. |
| 2026-10-23 | **Lien d'inscription par date** : « Inscriptions sur hyrox.com » (accueil) pour HYROX, « S'inscrire » vers la page de l'événement pour les autres. | Décision n° 2 de la revue du Lot 0. |

## Points ouverts

| Depuis | Sujet | À traiter |
| --- | --- | --- |
| 2026-10-23 | **Turf Games et XENOM** : notes en partie « à confirmer » (aucun règlement détaillé public ; guides Turf bloqués lors de la vérification). | Lot 1 |
| 2026-10-23 | **Budget JavaScript de la page Courses : ~49 Ko** avant compression (~18 Ko compressé), dont 39 Ko de runtime Svelte : au ras des 50 Ko. Préciser si le budget s'entend compressé ou non ; sinon, prévoir d'alléger avant d'ajouter des fonctions à l'îlot. | Lot 4 (performance) |
