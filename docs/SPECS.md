# Station 0 — Specs produit & tech V1

Oct 23, 2026 · @Faustine

## 1. Cadre RCOC

Station 0 aide un débutant ou un intermédiaire à trouver la course hybride faite pour lui, à savoir quand elle a lieu, et à s'y entraîner tout de suite.

| Bloc | Contenu |
| --- | --- |
| **Rôle** | Claude joue le PM et le tech lead : vision produit, specs, découpage en lots, choix techniques argumentés. Faustine valide et tranche. Claude Code développe lot par lot. |
| **Contexte** | Exercice DeCode traité comme un projet perso. Cible : débutants et intermédiaires. Zone : France et pays proches. Site en français. |
| **Objectif** | Un site en ligne à 3 fonctionnalités : catalogue de \~10 courses hybrides avec difficulté par catégorie et prochaine date (principale), quiz d'orientation, générateur de mini WOD 15–20 min avec minuteur. |
| **Contraintes** | Uniquement des technos maintenues et non dépréciées. Budget 0 €/mois. Pas de compte utilisateur. Pas de mesure d'audience. Mobile d'abord, responsive. DA issue du moodboard Allygn. Règles du quiz et du WOD transparentes, sans IA. Dates récupérées automatiquement autant que possible. |

## 2. Vision produit

**Promesse : « Trouve ta première course hybride, et commence à t'y préparer aujourd'hui. »** Le marché s'est fragmenté (HYROX, DEKA, ATHX, Deadly Dozen…) et un débutant ne sait pas laquelle lui correspond. Station 0 compare les formats sur des critères lisibles, puis transforme l'hésitation en première séance.

**Cible.** Pratiquants de salle ou coureurs, débutants ou intermédiaires en course hybride, en France et dans les pays frontaliers (Belgique, Suisse, Luxembourg, Allemagne, Italie, Espagne) plus le Royaume-Uni.

**Trois parcours, tous reliés entre eux :**

1. *« Je ne sais pas quoi choisir »* → quiz → une course recommandée (+ une alternative) → fiche course → prochaine date et lien d'inscription.
2. *« Je compare »* → catalogue filtrable → fiche course → prochaine date.
3. *« Je veux essayer »* → générateur de WOD inspiré d'une course → minuteur → retour vers la fiche de la course.

Chaque fiche course propose « Essayer un WOD inspiré de cette course », et chaque résultat de quiz propose un WOD ciblé sur le point faible détecté.

**Hors périmètre V1 :** comptes et favoris, mesure d'audience, inscription ou paiement sur le site, prix des billets, notifications, version anglaise, IA.

**Critères de succès V1** (vérifiables sans analytics) :

- 11 courses publiées avec barème justifié et au moins une date à venir ou la mention « pas de date annoncée ».
- Au moins 2 courses sur 11 mises à jour automatiquement (ATHX, Deadly Dozen). Objectif révisé après l'étude des sources du Lot 0 (`docs/sources-dates.md`) : HYROX et Spartan interdisent la collecte dans leurs conditions d'utilisation. 6 sur 11 si Spartan l'autorise, 8 sur 11 avec HYROX en plus.
- Quiz terminé en moins de 90 secondes, WOD généré en 1 clic.
- Lighthouse ≥ 95 en performance et accessibilité sur mobile.

## 3. Décisions à trancher

Neuf choix restent ouverts. Pour chacun, je recommande une option et tu passes le statut à « Validé » ou « Modifié ». Le Lot 0 démarre dès que D2, D3 et D9 sont tranchées.

| # | Décision | Ma recommandation | Alternative | Statut |
| --- | --- | --- | --- | --- |
| D1 | Nom du site | **Station 0 : la station d'avant la première, le point de départ de toute course hybride**. | Un autre nom ; seul le logo et les métadonnées changent. | Modifié |
| D2 | Framework des parties interactives (quiz, WOD, minuteur) | **Svelte 5** : environ 10 fois moins de JavaScript envoyé que React sur un petit site, syntaxe proche du HTML, plus facile à relire pour toi. | **React 19** : plus de ressources en ligne et compétence très demandée en alternance, mais un runtime d'environ 45 Ko à charger. | Validé |
| D3 | Hébergement | **GitHub Pages + GitHub Actions** : gratuit sur dépôt public, un seul compte, la collecte des dates tourne au même endroit que le site. | **Cloudflare** (qui possède Astro depuis janvier 2026) : réseau plus rapide, mais un compte et un outil de plus. | Validé |
| D4 | Mise à jour des dates | **Commit automatique** quand les données passent la validation ; Pull Request à relire seulement en cas d'anomalie. | Pull Request systématique : plus sûr, mais demande ton intervention à chaque changement. | Validé |
| D5 | Spartan Sprint (course à obstacles 5 km) | **Ne pas l'inclure en V1** : ce n'est pas une course fitness hybride et ça brouille les recommandations du quiz. | L'ajouter comme 11e course « cousine », marquée à part. | Modifié |
| D6 | Mode du générateur de WOD | **Tout aléatoire en 1 clic**, avec des verrous optionnels (course, niveau, matériel, format). Le time cap (15 ou 20 min) est la seule contrainte toujours respectée. | Formulaire obligatoire avant de générer. | Validé |
| D7 | Résultat du quiz | **1 course + 1 alternative**, l'alternative n'apparaît que si son score dépasse 60 % et qu'elle vient d'un autre organisateur. | Toujours afficher une alternative. | Validé |
| D8 | Typographies | **Barlow Condensed** (titres, proche du logo) + **Inter** (texte), libres de droits, hébergées sur le site. | Autre paire condensée + linéale. | Validé |
| D9 | Thème | **Sombre par défaut** (fond encre du moodboard), clair automatiquement si le téléphone est en mode clair. | Sombre uniquement. | Validé |

## 4. F1 — Catalogue de courses (fonctionnalité principale)

Le catalogue compare 11 formats de course, pas 11 marques : HYROX solo et HYROX Doubles n'ont pas la même difficulté, DEKA FIT et DEKA STRONG non plus. Les formats et dates ci-dessous viennent de la recherche du 23/10/2026 ; ils seront revérifiés sur les sites et règlements officiels au Lot 1.

### Les 11 courses proposées (10 hybrides + 1 cousine)

| # | Course | Format en bref | Durée indicative | Participation | Présence France / pays proches |
| --- | --- | --- | --- | --- | --- |
| 1 | [HYROX](https://hyrox.com) — Open solo | 8 × 1 km de course, chacun suivi d'une station (SkiErg, sled push, sled pull, burpee broad jumps, rameur, farmers carry, fentes sandbag, wall balls) | 1 h – 1 h 30 | Solo | Nice, Paris, Toulouse, Lyon sur la saison 2026/27 |
| 2 | HYROX — Doubles | Même parcours, course à deux, stations partagées | Un peu moins que le solo | Duo | Idem |
| 3 | [DEKA](https://www.deka.fit) FIT | 10 zones, 500 m de course avant chacune (5 km) | \~50 min | Solo, équipe | Espagne surtout, Royaume-Uni ; France rare |
| 4 | DEKA MILE | 10 zones, 160 m avant chacune (1 mile) | \~30 min | Solo, équipe | Idem |
| 5 | DEKA STRONG | 10 zones enchaînées, sans course | \~20 min | Solo | Idem |
| 6 | ATHX Games | 6 zones sur \~2 h 30 : force (squat, deadlift, press), endurance, metcon | \~2 h 30 (avec récupération) | Solo, duo | Paris (avril 2026), Marseille (sept. 2026) ; 21 étapes annoncées en 2027 |
| 7 | [Deadly Dozen](https://www.deadlydozen.com) | 12 × 400 m sur piste, chacun suivi d'un exercice kettlebell, haltère, disque ou poids du corps | À mesurer | Solo, duo, relais 4 | Allemagne, Suisse, Autriche, Italie, Royaume-Uni, Irlande |
| 8 | The Hybrid Games | 10 × 600 m + 10 stations + sprint final de 200 m | À mesurer | À vérifier | Royaume-Uni |
| 9 | [Turf Games](https://turfgames.com) | Festival par équipe de 6, 4 à 5 workouts par niveau (Everyday, Intermediate, Elite) | Une journée | Équipe de 6 | Royaume-Uni |
| 10 | XENOM | « Décathlon du fitness » : 10 épreuves fixes sur 2 jours, catégorie Compete accessible | 2 jours | Solo | Paris annoncé, date à venir |
| 11 | Spartan Sprint (cousine, course à obstacles) | 5 km de trail et 20 obstacles (porter, grimper, se suspendre), 30 burpees de pénalité par obstacle raté | \~1 h 30 | Solo, équipe | Jablines (sept.), Carcassonne (mai), Morzine (juillet), Estérel (oct.) |

### Page catalogue

- Une carte par course : nom, note globale /5, 4 mini-jauges (course, force, cardio/ergo, gym/agilité), formats de participation, prochaine date + ville.
- Filtres : format (solo, duo, équipe), note globale maximale, « sans course à pied », pays, « date dans les 3 mois ». Les filtres se reflètent dans l'URL pour être partageables.
- Tri : prochaine date (par défaut) ou difficulté croissante.
- Une course sans date à venir reste visible avec « Pas de date annoncée », en fin de liste.

Spartan Sprint porte un badge « Course à obstacles » ; un filtre « Type : hybride / obstacles » permet de l'afficher ou de la masquer.

### Fiche course

1. En-tête : nom, organisateur, note globale, formats de participation, durée moyenne.
2. « Pour qui ? » en 2 phrases, puis le déroulé de la course (liste des stations dans l'ordre).
3. Les 4 catégories notées de 1 à 5, chacune avec un « Pourquoi 3/5 ? » qui affiche les données du barème.
4. Les 3 prochaines dates en France et pays proches, avec ville, pays et lien d'inscription ; mention « Dates vérifiées le … ».
5. Lien vers le site officiel.
6. Bouton « Essayer un WOD inspiré de cette course » (générateur pré-réglé).
7. Lien « Pas sûr que ce soit pour toi ? Fais le quiz ».

### Données d'une course (un fichier JSON par course, validé par un schéma)

`slug`, `nom`, `organisateur`, `siteOfficiel`, `formats` (solo, duo, relais, equipe), `dureeMoyenneMin`, `deroule` (liste ordonnée de segments : course en mètres ou exercice avec charge et volume), `bareme` (données brutes du §5), `notes` (calculées, jamais saisies à la main), `pourQui`, `saison` (ex. 2026/27, car les formats changent chaque année), `sourceDates` (identifiant du collecteur ou `manuel`), `sources` (liens des règlements consultés).

Détail des champs (schéma `src/lib/schemas.ts`, ajouté en US0.5) :

| Champ | Contenu |
| --- | --- |
| `slug` | Identifiant en minuscules et tirets, identique au nom du fichier (`data/races/<slug>.json`) |
| `typeCourse` | `hybride` ou `obstacles` (Spartan Sprint), pour le badge et le filtre « Type » |
| `categorieNotee` | Catégorie la plus accessible, celle qui est notée (Open, Everyday, Compete…) |
| `deroule` | Segments `{ "type": "course", "distanceM" }` ou `{ "type": "exercice", "nom", "chargeKg" (absent au poids du corps), "volume", "unite" }` ; `unite` : `repetitions`, `metres`, `calories`, `secondes` |
| `bareme.partageEffort` | Nombre d'athlètes qui se partagent distance et volume (1 en solo, 2 en duo…) |
| `bareme.course.distanceM` | Distance totale de course |
| `bareme.force` | `chargeMaxKg` et `equipement` : `aucun`, `sledLeger`, `sledLourd`, `barreSousMax`, `testMax` |
| `bareme.cardio.ergoM` | Mètres d'ergo cumulés (rameur, SkiErg, air bike) ; la durée d'effort est `dureeMoyenneMin` |
| `bareme.gym.mouvementLePlusTechnique` | Un mouvement du tableau du §5 : `marcher`, `porter`, `burpees`, `fentes`, `wallBalls`, `boxJumps`, `bearCrawl`, `snatchHaltere`, `tractions`, `toesToBar`, `obstaclesSimples`, `muscleUp`, `handstandPushUp`, `obstaclesTechniques` |
| `notes` | **Absent du fichier** : calculé au build depuis `bareme` ; un fichier qui en contient est refusé |

**Événements** (`data/events/<source>.json` collectés, `data/events-manual/<source>.json` saisis à la main, même format) : `source` (identifiant du collecteur ou `manuel`), `verifieLe` (date et heure du passage, ISO 8601), `evenements` (liste). Chaque événement : `course` (slug), `date` et `dateFin` facultative (AAAA-MM-JJ, pour les événements sur plusieurs jours), `ville`, `pays` (code ISO : `FR`, `BE`, `CH`, `LU`, `DE`, `IT`, `ES`, `GB`), `lienInscription`. Le schéma vérifie que la date est valide ; le contrôle « date future » et la fenêtre de 18 mois sont faits par la collecte (§6), pour qu'un événement passé ne casse pas le build.

## 5. Barème objectif de difficulté

Chaque note de 1 à 5 est calculée par le code à partir de données mesurables du règlement, jamais saisie à la main. On note toujours la catégorie la plus accessible de la course (Open, Everyday, Compete…), puisque la cible est débutante. Les seuils vivent dans un fichier de config : tu peux les ajuster, toutes les notes se recalculent.

| Note | Course à pied (distance totale) | Force (charge la plus lourde, catégorie accessible) | Cardio / ergo (rameur, SkiErg, air bike cumulés) | Gym / agilité (mouvement le plus technique) |
| --- | --- | --- | --- | --- |
| 1 | Aucune course | Poids du corps ou < 10 kg | Aucun ergo, effort < 20 min | Marcher, porter |
| 2 | Jusqu'à 2 km | 10 à 16 kg (kettlebell, haltères, sandbag) | < 1 000 m d'ergo ou effort de 20 à 40 min | Burpees, fentes, wall balls |
| 3 | 2 à 5 km | 16 à 30 kg, ou sled léger | 1 000 à 2 000 m ou effort de 40 à 60 min | Box jumps, bear crawl, snatch haltère |
| 4 | 5 à 8 km | Sled lourd ou barre sous-maximale | 2 000 à 3 000 m ou effort de 60 à 90 min | Tractions, toes-to-bar, obstacles simples |
| 5 | Plus de 8 km | Tests de charge maximale (1RM, 3RM, 5RM) | Plus de 3 000 m ou effort de plus de 90 min | Muscle-up, handstand push-up, obstacles techniques |

**Note globale** = moyenne des 4 catégories, ajustée par la durée (−0,5 si moins de 30 min, +0,5 si plus de 90 min), arrondie à l'entier et bornée entre 1 et 5.

**Duo et équipe.** La distance et le volume sont divisés par le nombre d'athlètes qui se partagent l'effort, mais pas la charge : en HYROX Doubles, le sled pèse autant, on en fait juste moins.

**Transparence.** La fiche course affiche, pour chaque note, la donnée qui l'a produite (ex. « Course 4/5 : 8 km au total »). Une page « Comment on note » reprend ce tableau.

**Exemple attendu** (à valider par toi, tu connais la course) : HYROX Open solo → course 5 (8 km), force 4 (sled), cardio 4 (2 000 m d'ergo, 60–90 min), gym 2 (burpees, fentes, wall balls) → globale 4.

## 6. Récupération automatique des dates

Les dates sont collectées chaque nuit par un script, validées, puis le site est reconstruit ; quand une source casse, le site garde les dernières dates connues et te prévient. C'est le compromis entre ton souhait d'automatiser au maximum et ta contrainte de durabilité : on automatise source par source, et le manuel reste un filet de sécurité, pas l'exception honteuse.

&#91;embedded content: collecte des dates · chaque nuit, 1 contrôle\]

Une source qui renvoie des données douteuses ne bloque rien : le site se reconstruit avec ses dernières dates connues et tu reçois un ticket.

### Méthode, par ordre de préférence pour chaque source

1. Un flux officiel (calendrier iCal, JSON public, API documentée) : le plus stable.
2. Des données structurées dans la page (balises schema.org `Event`) : stables, faites pour être lues par des machines.
3. La lecture du HTML de la page : fragile, chaque refonte du site la casse.
4. La saisie manuelle dans un fichier dédié : pour les sources sans rien d'exploitable.

### Résultat de l'étude des sources (Lot 0, 23/10/2026)

Détail, citations des conditions d'utilisation et exemples de données dans `docs/sources-dates.md`.

| Source | Courses couvertes | Résultat |
| --- | --- | --- |
| hyrox.com | HYROX solo et Doubles | **Manuel** : collecte interdite par les CGU (art. 6.1), robots bloqués |
| spartan.com | DEKA FIT, MILE, STRONG, Spartan Sprint | **Manuel** : collecte interdite par les CGU, malgré des données schema.org parfaites |
| athxgames.com | ATHX Games | **Automatique** : liste JSON embarquée dans la page `/events`, 1 requête |
| deadlydozen.com | Deadly Dozen | **Automatique** : schema.org `ItemList` et `SportsEvent` |
| thehybridgames.com | The Hybrid Games | **Manuel** : dates en texte libre, 5 événements par an |
| turfgames.com | Turf Games | **Manuel** : dates en texte libre, 1 à 2 événements par an dans la zone |
| XENOM | XENOM | **Manuel** : aucun calendrier officiel publié |

### Hypothèses de départ (avant l'étude)

| Source | Courses couvertes | Piste la plus probable |
| --- | --- | --- |
| hyrox.com (page « Find My Race ») | HYROX solo et Doubles | Données chargées par le site depuis une source JSON à identifier |
| spartan.com (pages DEKA) | DEKA FIT, MILE, STRONG, Spartan Sprint | Pages de course très structurées (dates, formats, villes), une source commune pour 4 courses |
| deadlydozen.com | Deadly Dozen | Liste d'événements au format régulier, flux de calendrier possible |
| Site ATHX | ATHX Games | À étudier |
| turfgames.com, The Hybrid Games, XENOM | 3 courses | Peu d'événements par an : saisie manuelle probable |

### Règles de collecte

- 1 passage par nuit et par source, avec un identifiant de robot clair et un cache : on ne charge pas les sites des organisateurs.
- On respecte le fichier robots.txt et les conditions d'utilisation de chaque site ; une source qui l'interdit passe en manuel.
- On ne garde que les événements en France et pays proches, à venir dans les 18 mois.
- Chaque événement collecté passe un schéma de validation (date valide et future, ville, pays, lien).
- Garde-fou : si une source renvoie 0 événement ou en perd plus de la moitié d'un coup, on garde les données précédentes, la course est marquée « à vérifier » et un ticket GitHub est ouvert automatiquement.
- Une saisie manuelle est toujours prioritaire sur une donnée collectée (pour corriger une erreur sans toucher au code).
- Chaque passage enregistre sa date de vérification, affichée sur la fiche. Cette écriture quotidienne garde aussi le dépôt actif : GitHub désactive les tâches planifiées d'un dépôt public après 60 jours sans activité.
- Côté navigateur, un petit script masque une date déjà passée, au cas où la dernière reconstruction aurait échoué.

## 7. F2 — Quiz d'orientation

Le quiz pose 7 questions, construit un profil sur les mêmes 4 catégories que le barème, puis classe les courses par écart entre le profil et la difficulté de chaque course. Même échelle des deux côtés, donc un résultat explicable en une phrase.

### Les questions

| # | Question | Réponses → valeur |
| --- | --- | --- |
| Q1 | Courir 5 km sans t'arrêter, c'est… | Pas encore possible → course 2 · Faisable mais dur → 3 · Facile → 4 · Je cours plus loin régulièrement → 5 |
| Q2 | Les charges (kettlebell, haltères, sled)… | Jamais touché → force 1 · Un peu en salle → 2 · Régulièrement → 3 · Je fais de la barre lourde → 5 |
| Q3 | Rameur, SkiErg, vélo… | Jamais → cardio 1 · De temps en temps → 2 · Souvent, 20 min et plus → 4 · Gros moteur d'endurance → 5 |
| Q4 | Le mouvement le plus technique que tu maîtrises | Aucun de ceux-là → gym 1 · Burpees → 2 · Box jumps → 3 · Tractions ou toes-to-bar → 4 · Muscle-up → 5 |
| Q5 | Tu te vois courir… | Seul·e · À deux · En équipe · Peu importe |
| Q6 | Ton objectif | Finir et kiffer · Me tester sur un chrono · Me mesurer aux autres |
| Q7 | Jusqu'où es-tu prêt·e à aller ? | France uniquement · France et pays frontaliers · Peu importe |

### Règle de scoring

Pour chaque course et chacune des 4 catégories, écart = note de la course − niveau du profil.

- **Course plus dure que le profil** (écart positif) : pénalité = 2 × écart². On punit fort ce qui risque de dégoûter un débutant.
- **Course plus facile** (écart négatif) : pénalité = |écart| × poids. Poids 0,25 si l'objectif est « finir et kiffer », 0,5 pour « chrono », 1 pour « me mesurer ».
- **Format** : une course qui ne propose pas le format choisi en Q5 est exclue.
- **Distance** : aucune date à venir dans la zone de Q7 sur 12 mois → +3 de pénalité (la course reste possible mais recule).

Score de compatibilité = 100 − 8 × pénalité totale, borné entre 0 et 100 %. À égalité, la course dont la prochaine date est la plus proche passe devant. Tous les coefficients sont dans un fichier de config.

### Résultat

- **La course recommandée** : nom, score, « Pourquoi elle te va » (les 2 catégories où l'écart est le plus faible), « Point d'attention » (la catégorie au plus gros écart positif), prochaine date, bouton vers la fiche.
- **Une alternative** si son score dépasse 60 % et qu'elle vient d'un autre organisateur (D7).
- **Un WOD pour progresser** : lien vers le générateur, ciblé sur la catégorie du point d'attention.
- **Si aucune course ne dépasse 40 %** : on montre la plus accessible avec un message honnête (« Pas encore, mais voici par où commencer ») et un WOD débutant.
- Les réponses sont dans l'URL du résultat : partageable, et rien n'est stocké.

### Tests de référence

Des profils types sont vérifiés automatiquement à chaque modification des règles. Exemple : profil « course 3, force 3, cardio 4, gym 3, à deux, chrono » → HYROX Doubles ou DEKA MILE en tête. Exemple : profil « ne court pas, force 3, seul·e, kiffer » → DEKA STRONG.

## 8. F3 — Générateur de WOD et minuteur

Un clic sur « Génère-moi un WOD » produit une séance aléatoire de 15 ou 20 minutes, faite d'exercices tirés des courses du catalogue, qu'on lance directement avec le minuteur intégré.

### Paramètres (tous aléatoires par défaut, verrouillables)

| Paramètre | Valeurs | Par défaut |
| --- | --- | --- |
| Time cap | 15 ou 20 min | Tiré au sort ; **toujours respecté** |
| Course d'inspiration | Une des 11 courses ou « Mix » | Tirée au sort |
| Niveau | Débutant, intermédiaire, confirmé | Débutant |
| Matériel | Aucun, haltères ou kettlebell, salle complète | Tiré au sort |
| Format | AMRAP, EMOM, For Time, Intervalles | Tiré au sort |

Un verrou fige une valeur ; « Relancer » ne retire que le reste. Depuis une fiche course ou un résultat de quiz, la course (ou la catégorie à travailler) arrive déjà verrouillée.

### Banque d'exercices (un fichier JSON)

Chaque exercice décrit : nom, courses d'origine, catégorie (course, force, cardio/ergo, gym), schéma de mouvement (pousser, tirer, squat, fente, charnière, porter, corps entier), matériel, unité (répétitions, mètres, calories, secondes), volume par niveau, temps estimé par unité, consigne courte et **alternatives sans le matériel**. Noms des champs (US0.5) : `id`, `nom`, `coursesOrigine` (slugs), `categorie` (`course`, `force`, `cardio`, `gym`), `schemaMouvement` (`pousser`, `tirer`, `squat`, `fente`, `charniere`, `porter`, `corpsEntier`), `materiel` (`aucun`, `halteresKettlebell`, `salleComplete`), `unite`, `volumeParNiveau` (`debutant`, `intermediaire`, `confirme`), `secondesParUnite`, `consigne`, `alternatives` (identifiants d'autres exercices de la banque, qui demandent moins de matériel ; au moins une dès que `materiel` n'est pas `aucun`). Point de départ (à compléter et valider par toi) :

| Exercice | Vient de | Alternative si matériel absent |
| --- | --- | --- |
| Course 200–1 000 m | HYROX, DEKA, Deadly Dozen, Hybrid Games | Montées de genoux sur place (durée équivalente) |
| SkiErg | HYROX, DEKA | Burpees ou squats sautés, bras en tirage |
| Rameur | HYROX, DEKA | Burpees ou course |
| Sled push / pull | HYROX, DEKA (tank) | Bear crawl, sprints courts, tirage élastique |
| Burpee broad jumps | HYROX, Deadly Dozen | — (poids du corps) |
| Farmers carry | HYROX, DEKA, Deadly Dozen | Marche avec deux sacs chargés |
| Fentes sandbag / fentes | HYROX, DEKA, Deadly Dozen | Fentes au poids du corps |
| Wall balls | HYROX | Squats + lancer au-dessus de la tête sans ballon |
| Box jump-overs | DEKA | Step-ups sur une marche, sauts latéraux |
| Deadlift, goblet squat, push press, snatch | Deadly Dozen, ATHX | Versions au poids du corps ou avec un sac |
| Bucket carry, burpees de pénalité | Spartan Sprint | Marche avec un sac chargé tenu contre la poitrine |

### Règles de génération

1. Résoudre les paramètres non verrouillés.
2. Filtrer la banque : matériel disponible (sinon, prendre l'alternative), niveau, et au moins 70 % des exercices issus de la course d'inspiration (100 % « Mix »).
3. Choisir 3 à 5 exercices : au moins un de course ou cardio, au moins un de force, jamais deux fois de suite le même schéma de mouvement.
4. Dimensionner les volumes avec les temps estimés : For Time ≤ 85 % du cap ; AMRAP, un tour de 3 à 5 min ; EMOM, 35 à 45 s de travail par minute ; Intervalles, 40 s de travail / 20 s de repos.
5. Afficher une proposition d'échauffement de 5 min, hors time cap.

Le tirage est piloté par une graine dans l'URL : le même lien redonne exactement le même WOD. C'est ce qui permet de partager un WOD sans compte, et de tester le générateur de façon reproductible.

### Minuteur intégré

- Un mode par format : compte à rebours (AMRAP), bip chaque minute avec l'exercice en cours (EMOM), chronomètre avec cap (For Time), alternance travail/repos (Intervalles).
- Décompte de 10 s avant le départ, pause et reprise, compteur de tours d'un tap.
- Chiffres géants lisibles à 2 mètres, téléphone posé au sol.
- Bips sonores ; vibration sur les téléphones qui la permettent ; l'écran reste allumé pendant la séance (API Wake Lock du navigateur).
- Le temps est calculé à partir de l'horloge, pas en additionnant des secondes : il reste juste même si le téléphone ralentit l'onglet.

## 9. Direction artistique

La DA reprend le moodboard Allygn : fond encre, orange réservé aux actions, lavande pour tout ce qui se fait à deux, cobalt pour les grands aplats. Ces couleurs deviennent des variables CSS, seule source de vérité du style.

| Couleur | Code | Rôle dans Station 0 |
| --- | --- | --- |
| Encre | #0B0B0F | Fond du mode sombre, texte du mode clair |
| Orange | #FF8A3D | « Toi » : boutons d'action, CTA, temps qui défile dans le minuteur |
| Lavande | #A99BFF | « Ton binôme » : badges Duo et Équipe, filtres de format, mode Doubles |
| Cobalt | #3D48FF | Fonds forts : en-tête des fiches, bandeau du résultat du quiz |

**Principes tirés des références :**

- Gros chiffres comme élément graphique (les « 11.43 km » du moodboard) : notes /5, distances, minuteur.
- Titres en capitales condensées très grasses, texte courant sobre (D8).
- Cartes à coins arrondis sur fond sombre, beaucoup d'air, une seule action orange par écran.
- Jauges de difficulté en segments (5 pastilles), lisibles en un coup d'œil.

**Règles d'accessibilité (non négociables) :**

- Texte sur orange ou lavande : toujours en encre, jamais en blanc (le blanc sur orange ne passe pas le contraste minimum).
- Texte sur cobalt : toujours en blanc (l'encre sur cobalt ne fait que 3,3:1).
- En mode clair, l'orange et la lavande ne servent que de fonds (texte et bordure encre) : sur fond clair, ils ne contrastent qu'à 2,2:1. Le contour de focus y passe en cobalt.
- Contraste vérifié automatiquement : 4,5:1 pour le texte, 3:1 pour les éléments d'interface.
- Une information n'est jamais portée par la couleur seule : le badge Duo dit « Duo ».
- Zones tactiles d'au moins 44 × 44 px, utile en salle avec les mains moites.

## 10. Specs techniques

Le site est statique : des pages HTML générées à l'avance, avec du JavaScript uniquement là où il y a de l'interaction (quiz, générateur, minuteur, filtres). Pas de serveur, pas de base de données, pas de cookie : rien à maintenir à part le code, et 0 € d'hébergement.

### Stack recommandée

| Brique | Choix | Pourquoi |
| --- | --- | --- |
| Framework | **Astro 6** (sortie stable début 2026), export statique | Fait pour les sites de contenu ; n'envoie du JavaScript que pour les « îlots » interactifs ; valide les données JSON avec un schéma. |
| Langage | **TypeScript** en mode strict | Les erreurs de données et de logique sont détectées avant la mise en ligne. |
| Îlots interactifs | **Svelte 5** (D2) | Peu de JavaScript envoyé, code lisible. |
| Style | **CSS natif** (variables, nesting, container queries) | Aucune dépendance qui peut être dépréciée ; les navigateurs actuels savent tout faire. |
| Polices | Barlow Condensed + Inter, hébergées sur le site via l'API Fonts d'Astro | Pas d'appel à Google, donc pas de question RGPD. |
| Runtime | **Node.js LTS** : 26 dès son passage en LTS (octobre 2026), sinon 24 | Astro 6 exige Node 22 minimum ; on vise la LTS avec la fin de vie la plus lointaine. |
| Tests | **Vitest** (logique), **Playwright** (parcours), **axe-core** (accessibilité) | Les règles du quiz et du générateur sont du code pur, faciles à tester. |
| Qualité | **Biome** (lint et formatage en un outil) | Un seul outil au lieu de deux ; à confirmer au Lot 0, sinon ESLint + Prettier. |
| Hébergement et automatisation | **GitHub Pages + GitHub Actions** (D3) | Tests, collecte des dates et déploiement au même endroit. |
| Mises à jour | **Dependabot** | Propose chaque semaine les mises à jour de dépendances, testées par la CI. |

### Architecture du dépôt

```
data/
  races/            un JSON par course (§4)
  events/           dates collectées, un JSON par source (généré)
  events-manual/    dates saisies à la main (prioritaires)
  exercises.json    banque d'exercices (§8)
  config/           seuils du barème, coefficients du quiz et du générateur
src/
  lib/              logique pure et testée : bareme, quiz, wod, timer, dates
  components/       composants Astro et îlots Svelte
  pages/            accueil, courses/, courses/[slug], quiz, wod, methode
  styles/           tokens.css (DA), global.css
scripts/collect/    un collecteur par source + validation
.github/workflows/  ci.yml, collect-dates.yml (nuit), deploy.yml
docs/               specs, décisions (ADR)
CLAUDE.md           règles du projet pour Claude Code
```

La règle structurante : **toute la logique métier vit dans `src/lib/` en TypeScript pur**, sans dépendre d'Astro ni de Svelte. Si un jour un framework doit être remplacé, le cœur du produit (barème, quiz, générateur) ne bouge pas.

### Règles de durabilité

- Moins de 10 dépendances directes à l'exécution ; chaque ajout est justifié dans `docs/`.
- Une dépendance n'est acceptée que si elle a publié une version dans les 12 derniers mois et n'est pas marquée dépréciée sur npm.
- La CI échoue si une dépendance est dépréciée ou a une faille de sécurité haute ou critique.
- Les API du navigateur passent avant les bibliothèques (dates, minuteur, son, vibration).
- Versions verrouillées par le fichier de lock ; la version de Node est fixée dans le dépôt.
- Performance : moins de 50 Ko de JavaScript par page, aucune image sans dimensions.

## 11. Lots

Cinq lots livrés dans l'ordre 0 → 1 → 2 → 3 → 4. Le Lot 1 est un site utile à lui seul ; les Lots 2 et 3 dépendent tous deux des données du Lot 1 et peuvent s'inverser si tu préfères commencer par le WOD.

**Définition de « terminé », pour chaque user story :** Pull Request relue par toi, tests verts, déployée, aucune erreur d'accessibilité détectée, specs mises à jour si la règle a changé.

### Lot 0 — Socle (taille M)

- **US0.1 Initialiser le projet.** Astro 6, TypeScript strict, Svelte, Biome, Vitest, Playwright.
  - `npm run dev`, `test` et `build` passent sur un projet vide.
  - La version de Node est fixée dans le dépôt.
- **US0.2 Intégration continue.** À chaque Pull Request : lint, types, tests, build, audit des dépendances.
  - Une Pull Request rouge ne peut pas être fusionnée.
- **US0.3 Déploiement.** Chaque fusion sur `main` met le site en ligne.
  - Le site est accessible publiquement moins de 5 min après la fusion.
- **US0.4 DA et gabarit.** Variables de couleur et de typo, thème sombre et clair, en-tête avec Courses, Quiz, WOD.
  - Le test de contraste passe sur toutes les combinaisons utilisées.
- **US0.5 Schémas de données.** Course, événement, exercice.
  - Un fichier de données invalide fait échouer le build avec un message qui nomme le champ fautif.
- **US0.6 Étude des sources de dates.** Pour chaque course : méthode possible (§6), robots.txt et conditions d'utilisation, exemple de données récupérées.
  - Un document `docs/sources-dates.md` fixe le nombre de courses automatisables et l'objectif révisé.
- **US0.7 Cadre de travail Claude Code.** `CLAUDE.md`, specs dans `docs/`, décisions D2 et D3 écrites en ADR.

### Lot 1 — Catalogue et dates (taille L, livrable seul)

- **US1.1** En tant que visiteur, je veux voir les 11 courses avec leur difficulté afin de comparer en un coup d'œil.
  - Les 11 fichiers de course sont remplis, chacun avec ses liens de règlement.
  - Les filtres et le tri se reflètent dans l'URL ; la liste s'affiche même sans JavaScript.
- **US1.2** En tant que visiteur, je veux comprendre pourquoi une course est notée 4/5 afin de faire confiance à la note.
  - Les notes sont calculées par une fonction testée ; HYROX Open solo donne 4/5 au global.
  - Chaque note affiche la donnée qui la justifie ; la page « Comment on note » existe.
- **US1.3** En tant que visiteur, je veux une fiche par course afin de savoir comment elle se déroule et où m'inscrire.
  - Les 7 blocs du §4 sont présents ; le lien d'inscription s'ouvre sur le site officiel.
- **US1.4** En tant que visiteur, je veux la prochaine date près de chez moi afin de planifier.
  - Les 3 prochaines dates en France et pays proches sont affichées, avec « Dates vérifiées le … ».
  - Une date passée n'apparaît jamais, même si la dernière reconstruction a échoué.
- **US1.5** En tant que mainteneuse, je veux que les dates se mettent à jour seules afin de ne pas tout ressaisir.
  - Un collecteur par source automatisable, testé sur des pages enregistrées (aucun appel réseau dans les tests).
  - Le workflow de nuit collecte, valide, applique le garde-fou, commite et redéploie.
  - Une source en panne ouvre un ticket GitHub et laisse les anciennes dates en place.
- **US1.6** En tant que mainteneuse, je veux corriger une date à la main afin de ne pas dépendre du collecteur.
  - Une entrée de `events-manual/` remplace la donnée collectée au prochain build.
- **US1.7** Page d'accueil : la promesse et l'entrée vers le catalogue.

### Lot 2 — Quiz (taille M)

- **US2.1** Moteur de scoring en TypeScript pur, coefficients en config.
  - Les profils de référence du §7 donnent le résultat attendu.
- **US2.2** En tant que débutant, je veux répondre à 7 questions simples afin d'être orienté sans connaître le jargon.
  - Une question par écran, barre de progression, retour possible, utilisable au clavier.
  - Terminé en moins de 90 secondes lors d'un test avec 3 personnes.
- **US2.3** En tant que débutant, je veux une course recommandée et la raison afin de passer à l'action.
  - Résultat conforme au §7 : recommandation, alternative conditionnelle, point d'attention, lien WOD, cas « moins de 40 % ».
  - L'URL du résultat redonne le même résultat.

### Lot 3 — Générateur de WOD et minuteur (taille L)

- **US3.1** Banque d'au moins 25 exercices, chacun avec ses alternatives, relue par toi.
- **US3.2** Générateur en TypeScript pur, piloté par une graine.
  - Sur 1 000 graines testées : time cap toujours respecté, au moins un exercice cardio et un de force, matériel respecté.
- **US3.3** En tant que pratiquant, je veux un WOD en 1 clic afin de m'entraîner sans réfléchir.
  - Bouton unique, verrous optionnels, « Relancer », lien de partage.
- **US3.4** En tant que pratiquant en salle, je veux un minuteur adapté au format afin de suivre ma séance téléphone posé.
  - 4 modes, décompte de 10 s, pause, compteur de tours, bips, vibration si possible, écran maintenu allumé.
  - Dérive inférieure à 1 s sur 20 min.
- **US3.5** Depuis une fiche course ou un résultat de quiz, le générateur s'ouvre pré-réglé.

### Lot 4 — Finitions (taille M)

- **US4.1 Référencement.** Titres et descriptions par page, plan du site, image de partage par course, balises schema.org `Event` sur les dates.
- **US4.2 Accessibilité.** Audit complet : 0 erreur axe, parcours au clavier, quiz et minuteur testés au lecteur d'écran.
- **US4.3 Performance.** Lighthouse mobile ≥ 95 en performance et accessibilité sur chaque type de page.
- **US4.4 Légal.** Mentions légales (éditeur et hébergeur, obligatoires en France) et page sources.
- **US4.5 Option.** Minuteur utilisable hors connexion (application web installable).

## 12. Travail en binôme avec Claude Code

Ce document reste la référence produit ; Claude Code travaille à partir d'une copie dans le dépôt et d'un fichier `CLAUDE.md` qui fixe les règles. Toi, tu arbitres et tu relis.

**Répartition des rôles :**

- **Ici (chat)** : vision, specs, décisions, revue d'un lot terminé, nouvelles fonctionnalités.
- **Claude Code (console)** : une user story à la fois, une branche et une Pull Request par user story, tests écrits avec le code.
- **Toi** : tu tranches les décisions, tu relis et fusionnes les Pull Requests, tu valides les données sportives (barème, exercices, alternatives).

**Ce que `CLAUDE.md` contiendra :** le résumé du §1, la stack et ses versions, l'arborescence du §10, les règles de durabilité, l'interdiction de mettre de la logique métier hors de `src/lib/`, la définition de « terminé », et la consigne de s'arrêter pour demander dès qu'une spec est ambiguë plutôt que d'inventer une règle.

**Boucle type pour une user story :**

1. Tu donnes à Claude Code l'identifiant de la story (ex. « US1.2 »).
2. Il relit la spec, propose son plan en quelques lignes, puis code et teste.
3. Il ouvre une Pull Request avec ce qui a changé et comment le vérifier.
4. Tu testes la prévisualisation, tu commentes ou tu fusionnes.
5. Si une règle a changé en route, on met à jour ce document.

## 13. Risques

| Risque | Effet | Parade |
| --- | --- | --- |
| Un site d'organisateur change sa structure | Les dates de cette course ne se mettent plus à jour | Garde-fou du §6, ticket automatique, saisie manuelle prioritaire |
| Les conditions d'utilisation d'un site interdisent la collecte | Source inutilisable | Vérification au Lot 0, passage en manuel |
| Les formats changent chaque saison (ATHX change ses workouts chaque année) | Barème et déroulé périmés | Champ `saison` dans chaque course, relecture à chaque nouvelle saison |
| Une note de difficulté semble fausse à un pratiquant | Perte de confiance | Données affichées avec chaque note, seuils ajustables en config |
| GitHub désactive la tâche de nuit après 60 jours sans activité | Plus aucune mise à jour | Écriture quotidienne de la date de vérification |
| Peu de dates de certaines courses en France | Résultats de quiz frustrants | Pénalité modérée plutôt qu'exclusion, pays proches inclus par défaut |
| Le minuteur s'arrête quand l'écran se verrouille | Séance gâchée | Maintien de l'écran allumé, temps recalculé depuis l'horloge au retour |

## 14. Sources

Recherche du 23/10/2026, à partir d'extraits de pages ; chaque format sera revérifié sur le règlement officiel au Lot 1.

- [HYROX France, calendrier saison 2026/27 (RoxRadar)](https://www.roxradar.com/hyrox-france)
- [DEKA STRONG, MILE et FIT : formats (Spartan, DEKA London West)](https://nl.spartan.com/nl/race/detail/10454/overview)
- [DEKA MILE : durée moyenne (Spartan)](https://uk.spartan.com/en/race/detail/10039/overview)
- [ATHX Games : format et dates en France (Ma Box de Cross)](https://maboxdecross.fr/blog/fitness/athx-games-la-nouvelle-competition-fitness-hybride-qui-monte)
- [ATHX : calendrier 2027 (Hybrid Fitness Media)](https://hybridfitnessmedia.com/?p=4829)
- [Deadly Dozen : format 12 × 400 m (site officiel)](https://www.deadlydozen.com/deadly-dozen-edinburgh)
- [The Hybrid Games : format 2026 (Farnborough)](https://www.farnborough.com/what-s-on/events/the-hybrid-games/)
- [Turf Games : format par équipe (Farnborough)](https://farnborough.com/what-s-on/events/turf-games-uk-winter-festival)
- [XENOM : 10 épreuves, Paris annoncé (BoxRox)](https://www.boxrox.com/?p=240818)
- [Astro 6 : sortie stable et Node 22 minimum (Tech Insider)](https://tech-insider.org/astro-tutorial-content-site-13-steps-2026/)
- [Calendrier de support Node.js 2026–2030 (DEV Community)](https://dev.to/mr_manushukla/one-nodejs-release-a-year-from-2027-what-the-node-27-lts-change-means-for-your-upgrade-cadence-2fo3)
- [GitHub : désactivation des tâches planifiées après 60 jours (documentation GitHub)](https://docs.github.com/en/enterprise-server@3.1/actions/managing-workflow-runs/disabling-and-enabling-a-workflow)
- [Svelte 5 et React 19 : taille du JavaScript envoyé (PkgPulse)](https://www.pkgpulse.com/guides/solidjs-vs-svelte-5-vs-react-reactivity-2026)
