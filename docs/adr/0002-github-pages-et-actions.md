# ADR 0002 — GitHub Pages et GitHub Actions

- **Date** : 23/10/2026
- **Statut** : accepté (décision D3 des specs)

## Contexte

Le site est statique, sans serveur ni base de données, avec un budget de 0 €/mois. Il faut héberger le site, vérifier chaque Pull Request (US0.2), le mettre en ligne à chaque fusion (US0.3) et, au Lot 1, collecter les dates chaque nuit puis reconstruire le site.

## Options

| Option | Pour | Contre |
| --- | --- | --- |
| **GitHub Pages + GitHub Actions** | Gratuit pour un dépôt public ; un seul compte ; code, vérifications, collecte de nuit et déploiement au même endroit | Réseau moins rapide qu'un CDN spécialisé ; tâches planifiées désactivées après 60 jours sans activité |
| Cloudflare Pages | Réseau rapide ; Cloudflare possède Astro depuis janvier 2026 | Un compte et un outil de plus ; la collecte tournerait quand même sur GitHub Actions |

## Décision

**GitHub Pages pour l'hébergement, GitHub Actions pour l'automatisation**, sur le dépôt public `galichetfaustine/station-0`.

## Conséquences

- `ci.yml` vérifie chaque Pull Request (lint, types, tests, build, accessibilité, audit, dépréciations) ; `main` est protégée : PR et CI verte obligatoires (`.github/ruleset-main.json`).
- `deploy.yml` construit et publie le site à chaque fusion sur `main`, à l'adresse `https://galichetfaustine.github.io/station-0/` : Astro est configuré avec `base: "/station-0"`.
- Le dépôt étant public, le code et l'historique sont visibles de tous : aucune donnée personnelle ni secret dans le dépôt.
- Au Lot 1, la collecte de nuit écrit chaque jour la date de vérification, ce qui garde le dépôt actif (règle des 60 jours). Son articulation avec la protection de `main` (D4) est un point ouvert de `docs/DECISIONS.md`.
