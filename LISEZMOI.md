# Footdex, nouvelle version (22 octobre 2026)

L'almanach du football de Raphaël, refait à partir du projet Grok du 21 octobre 2026.
Aucune donnée n'a été retirée : chaque ligne et chaque image de l'ancien projet est dans cette version.
Le détail du contrôle est dans `CONTROLE.txt`.

## Ce qu'il y a dans ce dossier

| Dossier | Contenu |
|---|---|
| `site/` | L'application prête à mettre en ligne. Un site statique : aucun serveur à faire tourner. |
| `source/app/src/` | Le code de l'application (React, TypeScript). |
| `source/app/site/` | Ce qui sert seulement au site hébergé ailleurs : copie hors ligne (`sw.js`), icônes, manifeste. |
| `source/tools/` | Les scripts : export des données, contrôle, construction, tests dans le navigateur. |
| `CONTROLE.txt` | Le rapport de contrôle : 42 vérifications sur les données, plus les tests dans le navigateur. |

## Mettre le site en ligne, gratuitement

Le plus simple : glisser le dossier `site` sur la page « Netlify Drop » (app.netlify.com/drop) dans un navigateur.
Netlify donne une adresse en https. Ouverte une fois avec internet, l'application se garde dans le téléphone
et s'ouvre ensuite sans réseau (sauf les vidéos YouTube). Dans Chrome sur Android : menu, puis
« Ajouter à l'écran d'accueil ».

Autres hébergeurs qui marchent de la même façon : GitHub Pages, Cloudflare Pages, Vercel.

## Où sont les données

Dans `site/data/` :

| Fichier | Contenu |
|---|---|
| `core.json` | Les 1 050 fiches de l'album (42 grandes fiches, 983 joueurs des effectifs, 25 ajoutés le 19 octobre), les matchs racontés, clubs, coupes, lexique, défi, saison 2026-2027 (36 clubs, 804 joueurs), notes du fichier Excel, page Certitude, mises à jour. |
| `people.json` | L'index des 25 229 joueurs des fichiers du jeu (EA Sports FC 24 de septembre 2023 et fichier du 19 septembre 2025). |
| `fc24-0.json` à `fc24-7.json` | Les 18 311 fiches EA Sports FC 24, toutes les colonnes, dont les 34 notes. |
| `faces-0.json` à `faces-7.json` | Les 15 954 visuels du jeu, octet pour octet (en base64). |
| `fc26-0.json` à `fc26-7.json` | Les 18 405 fiches du fichier du 19 septembre 2025. |
| `ligues.json` | Les 22 842 scores de Ligue 1 (depuis 1993) et de Ligue 2 (depuis 1997), avec mi-temps, tirs, corners, cartons quand le fichier les donne. |
| `pays-0.json` à `pays-3.json`, `pays-meta.json` | Les 49 945 matchs entre pays depuis 1872, avec buteurs et tirs au but. |
| `wiki.json` | La base Wikipédia de septembre 2026 (988 joueurs, 36 clubs), les 1 038 clubs recollés, le fichier collé des dix stars. |
| `card-doubts.json`, `reel-doubts.json` | Les liens mis de côté (voir plus bas). |

Les portraits libres (Wikimedia) sont dans `site/img/players/`, avec le crédit du photographe sur chaque fiche.

## Les liens mis de côté

En recoupant les noms, le contrôle a trouvé dix liens faux dans l'ancien projet : une fiche reliée à un autre
joueur qui a seulement le même prénom. Par exemple, la fiche d'Ousmane Ba montrait la photo et les notes
d'Ousmane Dembélé, et Lamine Yamal était donné à Auxerre, au numéro de Lamine Sy.

Ces liens ne sont **pas effacés** : ils restent dans les données. L'application ne les montre plus comme justes,
et la fiche concernée l'explique.

- Fiches de l'album : Lamine Sy, Aboubacar Lô, Alassane Sy, Ousmane Ba, Pape Sy.
- Clubs recollés : Lamine Yamal, Alassane Pléa, Ousmane Diomande, Pape Matar Sarr, Jota Silva.

## Les photos

- Les 79 portraits (44 grands, 35 petits) viennent de Wikimedia Commons, sous licence libre. Le crédit est sur la fiche.
- Les 15 954 visuels des fiches du jeu viennent d'un export public d'EA Sports FC 24. Ils ne sont pas libres de droits :
  ils vont pour un album personnel, pas pour une application publiée ou vendue.

## Reconstruire

Il faut Node 22, Python 3 (avec openpyxl) et le zip d'origine (`footdex-complet.zip`) décompressé.

```bash
cd source
npm install
node tools/dump-ts.mjs <projet d'origine>/src work/ts-current.json
node tools/extract-route-data.mjs <projet d'origine> work/route-data.json
python3 tools/build-data.py <projet d'origine> work app/public
python3 tools/verify-data.py <projet d'origine> work app/public
node tools/build-app.mjs
```

`build-app.mjs` produit `dist/site/` (ce dossier `site`) et `dist/artifact/` (la page publiée sur claude.ai).

## Le personnage et le terrain (versions 20 à 26)

| Fichier (`app/src/`) | Rôle |
|---|---|
| `mascot/Mascot.tsx` | Le personnage dans son coin : menu (double toucher), lancer au doigt, gravité du lancer (bobo / Médecin / jambe cassée). |
| `mascot/player.ts`, `mascot/footScenes.ts` | Le footballeur articulé et le ballon (un seul ballon, collé au pied, jongles sur la pointe de la chaussure, marche en boitant). |
| `mascot/visitor.ts` | Les visiteurs dessinés : le Médecin (sacoche, collier en métal) et l'Arbitre carré (sifflet, cartons). |
| `mascot/terrain.ts` | Les scènes : soins, sac du Médecin, remplaçant, visites de l'Arbitre, cartons (`faute()`), essai avec `?essai-terrain`. |
| `mascot/zombie.ts` | Le Zombie qui perd sa tête et ses bras : morceaux à remettre au doigt, sinon le Médecin vient. |
| `mascot/state.ts`, `mascot/VoicePicker.tsx` | Une voix et une hauteur par personnage, sélecteur simple pour enfant. |
| `maj/code.tsx`, `maj/temps-ecran.ts` | Code parent à 4 chiffres et limite de 45 minutes par jour. |
| `maj/nouveautes-liste.ts` | Le journal des nouveautés affiché après une mise à jour : ajouter la nouvelle version EN PREMIER. |
| `pages/jeux.tsx` | Les 10 jeux, avec la difficulté Facile / Normal / Difficile (retenue dans le téléphone). |

## L'application Android et ses mises à jour

Le dépôt GitHub `hadesdray-crypto/footdex` contient tout le code. À chaque envoi (push) sur `main`,
le robot « Application Android » (`.github/workflows/android.yml`) construit l'APK signé et le publie
dans les « Releases » (`android-N`, avec `footdex.apk` et `web.zip`). L'application installée voit la
nouvelle version et propose de la télécharger.

La signature utilise la clé `footdex.jks` (secrets `KEYSTORE_BASE64` et `KEYSTORE_PASSWORD` du dépôt).
Garder cette clé précieusement : sans elle, une nouvelle version ne peut pas remplacer l'ancienne sur le téléphone.

Le site GitHub Pages ne s'affichera qu'une fois réglé : dépôt > Settings > Pages > Source : « GitHub Actions ».
