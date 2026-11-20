# Station 0

Trouve ta première course hybride, et commence à t'y préparer aujourd'hui.

L'adresse publique sera celle fournie par Vercel après connexion du dépôt `galichetfaustine/station-0` (le site est mis à jour à chaque push sur `main`).

Les règles du projet sont dans [`CLAUDE.md`](CLAUDE.md), les specs dans [`docs/SPECS.md`](docs/SPECS.md).

## Démarrer

Prérequis : Node.js 26 (la version est fixée dans `.nvmrc`).

```sh
nvm use          # passe sur la bonne version de Node
npm install      # installe les dépendances
npm run dev      # site en local sur http://localhost:4321/
```

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Site en local, rechargé à chaque modification |
| `npm run build` | Valide les données, vérifie les types puis construit le site dans `dist/` |
| `npm run notes` | Affiche les notes calculées des 11 courses et leurs justifications |
| `npm run validate:data` | Vérifie tous les fichiers de `data/` (un message par champ fautif) |
| `npm run check:types` | Vérifie les types (Astro et Svelte) |
| `npm run lint` | Vérifie le style et la qualité du code (Biome) |
| `npm run format` | Corrige automatiquement le formatage |
| `npm test` | Tests de logique (Vitest) |
| `npm run test:e2e` | Tests de parcours et d'accessibilité (Playwright + axe) |
| `node scripts/collect/run.ts` | Lance une collecte des dates (ATHX, Deadly Dozen) comme le robot de nuit |
| `node scripts/collect/reminder.ts` | Affiche le texte du rappel mensuel des dates manuelles |
| `npm run check:deprecated` | Échoue si une dépendance directe est dépréciée sur npm |

La CI (`.github/workflows/ci.yml`) lance toutes ces vérifications, plus `npm audit`, à chaque Pull Request.
