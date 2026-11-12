# Ϯⲣⲟⲙⲡⲓ · Ti rompi

**Ti rompi** (« l'année » en copte) est un calendrier copte orthodoxe pour le téléphone et l'ordinateur.

- Dates **coptes et grégoriennes** côte à côte, vues Jour, Semaine, Mois et Année
- **Grand Carême, Semaine sainte, jeûnes** (Ninive, Apôtres, Vierge, Nativité, mercredis et vendredis) et **fêtes**, avec un code couleur
- **Veille liturgique** : le jour copte commence au coucher du soleil, calculé selon la ville
- **Synaxaire** du jour et lien vers les lectures sur [Katameros](https://katameros.app/fr/)
- **Rites du Service du diacre** pour chaque période et chaque fête, avec les mots coptes dans leur police
- **Ma paroisse** : les 15 paroisses du diocèse copte orthodoxe de Paris, leurs saints patrons et leurs fêtes patronales
- **Événements personnels**, recherche intelligente, français et arabe, thème sombre et clair
- **Export vers le calendrier du téléphone** (.ics) avec les rappels de jeûnes et de fêtes déjà réglés
- **Fonctionne hors connexion** et s'installe sur l'écran d'accueil

## Utiliser l'application

Ouvrir le site dans Safari (iPhone) ou Chrome (Android), puis **Partager › Sur l'écran d'accueil**.

Les réglages, la paroisse choisie et les événements personnels restent enregistrés sur le téléphone : rien n'est envoyé ailleurs.

## Sources

- Synaxaire : titres repris de [Katameros](https://katameros.app/fr/)
- Rites : *Livre du service du diacre*
- Paroisses : [copte.fr](https://copte.fr/paroisses)
- Police copte : CS Avva Shenouda

## Structure

```
index.html            page de l'application
css/style.css         styles (thèmes sombre et clair)
js/moteur.js          calcul des dates coptes, de Pâques, des jeûnes et des fêtes
js/i18n.js            textes en français et en arabe
js/app.js             interface
data/                 synaxaire, rites, paroisses, icônes des saints
sw.js                 fonctionnement hors connexion
manifest.webmanifest  installation sur l'écran d'accueil
```
