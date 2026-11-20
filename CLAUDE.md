# CLAUDE.md — Station 0

## Le projet en bref

Station 0 aide les débutants et intermédiaires à trouver la course hybride faite pour eux (HYROX, DEKA, ATHX, Deadly Dozen…), à savoir quand elle a lieu, et à s'y entraîner tout de suite.

Trois fonctionnalités :

1. **Catalogue de courses** (principale) : 11 courses (10 hybrides + Spartan Sprint en « cousine ») avec une difficulté notée de 1 à 5 sur 4 catégories (course, force, cardio/ergo, gym/agilité) et leurs prochaines dates, récupérées automatiquement autant que possible.
2. **Quiz d'orientation** : 7 questions, une course recommandée + une alternative éventuelle.
3. **Générateur de mini WOD** (15–20 min) à partir d'exercices issus des courses, avec un minuteur intégré.

Cible : France et pays proches. Site en français. Mobile d'abord.

Dépôt : https://github.com/galichetfaustine/station-0 — site : https://galichetfaustine.github.io/station-0/

## Source de vérité

- **`docs/SPECS.md`** contient les specs complètes (vision, règles du barème, du quiz et du générateur, lots, user stories, critères d'acceptation, noms des champs de données). Lis la section concernée avant chaque user story.
- En cas de conflit entre ce fichier et `docs/SPECS.md`, les specs l'emportent.
- **`docs/DECISIONS.md`** : journal des décisions prises en route (date, décision, raison) et points ouverts. **`docs/adr/`** : décisions techniques détaillées. **`docs/sources-dates.md`** : étude des sources de dates.
- **Ne jamais inventer une règle métier.** Si une spec est ambiguë, contradictoire ou manque, arrête-toi et pose la question à Faustine.

## Décisions validées

| # | Décision |
| --- | --- |
| D1 | Nom du site : **Station 0**, centralisé dans `src/lib/site.ts` |
| D2 | Îlots interactifs en **Svelte 5** (`docs/adr/0001-svelte-pour-les-ilots.md`) |
| D3 | Hébergement **GitHub Pages**, automatisation **GitHub Actions**, dépôt public (`docs/adr/0002-github-pages-et-actions.md`) |
| D4 | Mise à jour des dates : commit automatique si la validation passe, Pull Request seulement en cas d'anomalie (articulation avec la protection de `main` : point ouvert, Lot 1) |
| D5 | **Spartan Sprint inclus** comme 11e course « cousine » (badge « Course à obstacles », filtre « Type ») |
| D6 | Générateur : tout aléatoire en 1 clic, verrous optionnels, le time cap (15 ou 20 min) est toujours respecté |
| D7 | Quiz : 1 course + 1 alternative si son score > 60 % et autre organisateur |
| D8 | Typos : Barlow Condensed (titres) + Inter (texte), auto-hébergées |
| D9 | Thème sombre par défaut, clair si le système est en mode clair |

## Stack

- **Astro 7**, sortie **statique**, `base: "/station-0"` (tous les liens internes passent par `withBase()` de `src/lib/paths.ts`).
- **TypeScript 6 strict** (la 7 n'est pas encore acceptée par `@astrojs/check` et `@astrojs/svelte` ; Dependabot l'ignore).
- **Svelte 5** pour les îlots (quiz, générateur, minuteur, filtres) uniquement.
- **CSS natif** (variables, nesting, container queries). Pas de Tailwind, pas de librairie UI.
- **Node.js 26**, fixé dans `.nvmrc` et `engines`.
- **Zod** (même version qu'Astro) pour les schémas de données (`src/lib/schemas.ts`).
- Tests : **Vitest** (logique), **Playwright** (parcours), **axe-core** (accessibilité).
- Qualité : **Biome** (hors fichiers Markdown, que Biome ne doit jamais reformater).
- **Dependabot** chaque lundi pour npm et GitHub Actions.

Avant d'installer quoi que ce soit, vérifie la version actuelle et l'état de maintenance (`npm view <paquet> version time deprecated`). Ne jamais installer un paquet déprécié ou sans release depuis 12 mois.

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Site en local sur http://localhost:4321/station-0/ |
| `npm run build` | Valide les données, vérifie les types, construit le site |
| `npm run lint` / `npm run format` | Vérifie / corrige le style (Biome) |
| `npm test` | Tests de logique (Vitest) |
| `npm run test:e2e` | Tests de parcours et d'accessibilité (Playwright + axe) |
| `npm run validate:data` | Valide tous les fichiers de `data/` |
| `npm run check:deprecated` | Échoue si une dépendance directe est dépréciée |
| `npm run notes` | Tableau des notes calculées des 11 courses |
| `node scripts/collect/run.ts` | Collecte réelle des dates (réseau) ; les tests, eux, lisent `fixtures/collect/` |

Avant chaque commit : `npm run format`, puis vérifie le **code de sortie** de `npm run lint`, `npm test` et `npm run test:e2e` (ne masque jamais leur sortie au point de rater un échec).

Astro 7 met ses serveurs (`dev`, `preview`) en arrière-plan quand il détecte un agent IA : utilise `--ignore-lock` pour les garder au premier plan, ou `npx astro dev stop` / `npx astro preview stop` pour les arrêter.

## Arborescence

```
data/
  races/            un JSON par course (nom du fichier = slug)
  events/           dates collectées, un JSON par source (généré)
  events-manual/    dates saisies à la main (prioritaires)
  exercises.json    banque d'exercices
  config/           seuils du barème, coefficients du quiz et du générateur
src/
  lib/              logique pure et testée : bareme, quiz, wod, timer, dates, site, schemas
  components/       composants Astro (BaseLayout, SiteHeader…) et îlots Svelte
  pages/            accueil, courses/, courses/[slug], quiz, wod, methode
  styles/           tokens.css (DA), global.css
scripts/            validate-data, check-deprecated ; scripts/collect/ : un collecteur par source
.github/workflows/  ci.yml, deploy.yml, collect-dates.yml (Lot 1)
docs/               SPECS.md, DECISIONS.md, adr/, sources-dates.md
```

## Règles de code

- **Toute la logique métier vit dans `src/lib/`, en TypeScript pur**, sans import d'Astro ni de Svelte. Les composants ne font qu'afficher et appeler `src/lib/`.
- Les notes de difficulté sont **calculées** depuis les données brutes (`bareme`), jamais saisies à la main : le schéma refuse un champ `notes` dans un fichier de course.
- Tous les seuils et coefficients sont dans `data/config/`, jamais en dur dans le code.
- Toutes les données JSON sont validées au build (`npm run validate:data`) ; une donnée invalide fait échouer le build avec un message qui nomme le fichier et le champ.
- Noms des champs de données : ceux de `docs/SPECS.md` (§4 course et événement, §8 exercice). Le reste du code (fonctions, variables) en anglais. Textes affichés en français.
- Aléatoire du générateur : toujours piloté par une graine (seed), jamais `Math.random()` direct.
- Minuteur : temps calculé depuis l'horloge (`performance.now()` / timestamps), jamais en cumulant des `setInterval`.
- API du navigateur avant les librairies (dates, son, vibration, Wake Lock).
- Moins de 10 dépendances directes à l'exécution ; tout ajout est justifié dans un ADR.
- Budget : moins de 50 Ko de JavaScript par page.

## Direction artistique

| Token | Valeur | Usage |
| --- | --- | --- |
| `--color-ink` | `#0B0B0F` | Fond sombre, texte en mode clair |
| `--color-orange` | `#FF8A3D` | Actions et CTA uniquement (1 action orange par écran) |
| `--color-lavender` | `#A99BFF` | Tout ce qui se fait à deux ou en équipe (badges Duo/Équipe) |
| `--color-cobalt` | `#3D48FF` | Grands aplats (en-têtes de fiche, bandeau de résultat) |

- Utilise les rôles de `src/styles/tokens.css` (`--color-action-bg`, `--color-duo-bg`, `--color-band-bg`…), jamais les couleurs brutes dans les composants.
- Texte sur orange ou lavande : toujours en encre. Texte sur cobalt : toujours en blanc.
- En mode clair, orange et lavande uniquement en fond (texte et bordure encre) ; le focus passe en cobalt.
- Contrastes : 4,5:1 pour le texte, 3:1 pour l'interface. Toute nouvelle combinaison de couleurs s'ajoute à la liste de `src/lib/contrast.test.ts`.
- Jamais d'information portée par la couleur seule. Zones tactiles ≥ 44 × 44 px.

## Interdits

- Pas de mesure d'audience, pas de cookie, pas de compte utilisateur, pas d'IA, pas de serveur ni de base de données.
- Pas d'appel réseau dans les tests : les collecteurs sont testés sur des pages enregistrées (`fixtures/`).
- Pas de collecte sur un site sans avoir vérifié son `robots.txt` et ses conditions d'utilisation (voir `docs/sources-dates.md`). Une source qui l'interdit passe en manuel ; ne jamais contourner une interdiction ni un blocage, y compris via un site tiers.
- **Un passage par source et par nuit maximum** (specs §6), avec un User-Agent identifiable, un cache et le moins de requêtes possible, espacées.
- Ne jamais pousser directement sur `main` (protégée : PR et CI verte obligatoires), ne jamais fusionner une Pull Request soi-même, ne jamais réécrire l'historique d'une branche déjà poussée.

## Façon de travailler

Faustine débute en code : explique simplement ce que tu fais et pourquoi, sans jargon inutile.

- **Avance en autonomie** sur chaque user story, sans plan à faire valider avant. Ne t'arrête pour demander que si une spec est ambiguë ou contradictoire.
- **Une branche `us/<id>-<sujet>` et une Pull Request par story** (ex. `us/0.1-init`), commits au format Conventional Commits, tests écrits avec le code. La PR dit : ce qui a changé, comment le vérifier pas à pas, ce qui reste en suspens.
- **C'est Faustine qui fusionne.** Quand une action exige ses droits (réglage du dépôt, GitHub Pages…), donne-lui **une seule commande prête à copier**, pas une procédure clic par clic.
- **Chaque décision prise en route** est reportée dans `docs/SPECS.md` **dans la même PR** et notée dans `docs/DECISIONS.md` (date, décision, raison).

## Définition de « terminé »

Pull Request relue et fusionnée par Faustine, tests verts, site déployé, aucune erreur d'accessibilité détectée, specs et DECISIONS.md mis à jour si une règle a changé.
