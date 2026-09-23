# National League (Hockey) — plugin TRMNL

Affiche, pour un des 14 clubs de National League suisse : le logo, la place au
classement, le score du dernier match, et la date, l'heure et l'adversaire du
prochain. En français, allemand, italien et anglais.

Données : `https://www.nationalleague.ch/api/games`, qui renvoie toute la saison
de NL en JSON. Le classement n'existe pas comme endpoint public, il est
recalculé à partir des matchs terminés.

## Contenu

| Fichier | Où il va dans TRMNL |
| --- | --- |
| `settings.yml` | Page de paramètres du plugin (contient déjà les champs de formulaire) |
| `custom_fields.yml` | Le bloc Custom Fields seul, si tu le colles à la main |
| `author_bio.yml` | Le champ `author_bio` seul, pour la publication |
| `full.liquid` | Onglet Full |
| `half_horizontal.liquid` | Onglet Half horizontal |
| `half_vertical.liquid` | Onglet Half vertical |
| `quadrant.liquid` | Onglet Quadrant |
| `serverless.js` | Onglet Serverless, langage **Node** |
| `trmnl-national-league.zip` | Import direct : `settings.yml` + les quatre `.liquid` |

Le ZIP ne contient que ce que l'importateur de TRMNL accepte. `serverless.js`
se colle à part.

## Architecture

TRMNL récupère l'URL de polling **avant** d'exécuter la fonction Serverless et
lui passe le résultat en entrée. C'est ce mécanisme qui permet de dépasser la
limite de 100 Ko imposée aux réponses externes : la fonction est là pour réduire
un gros payload, pas pour aller le chercher elle-même. `run()` ne fait donc
aucun appel réseau, et les 5 secondes allouées ne servent qu'au calcul.

`resolveGames()` retrouve le tableau de matchs par sa forme, quel que soit le
nom que TRMNL lui donne — `data` pour une racine tableau, `IDX_0` si plusieurs
URLs de polling sont configurées.

## Installation

1. Plugins → Private Plugin → New, puis importe le ZIP.
2. Edit Markup → onglet Serverless → langage **Node** → colle `serverless.js`.
3. Choisis ton équipe et ta langue dans le formulaire.
4. Force Refresh. Active Debug Logs le temps des réglages : c'est le seul
   endroit où apparaissent les erreurs Node.

## Les quatre langues

Tous les libellés sont dans `STRINGS` en tête de `serverless.js`, et les noms de
club dans `TEAMS`. Les templates Liquid ne contiennent aucun texte en dur : il
n'y a qu'un fichier à toucher pour corriger un mot.

Le champ Langue propose « Automatique », qui suit `trmnl.user.locale` et retombe
sur le français si le compte est dans une langue non couverte. Le fuseau horaire
vient aussi du compte (`trmnl.user.time_zone_iana`), donc un utilisateur à
l'étranger voit l'heure de coup d'envoi chez lui, pas à Zurich.

Ce qui change selon la langue :

- Les clubs qui ont une forme officielle par langue : SC Bern / CP Berne,
  EHC Biel / HC Bienne, EV Zug / EV Zoug / EV Zugo, Fribourg / Freiburg /
  Friburgo, Genève / Genf / Ginevra.
- Les rangs : `2e`, `2.`, `2°`, `2nd`.
- Les prolongations : `ap` / `n.V.` / `dts` / `OT`, et les tirs au but
  `tab` / `n.P.` / `drig` / `SO`.
- Le format de date, via des tables maison. **Le VM Node de TRMNL tourne en
  small-icu** : `Intl` ne connaît que l'anglais et retombe dessus en silence
  pour toute autre locale. On ne lui demande donc que la conversion de fuseau.

Dans les descriptions de champs, l'anglais est le repli (`description`) et les
trois langues nationales sont des surcharges (`description-fr`, `-de`, `-it`).

## Le classement

Points : victoire 3, victoire en prolongation ou aux tirs au but 2, défaite en
prolongation ou aux tirs au but 1, défaite 0.

Tri : points d'abord, puis à égalité le nombre de matchs joués, puis la
différence de buts, puis les buts marqués. Vérifié contre le classement officiel
après la 3e journée 2026-27, les 14 rangs concordent. Les départages complets de
la ligue incluent aussi les confrontations directes, que je n'ai pas
implémentées : un écart d'un rang reste possible entre deux équipes à égalité
parfaite.

Les matchs amicaux (`isExhibition`) et les adversaires étrangers sont exclus, et
la saison démarre au 1er juillet.

## Le logo

Le champ logo de l'API n'est pas documenté. `logoFrom()` cherche n'importe
quelle clé du match contenant `logo` côté `home`/`away` et renvoie la première
URL trouvée. Le champ **Logo (URL)** du formulaire permet de forcer la sienne,
et sans rien le plugin affiche le code de l'équipe en gros.

L'écran est en noir et blanc : un logo contrasté sur fond transparent ou blanc
rend bien mieux qu'un logo en couleurs. La classe `image-dither` est déjà posée.

## TRMNL X et portrait

TRMNL X fait 1040×780, et le portrait inverse les deux. Les demi-vues changent
donc beaucoup de proportions :

| Vue | OG paysage | X paysage | X portrait |
| --- | --- | --- | --- |
| half_horizontal | 760×210 | 992×354 | 732×484 |
| half_vertical | 370×440 | 484×732 | 354×992 |

`half_horizontal` gagne surtout de la hauteur en portrait et perd de la largeur.
Le classement y apparaît en `lg:flex lg:portrait:hidden`, donc en X paysage
seulement — en portrait, quatre colonnes tomberaient à 183px chacune. Le
portrait utilise sa hauteur autrement, avec la grille gagnés/perdus/différence,
le résultat en toutes lettres et la patinoire, tous en
`hidden lg:portrait:visible`.

`half_vertical` devient étroit et très haut. Le classement y apparaît en
`hidden lg:visible`, avec les noms complets en X paysage et les codes d'équipe
en portrait, où la colonne des matchs joués est masquée.

## Publication

Le champ `author_bio` sert de page publique du recipe. Il porte la catégorie
`sports` et le lien GitHub comme moyen de contact — TRMNL en exige au moins un.

Chaque installation ira chercher toute la liste des matchs une fois par heure.
Si le plugin prend, un petit cache intermédiaire (Cloudflare Worker, Val Town)
serait plus correct vis-à-vis de nationalleague.ch : l'URL de polling
deviendrait `https://ton-worker.dev/?team={{ team }}` et la fonction Serverless
n'aurait presque plus rien à faire.

## Développement local

`trmnlp` permet de prévisualiser sans pousser à chaque fois. Il exécute
`transform.js` avec son propre Node, comme le runtime hébergé — renomme
`serverless.js` en `transform.js` dans ce cas.
