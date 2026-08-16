---
title: "Pratique - Proxmox Backup Server"
description: "Déploiement, architecture et retour d'expérience sur l'intégration de Proxmox Backup Server dans l'infrastructure LoutikCLOUD."
sidebar:
  order: 3
---

## A. Contexte

Dans l'infrastructure LoutikCLOUD, la gestion des données persistantes est une priorité absolue. J'ai donc déployé Proxmox Backup Server (PBS) sous forme de machine virtuelle (VM) sur mon hyperviseur. Assignée au réseau dédié aux sauvegardes (VLAN 16), cette machine dispose d'un disque système et d'un second disque virtuel de 400 Go formaté en `ext4` agissant comme *Datastore* (banque de données). Ce serveur centralise deux flux distincts : la sauvegarde classique des machines virtuelles complètes, et la sauvegarde granulaire des configurations de services (comme OPNsense ou PostgreSQL) orchestrée par Ansible.

## B. Architecture

L'architecture de sauvegarde repose sur la célèbre règle du "3-2-1" et sur le principe de découplage (séparer le système de sa configuration). J'ai mis en place une double externalisation : une sauvegarde "chaude" sur le PBS local (pour la rapidité et la déduplication) et une sauvegarde "froide" sur un espace Nextcloud hébergé chez Infomaniak.

```text
       [ Infrastructure LoutikCLOUD ]
                     |
       +-------------+-------------+
       |                           |
[ Hyperviseurs PVE ]          [ Services ]
(Sauvegarde globale)     (OPNsense, PostgreSQL)
       |                           |
       | API Token / TLS           | Orchestration Ansible
       |                           |
       v                           v
+---------------------------------------------+
|    PROXMOX BACKUP SERVER (Local - Chaud)    |
|    - Déduplication à la source              |
|    - Rétention : 7 jours                    |
|    - Datastore : backups-loutikcloud        |
+---------------------------------------------+
                                   |
                                   | Rclone (WebDAV)
                                   |
                                   v
+---------------------------------------------+
|    NEXTCLOUD INFOMANIAK (Cloud - Froid)     |
|    - Archive brute (fichiers / dumps)       |
|    - Rétention : 7 jours                    |
|    - Protocole : HTTPS / WebDAV             |
+---------------------------------------------+

```

:::note
Cette topologie permet une flexibilité totale. Si je perds une VM entière, je restaure depuis PBS. Si je perds l'hyperviseur physique (et donc mon PBS local), je peux reconstruire mes services vitaux (comme le routeur) en récupérant simplement le fichier de configuration XML stocké sur le Nextcloud externe.
:::

## C. Déploiement

Le déploiement combine des actions manuelles critiques pour le stockage et une automatisation poussée via Ansible pour la collecte des données.

* **Initialisation du PBS et liaison Proxmox :** Après l'installation via l'ISO officielle, j'ai formaté le disque de 400 Go en `ext4` et créé le datastore `backups-loutikcloud`. Ensuite, j'ai généré un jeton d'API[^1] (API Token) et récupéré l'empreinte cryptographique TLS (Fingerprint). J'ai déclaré ces informations dans mon cluster Proxmox VE. Cela permet à l'hyperviseur de lancer des *Backup Jobs* (tâches planifiées) toutes les nuits en mode `snapshot`[^2], sauvegardant les VMs à chaud, sans interruption de service.
* **Sauvegardes applicatives via Ansible et WebDAV :** Pour les services critiques (OPNsense, PostgreSQL), j'utilise Ansible. Mon orchestrateur extrait la configuration (via API ou `pg_dump`), puis l'expédie simultanément vers deux cibles :
1. Vers le PBS local via l'outil en ligne de commande `proxmox-backup-client` (qui déduplique[^3] les données).
2. Vers mon Nextcloud distant via l'outil Rclone en utilisant le protocole WebDAV[^4]. Les mots de passe d'application Nextcloud sont obscurcis (chiffrés) et injectés dynamiquement pour garantir la sécurité.



## D. Difficultés

Lors de la mise en place, quelques ajustements architecturaux ont été nécessaires pour fiabiliser les transferts et la gestion du stockage :

* **Saturation rapide du Datastore PBS :** Au bout de quelques semaines, mon disque virtuel de 400 Go s'est rempli, bloquant les nouvelles sauvegardes. Le problème venait de l'absence de nettoyage automatisé. J'ai résolu cela en intégrant une tâche de purge (Pruning) dans mes playbooks Ansible (`proxmox-backup-client prune --keep-last 7`) et en planifiant un *Garbage Collection*[^5] régulier sur PBS pour effacer physiquement les blocs de données orphelins.
* **Instabilité des transferts WebDAV (Timeout) :** Lors de l'envoi de gros fichiers de sauvegarde vers Nextcloud via Rclone, la connexion sautait parfois, faisant échouer la tâche Ansible. En analysant la documentation Rclone, j'ai corrigé le problème en ajoutant l'argument `--vfs-cache-mode writes` lors des montages. Cela permet à Rclone de mettre le fichier en cache localement avant de l'expédier de manière asynchrone et sécurisée vers le cloud, lissant ainsi les micro-coupures réseau.

---

[^1]: **Jeton d'API (API Token)** - Une clé secrète générée par un logiciel (ici PBS) qui permet à un autre système (comme Proxmox VE ou Ansible) de s'authentifier et d'exécuter des actions sans avoir besoin d'utiliser un mot de passe humain.
[^2]: **Snapshot** - Une "photographie" instantanée de l'état d'un disque dur virtuel. Cela permet de sauvegarder une machine en cours de fonctionnement sans devoir l'éteindre, car la sauvegarde s'effectue sur l'état figé par le snapshot.
[^3]: **Déduplication** - Mécanisme intelligent qui découpe les fichiers en petits morceaux. Si le serveur de sauvegarde possède déjà un morceau identique (ex: un fichier système de Linux), il ne le transfère pas et ne le stocke pas une seconde fois, économisant drastiquement l'espace disque.
[^4]: **WebDAV** - Une extension du protocole web classique (HTTP/HTTPS) qui permet de transformer un serveur distant (comme Nextcloud) en un disque dur virtuel sur lequel on peut lire, écrire et modifier des fichiers.
[^5]: **Garbage Collection (Ramasse-miettes)** - Un processus de maintenance interne à PBS qui scanne les disques durs pour trouver et supprimer définitivement les morceaux de données qui n'appartiennent plus à aucune sauvegarde valide.