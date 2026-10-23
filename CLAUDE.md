# CLAUDE.md — Dossard

## Le projet en bref

Dossard aide les débutants et intermédiaires à trouver la course hybride faite pour eux (HYROX, DEKA, ATHX, Deadly Dozen…), à savoir quand elle a lieu, et à s'y entraîner tout de suite.

Trois fonctionnalités :

1. **Catalogue de courses** (principale) : ~10 courses avec une difficulté notée de 1 à 5 sur 4 catégories (course, force, cardio/ergo, gym/agilité) et leurs prochaines dates, récupérées automatiquement autant que possible.
2. **Quiz d'orientation** : 7 questions, une course recommandée + une alternative éventuelle.
3. **Générateur de mini WOD** (15–20 min) à partir d'exercices issus des courses, avec un minuteur intégré.

Cible : France et pays proches. Site en français. Mobile d'abord.

## Source de vérité

- **`docs/SPECS.md`** contient les specs complètes (vision, règles du barème, du quiz et du générateur, lots, user stories, critères d'acceptation). Lis la section concernée avant chaque user story.
- En cas de conflit entre ce fichier et `docs/SPECS.md`, les specs l'emportent.
- **Ne jamais inventer une règle métier.** Si une spec est ambiguë ou manque, arrête-toi et pose la question à Faustine.

## Décisions validées

| # | Décision |
| --- | --- |
| D2 | Îlots interactifs en **Svelte 5** |
| D3 | Hébergement **GitHub Pages**, automatisation **GitHub Actions** (dépôt public) |
| D4 | Mise à jour des dates : commit automatique si la validation passe, Pull Request seulement en cas d'anomalie |
| D6 | Générateur : tout aléatoire en 1 clic, verrous optionnels, le time cap (15 ou 20 min) est toujours respecté |
| D7 | Quiz : 1 course + 1 alternative si son score > 60 % et autre organisateur |
| D8 | Typos : Barlow Condensed (titres) + Inter (texte), auto-hébergées |
| D9 | Thème sombre par défaut, clair si le système est en mode clair |

**En attente :**

- **D1 — nom du site** : « Dossard » est provisoire. Centralise le nom dans une seule constante (`src/lib/site.ts`) pour pouvoir le changer partout d'un coup.
- **D5 — Spartan Sprint** : inclusion à confirmer avant le Lot 1. N'en tiens pas compte au Lot 0.

## Stack

- **Astro** (version majeure stable actuelle, 6.x attendue), sortie **statique**.
- **TypeScript strict**.
- **Svelte 5** pour les îlots (quiz, générateur, minuteur, filtres) uniquement.
- **CSS natif** (variables, nesting, container queries). Pas de Tailwind, pas de librairie UI.
- **Node.js LTS** (26 si déjà en LTS, sinon 24), version fixée dans le dépôt (`.nvmrc` + `engines`).
- Tests : **Vitest** (logique), **Playwright** (parcours), **axe-core** (accessibilité).
- Qualité : **Biome**. Si Biome n'est plus activement maintenu, ESLint + Prettier.
- **Dependabot** pour les mises à jour.

Avant d'installer quoi que ce soit, vérifie la version actuelle et l'état de maintenance (`npm view <paquet> version time deprecated`). Ne jamais installer un paquet déprécié ou sans release depuis 12 mois.

## Arborescence

```
data/
  races/            un JSON par course
  events/           dates collectées, un JSON par source (généré)
  events-manual/    dates saisies à la main (prioritaires)
  exercises.json    banque d'exercices
  config/           seuils du barème, coefficients du quiz et du générateur
src/
  lib/              logique pure et testée : bareme, quiz, wod, timer, dates, site
  components/       composants Astro et îlots Svelte
  pages/            accueil, courses/, courses/[slug], quiz, wod, methode
  styles/           tokens.css (DA), global.css
scripts/collect/    un collecteur par source + validation
.github/workflows/  ci.yml, collect-dates.yml, deploy.yml
docs/               SPECS.md, ADR (docs/adr/), sources-dates.md
```

## Règles de code

- **Toute la logique métier vit dans `src/lib/`, en TypeScript pur**, sans import d'Astro ni de Svelte. Les composants ne font qu'afficher et appeler `src/lib/`.
- Les notes de difficulté sont **calculées** depuis les données brutes, jamais saisies à la main.
- Tous les seuils et coefficients sont dans `data/config/`, jamais en dur dans le code.
- Toutes les données JSON sont validées par un schéma au build ; une donnée invalide fait échouer le build avec un message qui nomme le champ.
- Noms des champs de données : ceux de `docs/SPECS.md`. Le reste du code (fonctions, variables) en anglais. Textes affichés en français.
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

- Texte sur orange ou lavande : toujours en encre, jamais en blanc.
- Contrastes : 4,5:1 pour le texte, 3:1 pour l'interface, vérifiés par un test.
- Jamais d'information portée par la couleur seule. Zones tactiles ≥ 44 × 44 px.

## Interdits

- Pas de mesure d'audience, pas de cookie, pas de compte utilisateur, pas d'IA, pas de serveur ni de base de données.
- Pas d'appel réseau dans les tests : les collecteurs sont testés sur des pages enregistrées (`fixtures/`).
- Pas de collecte sur un site sans avoir vérifié son `robots.txt` et ses conditions d'utilisation. Une requête par source et par nuit maximum, avec un User-Agent identifiable.
- Ne jamais pousser directement sur `main`, ne jamais fusionner une Pull Request toi-même.

## Façon de travailler

Faustine débute en code : explique simplement ce que tu fais et pourquoi, sans jargon inutile.

Pour chaque user story :

1. Relis la section des specs concernée.
2. Propose un plan en quelques lignes et attends son accord.
3. Crée une branche `us/<id>-<sujet>` (ex. `us/0.1-init`).
4. Code et écris les tests en même temps. Commits au format Conventional Commits.
5. Ouvre une Pull Request : ce qui a changé, comment le vérifier pas à pas, ce qui reste en suspens.
6. Quand une action doit être faite par Faustine (créer le dépôt, activer GitHub Pages, régler une protection de branche…), donne-lui les étapes exactes, clic par clic.

## Définition de « terminé »

Pull Request relue et fusionnée par Faustine, tests verts, site déployé, aucune erreur d'accessibilité détectée, specs mises à jour si une règle a changé.
