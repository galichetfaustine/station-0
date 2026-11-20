# ADR 0003 — Hébergement sur Vercel

- **Date** : 20/11/2026
- **Statut** : accepté (décision D3, modifiée)
- **Remplace** : la partie hébergement de l'ADR 0002

## Contexte

Le site est statique (Astro, `output: "static"`), sans serveur ni base de données, avec un budget de 0 €/mois. Il était publié sur GitHub Pages dans le sous-dossier `/station-0` (`https://galichetfaustine.github.io/station-0/`). Faustine a décidé le 20/11/2026 de passer l'hébergement sur Vercel. La CI et la collecte de nuit restent sur GitHub Actions.

## Options

| Option | Pour | Contre |
| --- | --- | --- |
| GitHub Pages (ADR 0002) | Déjà en place ; un seul compte | Site servi dans `/station-0` ; publication à maintenir dans `deploy.yml` |
| **Vercel** | Plan gratuit suffisant ; site à la racine ; Astro reconnu à l'import ; un push sur `main` reconstruit le site | Un compte de plus ; l'adresse publique n'existe qu'après connexion du dépôt |
| Cloudflare Pages | Réseau rapide ; Cloudflare possède Astro depuis janvier 2026 | Un compte et un outil de plus ; la collecte resterait de toute façon sur GitHub Actions |

## Décision

**Vercel pour l'hébergement, GitHub Actions pour la CI et la collecte**, sur le dépôt public `galichetfaustine/station-0`.

## Conséquences

- `astro.config.mjs` garde `output: "static"` et passe `base` à `"/"`. `site` vaut `https://${VERCEL_PROJECT_PRODUCTION_URL}` quand cette variable existe au build, sinon `http://localhost:4321`. Aucun nom de domaine n'est écrit dans le dépôt.
- Pas de serveur, pas de base de données, pas de nouveau paquet npm.
- `deploy.yml` est supprimé. Un push sur `main` (fusion d'une Pull Request, ou commit de la collecte de nuit) suffit : Vercel reconstruit le site une fois le dépôt connecté.
- `collect-dates.yml` ne relance plus de workflow de déploiement. La collecte de nuit reste sur GitHub Actions.
- Le site en local est `http://localhost:4321/`.
- Il reste à connecter le dépôt au compte Vercel de Faustine (import du dépôt, framework Astro). L'adresse publique sera celle que Vercel fournira. Le plan gratuit suffit.
