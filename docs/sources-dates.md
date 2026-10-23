# Étude des sources de dates (US0.6)

Étude du **23/10/2026**. Chaque site a été consulté directement : `robots.txt`, conditions d'utilisation, page des événements et format des données. Les requêtes d'étude portaient l'identifiant `Station0-etude/1.0 (+https://github.com/galichetfaustine/station-0)`. Aucun collecteur n'est codé à ce stade.

Méthodes (§6 des specs), par ordre de préférence : **1** flux officiel (iCal, JSON public, API documentée), **2** données structurées dans la page (schema.org), **3** lecture du HTML, **4** saisie manuelle.

Règle appliquée (§6) : *une source dont le `robots.txt` ou les conditions d'utilisation interdisent la collecte passe en manuel*, même si c'est techniquement facile.

## En bref

| # | Course | Source | Collecte autorisée ? | Méthode possible | Recommandation |
| --- | --- | --- | --- | --- | --- |
| 1 | HYROX Open solo | hyrox.com | ❌ Interdite par les CGU (art. 6.1) | — | **Manuel** |
| 2 | HYROX Doubles | hyrox.com | ❌ Idem | — | **Manuel** |
| 3 | DEKA FIT | spartan.com | ❌ Interdite par les CGU | (2 serait possible) | **Manuel** |
| 4 | DEKA MILE | spartan.com | ❌ Idem | (2 serait possible) | **Manuel** |
| 5 | DEKA STRONG | spartan.com | ❌ Idem | (2 serait possible) | **Manuel** |
| 6 | ATHX Games | athxgames.com | ✅ Rien ne l'interdit | JSON embarqué dans la page (entre 1 et 3) | **Automatique** |
| 7 | Deadly Dozen | deadlydozen.com | ✅ Rien ne l'interdit | **2** (schema.org `ItemList` + `SportsEvent`) | **Automatique** |
| 8 | The Hybrid Games | thehybridgames.com | ✅ Rien ne l'interdit | 3 (dates en texte libre) | **Manuel** (HTML possible plus tard) |
| 9 | Turf Games | turfgames.com | ✅ Rien ne l'interdit | 3 (dates en texte libre) | **Manuel** |
| 10 | XENOM | aucun calendrier officiel trouvé | — | — | **Manuel** |
| 11 | Spartan Sprint | spartan.com | ❌ Interdite par les CGU | (2 serait possible) | **Manuel** |

**Résultat : 2 courses sur 11 automatisables aujourd'hui** (ATHX, Deadly Dozen), contre un objectif initial de 7 sur 11.

**Objectif révisé proposé : 2 sur 11**, avec deux leviers pour remonter :

- **Demander l'autorisation à Spartan** (une seule source pour 4 courses, données déjà parfaitement structurées) → **6 sur 11**.
- **Demander l'autorisation à HYROX** → **8 sur 11**.
- En option, un collecteur HTML pour The Hybrid Games → +1, mais fragile pour 5 événements par an (voir plus bas).

## Détail par source

### hyrox.com — HYROX Open solo et HYROX Doubles

- **robots.txt** : inaccessible. Le site renvoie `403 Forbidden` à toute requête qui se présente comme un robot (y compris pour `robots.txt` et la page des courses). Seule une requête se présentant comme un navigateur passe. *Pour l'étude, une seule lecture de `/find-my-race/` a été faite ainsi ; un collecteur ne doit jamais contourner ce blocage.*
- **Conditions d'utilisation** ([hyrox.com/terms-of-use](https://hyrox.com/terms-of-use/), sans date de version) :
  - art. 6.1 : *« You shall not conduct, facilitate, authorise or permit any text or data mining or web scraping in relation to our site »*, y compris par *« robot, bot, spider, scraper or other automated device »* ;
  - art. 5.1 et 5.2 : usage *« personal, non-commercial »*, interdiction de *« copy, reproduce, modify, redistribute »* ;
  - art. 7.4 : *« you may not create a link to any part of our site other than the home page »* (voir point ouvert n° 2).
- **Format des données** : page WordPress rendue côté serveur, une carte par événement (code de ville, nom, plage de dates, bouton « Buy Tickets »), filtres continent / pays / ville. Aucun flux iCal, aucune donnée schema.org `Event`, aucune API publique documentée.
- **Exemple relevé (23/10/2026)** : *Fitness Park HYROX Paris, 12–20 déc. 2026* ; *Lucis HYROX Toulouse, 3–7 févr. 2027* ; *Maybelline HYROX Paris Grand Palais, 8–12 avr. 2027* ; *HYROX Lyon, 12–16 mai 2027* ; *Gent (BE), 17–20 déc. 2026* ; *Basel (CH), 12–14 févr. 2027*. Une trentaine d'événements dans la zone sur la saison 2026/27.
- **Alternative écartée** : [RoxRadar](https://www.roxradar.com/hyrox-france), site tiers (« not affiliated with HYROX ») qui republie les dates HYROX. `robots.txt` permissif, pas de CGU trouvées, mais il tire lui-même ses données de hyrox.com : s'appuyer dessus contournerait l'interdiction de HYROX et ajouterait un intermédiaire fragile.
- **Risque** : juridique (interdiction expresse) et technique (blocage des robots).
- **Recommandation** : **saisie manuelle** dans `data/events-manual/hyrox.json`. Les dates sont annoncées par saison : une mise à jour par mois suffit. Écrire à HYROX pour demander une autorisation (ou un flux) est possible.

### spartan.com — DEKA FIT, DEKA MILE, DEKA STRONG et Spartan Sprint

`deka.fit` redirige vers `spartan.com/en/deka` : une seule source pour 4 courses.

- **robots.txt** ([spartan.com/robots.txt](https://www.spartan.com/robots.txt)) : tout est autorisé sauf `/preview` et deux pages d'aide, y compris pour les robots d'IA nommément cités. Plan du site : `https://www.spartan.com/sitemap.xml`.
- **Conditions d'utilisation** ([spartan.com/en/about/terms-and-conditions](https://www.spartan.com/en/about/terms-and-conditions), sans date de version) : il est interdit de *« access, scrape or search the Services or Content or download Content »* au moyen de *« spiders, robots, crawlers, data mining tools »*, autres que les navigateurs, et de *« copy, use, index, disclose or distribute any information or data obtained from the Services »*. Usage *« personal, non-commercial »*.
- **Format des données** : excellent. Chaque page de course contient un bloc schema.org `SportsEvent` (dates ISO, ville, **code pays**, lien), avec des `subEvent` qui nomment chaque épreuve. Le plan du site liste environ 256 pages `/en/races/<nom>` avec leur date de modification, ce qui permettrait de ne relire que les pages changées.
- **Exemples relevés (23/10/2026)** :
  - *2026 London West DEKA Trifecta Weekend*, Farnborough, `GB`, 28–29 nov. 2026, sous-épreuves *DEKA FIT & Ultra – Saturday* (28/11), *DEKA Mile – Sunday* et *DEKA Strong – Sunday* (29/11) ;
  - *2027 Carcassonne Spartan Weekend*, `FR`, 8–9 mai 2027, sous-épreuves *Sprint 5K 20 OBSTACLES* (8 et 9/05), *SUPER 10K*, *BEAST 21K* ;
  - piège : *2026 Morzine Spartan Winter Trail 10K, 21K* (`FR`, 13/12/2026) n'est pas un Sprint. Il faudrait filtrer sur le nom des sous-épreuves.
- **Risque** : juridique (interdiction expresse dans les CGU, malgré un `robots.txt` ouvert). Techniquement, ce serait la source la plus stable.
- **Recommandation** : **saisie manuelle** dans `data/events-manual/spartan.json`. C'est **la demande d'autorisation la plus rentable** : 4 courses d'un coup, et les données sont déjà prêtes à être lues.

### athxgames.com — ATHX Games

- **robots.txt** ([athxgames.com/robots.txt](https://athxgames.com/robots.txt)) : `User-agent: *` / `Disallow:` vide, donc tout est autorisé.
- **Conditions d'utilisation** ([athxgames.com/terms](https://athxgames.com/terms), sans date de version) : aucune clause sur les robots, la collecte ou l'extraction de données. Elles portent sur l'inscription aux épreuves.
- **Format des données** : la page [athxgames.com/events](https://athxgames.com/events) (application Laravel + Inertia) embarque **toute la liste des événements à venir en JSON** dans l'attribut `data-page`. **1 seule requête** donne les 36 événements avec `name`, `country.code` (ISO), `venue.city`, `start_date`, `date` (plage), lien. Aucun flux iCal, aucune donnée schema.org.
- **Exemple relevé (23/10/2026)** : `{"name": "ATHX PARIS 2027", "country": {"code": "FR"}, "date": "13 - 14 Feb 2027", "start_date": "13 Feb 2027", "venue": {"name": "Paris Event Centre", "city": "Paris"}, "participant_types": "Individual, Pairs"}`. Dans la zone : Paris (13–14/02/2027), Valencia, Milan, Brussels, St Gallen, Stuttgart, Madrid, Frankfurt, Montpellier (28–29/05/2027), Glasgow, Berlin, Birmingham, Hamburg, Rome, Marseille (10–11/09/2027), Turin, Liverpool, Bilbao, London : **19 événements**.
- **Risque** : moyen. Ce JSON est interne au site et non documenté : une refonte peut le changer, mais il est plus stable qu'une lecture du HTML. Les dates sont en texte anglais (« 13 Feb 2027 ») et doivent être converties.
- **Recommandation** : **collecteur automatique**, 1 requête par nuit, avec le garde-fou du §6.

### deadlydozen.com — Deadly Dozen

- **robots.txt** ([deadlydozen.com/robots.txt](https://www.deadlydozen.com/robots.txt)) : tout est autorisé sauf `/embed-api/`, `/embed-assets/` et `/embed-proxy/` (à ne pas utiliser). Plan du site : `https://www.deadlydozen.com/sitemap.xml`.
- **Conditions d'utilisation** : aucune page de CGU liée sur le site (`/terms` renvoie 404), seulement une politique de confidentialité. Rien n'interdit la collecte.
- **Format des données** : **schema.org** (méthode 2).
  - Chaque page pays (`/races/germany`, `/races/italy`…) contient un `ItemList` des courses : `"Deadly Dozen Köln - 24 Apr 2027"` + lien.
  - Chaque page de course contient un `SportsEvent` complet : `startDate` ISO, `addressLocality`, `addressCountry`, lien d'inscription (`offers.url`).
  - Aucun flux iCal.
- **Exemple relevé (23/10/2026)** : `{"@type": "SportsEvent", "name": "Deadly Dozen Köln", "startDate": "2027-04-24T09:00:00+02:00", "address": {"addressLocality": "Köln", "addressCountry": "DE"}, "offers": {"url": "https://in.deadlydozen.events/deadly-dozen-koln---24-april-27…"}}`. Pays de la zone : Allemagne (9 courses), Italie (6), Suisse (3), Espagne (1), Royaume-Uni (une quinzaine). Aucune course à venir en France.
- **Piège** : le site liste aussi d'autres formats (*Deadly Sprint*, *Deadly Gross*, *Deadly Hybrid*, *Ultra*, *Youth*). Il faut ne garder que les noms *« Deadly Dozen … »* et les *Track Race*.
- **Risque** : faible à moyen. Données schema.org stables, mais il faut plusieurs requêtes (une par pays de la zone, soit 5 ou 6) au lieu d'une seule (voir point ouvert n° 3).
- **Recommandation** : **collecteur automatique** sur les pages pays (`ItemList`), plus les pages de course pour la date ISO et le lien d'inscription, avec un cache.

### thehybridgames.com — The Hybrid Games

- Attention : `thehybridgames.co.uk` est un **domaine parqué** (redirection vers `/lander`), pas le site officiel. Le site officiel est **thehybridgames.com** (lien depuis le salon Olympia via `thehybridgames.uk`).
- **robots.txt** ([thehybridgames.com/robots.txt](https://thehybridgames.com/robots.txt)) : bloque seulement `/wp-admin/` et une URL technique, tout le reste est autorisé.
- **Conditions d'utilisation** ([thehybridgames.com/terms-conditions](https://thehybridgames.com/terms-conditions/), sans date de version) : rien sur la collecte. Elles portent sur l'épreuve et les droits photo et vidéo.
- **Format des données** : WordPress. L'API WordPress (`/wp-json/wp/v2/events`) liste les 5 événements **sans leurs dates**. Les dates ne sont qu'en texte libre sur [/events/](https://thehybridgames.com/events/) : « 27 February 2027 », « 29 - 31 May 2027 ». Aucune donnée schema.org `Event`. Billetterie Vivenu.
- **Exemple relevé (23/10/2026)** : Liverpool 27/02/2027, Newcastle 29–31/05/2027, Birmingham 3–4/07/2027, Glasgow 29–31/10/2027. Tout au Royaume-Uni.
- **Format confirmé** ([race-format](https://thehybridgames.com/race-format/)) : 10 × 600 m + 10 stations + 200 m de sprint ; solo et doubles (pas de relais).
- **Risque** : lecture du HTML (méthode 3), cassée à chaque refonte, pour 5 événements par an.
- **Recommandation** : **saisie manuelle**. Un collecteur HTML reste possible plus tard si la saisie devient pénible.

### turfgames.com — Turf Games

- **robots.txt** ([turfgames.com/robots.txt](https://turfgames.com/robots.txt)) : boutique Shopify, pages publiques autorisées. Le fichier contient aussi des consignes commerciales adressées aux assistants IA, sans rapport avec notre usage, et ignorées.
- **Conditions** ([turfgames.com/pages/turf-games-t-cs](https://turfgames.com/pages/turf-games-t-cs), mises à jour le **5 juin 2025**) : rien sur la collecte. Elles portent sur la billetterie.
- **Format des données** : une page Shopify par événement, date en texte (« 6/7 FEBRUARY 2027 »), aucune donnée structurée, inscriptions sur circle21.events.
- **Exemple relevé (23/10/2026)** : *London Winter Festival*, Olympia, 6–7 févr. 2027 ; *London Engine 2027*. Les autres dates (Dubaï, Brisbane, Sydney) sont hors zone.
- **Risque** : HTML libre et irrégulier, 1 ou 2 événements par an dans la zone.
- **Recommandation** : **saisie manuelle**.

### XENOM

- Le domaine `xenom.com` appartient à **une autre entreprise** (aménagement d'expositions). `xenomfitness.com` n'affiche qu'un formulaire de contact : aucun calendrier, aucune CGU.
- Selon la presse ([BoxRox](https://www.boxrox.com/?p=240818), [Health Club Management](https://www.healthclubmanagement.co.uk/health-club-management-news/Hyrox-teams-up-with-Xenom-the-decathlon-of-fitness/363751)) : saison 2026 aux États-Unis et à Londres, **Paris et Malaga annoncés pour début 2027, sans date confirmée**.
- **Risque** : aucune source officielle exploitable.
- **Recommandation** : **saisie manuelle**, « Pas de date annoncée » en attendant. Le site officiel est à revérifier au Lot 1.

## Conséquences pour le Lot 1

1. **Deux collecteurs** à coder en US1.5 : `athx` et `deadly-dozen`.
2. **Neuf courses en saisie manuelle** (`data/events-manual/`), en 5 fichiers : `hyrox.json`, `spartan.json` (DEKA ×3 + Sprint), `hybrid-games.json`, `turf-games.json`, `xenom.json`. La date « vérifiée le » d'une course manuelle est celle de la dernière saisie.
3. **Rappel mensuel** suggéré (ticket GitHub automatique) pour revoir les dates manuelles, sinon elles vieillissent sans prévenir.
4. Les **liens d'inscription** collectés pointent vers le site de l'organisateur ou sa billetterie officielle (ATHX, Deadly Dozen).

## Points ouverts (à trancher)

1. **Objectif révisé : 2 courses sur 11 automatisées** (au lieu de 7). À valider, et décider s'il faut écrire à Spartan et à HYROX pour demander une autorisation.
2. **Liens vers hyrox.com** : l'art. 7.4 des CGU HYROX n'autorise de lien que vers la page d'accueil. Or la fiche course prévoit un lien d'inscription (§4). Options : lien vers l'accueil de hyrox.com, ou lien direct en considérant le risque négligeable.
3. **« Une requête par source et par nuit »** (CLAUDE.md) contre **« 1 passage par nuit et par source »** (specs §6). Deadly Dozen demande quelques requêtes par passage (une par pays de la zone). Proposition : les specs l'emportent, soit 1 passage par nuit avec quelques requêtes espacées et un cache. CLAUDE.md sera aligné en US0.7.

## Sources consultées

- hyrox.com : [/find-my-race/](https://hyrox.com/find-my-race/), [/terms-of-use/](https://hyrox.com/terms-of-use/), [/terms-and-conditions/](https://hyrox.com/terms-and-conditions/)
- spartan.com : [robots.txt](https://www.spartan.com/robots.txt), [sitemap.xml](https://www.spartan.com/sitemap.xml), [CGU](https://www.spartan.com/en/about/terms-and-conditions), [/en/deka](https://www.spartan.com/en/deka), [London West DEKA](https://nl.spartan.com/nl/race/detail/10454/overview), [Carcassonne](https://www.spartan.com/en/races/carcassonne), [Morzine](https://www.spartan.com/en/races/morzinetrail)
- athxgames.com : [robots.txt](https://athxgames.com/robots.txt), [/events](https://athxgames.com/events), [/terms](https://athxgames.com/terms)
- deadlydozen.com : [robots.txt](https://www.deadlydozen.com/robots.txt), [/races](https://www.deadlydozen.com/races), [/races/germany](https://www.deadlydozen.com/races/germany), [Köln](https://www.deadlydozen.com/deadly-dozen-koln)
- thehybridgames.com : [robots.txt](https://thehybridgames.com/robots.txt), [/events/](https://thehybridgames.com/events/), [/terms-conditions/](https://thehybridgames.com/terms-conditions/), [/race-format/](https://thehybridgames.com/race-format/), [Olympia](https://www.olympia.co.uk/events/the-hybrid-games)
- turfgames.com : [robots.txt](https://turfgames.com/robots.txt), [/pages/events](https://turfgames.com/pages/events), [T&Cs](https://turfgames.com/pages/turf-games-t-cs), [London Winter Festival 2027](https://turfgames.com/pages/turf-games-london-winter-festival-2027)
- XENOM : [xenomfitness.com](https://xenomfitness.com/), [BoxRox](https://www.boxrox.com/?p=240818), [Health Club Management](https://www.healthclubmanagement.co.uk/health-club-management-news/Hyrox-teams-up-with-Xenom-the-decathlon-of-fitness/363751)
- Tiers : [RoxRadar](https://www.roxradar.com/hyrox-france)
