---
title: "Théorie - Sauvegarde WebDAV (Nextcloud)"
description: "Cours et concepts fondamentaux autour de la sauvegarde hors site via WebDAV sur Nextcloud."
sidebar:
  order: 1
---

## A. Présentation

La sauvegarde WebDAV vers Nextcloud est une stratégie d'externalisation des données critiques. Concrètement, cela consiste à utiliser un protocole standard d'Internet (WebDAV) pour envoyer de manière sécurisée des copies de vos serveurs locaux vers un espace de stockage situé dans le cloud (ici, une instance Nextcloud). L'objectif est d'avoir un "plan B" robuste, totalement indépendant physiquement et géographiquement de votre infrastructure principale LoutikCLOUD.

:::note
Dans le jargon, on appelle cela du "stockage hors site" (off-site backup). Si un sinistre grave survient localement (incendie, vol, inondation, cyberattaque destructrice), vos données restent saines et sauves ailleurs.
:::

## B. Problématiques résolues

* **Vulnérabilité aux sinistres locaux :** Résout le risque de perte totale des données si le matériel physique du homelab est détruit ou volé. L'outil permet d'appliquer la fameuse règle d'or du "3-2-1" en informatique (au moins une copie à l'extérieur).
* **Dépendance aux solutions propriétaires :** Évite de s'enfermer dans un écosystème de sauvegarde fermé. WebDAV est un standard universel et open-source ; n'importe quel système (Linux, Windows, routeurs) sait communiquer avec lui sans nécessiter de logiciels coûteux ou complexes.

## C. Fonctionnement

Le processus repose sur un dialogue asynchrone entre un outil d'expédition local (souvent un utilitaire en ligne de commande comme Rclone[^1]) et le serveur de réception cloud. Le serveur local prépare l'archive de sauvegarde, ouvre un tunnel sécurisé vers le cloud, et utilise les commandes étendues du web pour y déposer le fichier.

* **Le protocole WebDAV[^2] :** C'est le transporteur. C'est une simple extension du langage classique du web (HTTP/HTTPS) qui permet non plus seulement de *lire* des pages, mais aussi de *créer, modifier ou déplacer* des fichiers directement sur un serveur distant.
* **Le point de terminaison (Nextcloud) :** C'est le coffre-fort de destination. Il reçoit les requêtes WebDAV, stocke les fichiers sur ses propres disques de manière organisée, et gère les droits d'accès.

## D. Exemples

* **Externalisation des configurations vitales :** Chaque nuit, le routeur OPNsense génère un fichier XML contenant toutes ses règles de sécurité. Un script l'expédie via WebDAV sur le Nextcloud distant. En cas de panne matérielle du routeur, la configuration peut être retéléchargée depuis le cloud depuis n'importe quel ordinateur pour remonter l'infrastructure.
* **Sauvegarde "à froid" des bases de données :** Les sauvegardes (dumps) de la base de données PostgreSQL de l'infrastructure sont chiffrées localement puis envoyées sur Nextcloud. Ces archives "froides"[^3] sont conservées pour une longue durée, au cas où une corruption de données ne serait détectée que plusieurs mois plus tard.

## E. Bonnes pratiques

| Règle | Catégorie | Justification |
| :--- | :--- | :--- |
| **Chiffrement côté client** | Sécurité | Les données doivent impérativement être chiffrées (verrouillées avec une clé secrète) *avant* de quitter l'infrastructure locale. Ainsi, même si le serveur cloud Nextcloud est compromis, les fichiers y seront illisibles. |
| **Utilisation de mots de passe d'application** | Sécurité | Il ne faut jamais utiliser le mot de passe de votre compte administrateur principal pour configurer la sauvegarde. Créez un jeton d'accès (token) dédié uniquement à cette tâche, qui pourra être révoqué instantanément en cas de fuite. |
| **Rétention et rotation (Pruning)** | Maintenance | L'espace cloud coûte cher. Il faut automatiser la suppression des sauvegardes les plus anciennes (ex: garder les 7 derniers jours et les 4 dernières semaines) pour éviter que le stockage Nextcloud n'arrive à saturation et bloque les futures sauvegardes. |

---

[^1]: **Rclone** - Un programme informatique très puissant, comparable à un couteau suisse, qui permet de synchroniser et de transférer des fichiers entre votre ordinateur et plus de 40 fournisseurs de stockage cloud différents.
[^2]: **WebDAV (Web Distributed Authoring and Versioning)** - Une technologie standard qui transforme un serveur web (Internet) en un disque dur réseau classique. On peut y copier/coller des fichiers comme sur une clé USB.
[^3]: **Stockage à froid (Cold Storage)** - Un espace de stockage destiné aux données que l'on n'a presque jamais besoin de lire ou de modifier au quotidien, mais que l'on doit conserver précieusement sur le long terme au cas où (les archives).