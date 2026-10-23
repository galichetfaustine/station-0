# Station 0

Trouve ta première course hybride, et commence à t'y préparer aujourd'hui.

Site en ligne : https://galichetfaustine.github.io/station-0/ (mis à jour à chaque fusion sur `main`).

Les règles du projet sont dans [`CLAUDE.md`](CLAUDE.md), les specs dans [`docs/SPECS.md`](docs/SPECS.md).

## Démarrer

Prérequis : Node.js 26 (la version est fixée dans `.nvmrc`).

```sh
nvm use          # passe sur la bonne version de Node
npm install      # installe les dépendances
npm run dev      # site en local sur http://localhost:4321/station-0/
```

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Site en local, rechargé à chaque modification |
| `npm run build` | Vérifie les types puis construit le site dans `dist/` |
| `npm run check:types` | Vérifie les types seuls |
| `npm run lint` | Vérifie le style et la qualité du code (Biome) |
| `npm run format` | Corrige automatiquement le formatage |
| `npm test` | Tests de logique (Vitest) |
| `npm run test:e2e` | Tests de parcours et d'accessibilité (Playwright + axe) |
| `npm run check:deprecated` | Échoue si une dépendance directe est dépréciée sur npm |

La CI (`.github/workflows/ci.yml`) lance toutes ces vérifications, plus `npm audit`, à chaque Pull Request.
