---
title: "Choix - Proxmox Backup Server"
description: "Explication et justification du choix technique de Proxmox Backup Server au sein de LoutikCLOUD."
sidebar:
  order: 2
---

## A. Contexte

La pérennité d'un homelab comme LoutikCLOUD repose entièrement sur la fiabilité de ses sauvegardes. Actuellement, je dispose d'un serveur physique Proxmox dédié spécifiquement à la sauvegarde et à l'hébergement des données persistantes. Pour isoler proprement le service, j'ai alloué une machine virtuelle dotée de 50 Go pour le système d'exploitation et d'un disque de 500 Go pour le stockage des archives.

Le défi est double : je dois pouvoir sauvegarder de manière transparente des machines virtuelles entières (VMs), mais également des fichiers plus granulaires comme des configurations brutes ou des sauvegardes de bases de données (dumps[^1]). L'espace de 500 Go étant relativement limité pour des sauvegardes régulières, le futur outil doit impérativement optimiser le stockage. Enfin, dans une logique DevSecOps, la solution doit s'intégrer à mon écosystème Linux (Debian) et être entièrement pilotable par le code.

## B. Cahiers des charges

| ID | Type | Exigence | Description |
| :--- | :--- | :--- | :--- |
| **[REQ-F01]** | Fonctionnel | Polyvalence des cibles | Capacité à sauvegarder à la fois des machines virtuelles complètes (blocs) et des fichiers/dossiers isolés (configurations, dumps). |
| **[REQ-F02]** | Fonctionnel | Déduplication avancée | Mécanisme de déduplication[^2] performant pour maximiser la rétention des données sur le disque restreint de 500 Go. |
| **[REQ-T01]** | Technique | Compatibilité Debian/Linux | L'outil doit s'installer nativement sur une base Debian ou Linux pour respecter les standards de l'infrastructure. |
| **[REQ-T02]** | Technique | API et Automatisation | Présence d'une API REST[^3] complète permettant le provisionnement et la gestion des tâches via Ansible. |
| **[REQ-T03]** | Technique | Sauvegardes incrémentielles | Support natif des sauvegardes incrémentielles[^4] pour réduire la consommation de bande passante et le temps de traitement. |

## C. Les solutions du marché

### C.1. Présentations des solutions

#### C.1.1. Proxmox Backup Server (PBS)
* **Présentation générale :** Solution open-source de sauvegarde d'entreprise, développée par l'éditeur de Proxmox VE. Elle est basée sur Debian.
* **Fonctionnement :** Utilise une architecture client-serveur avec une déduplication agressive à la source et un système de "chunks" (morceaux de données) chiffrés.
* **Profil :** Administrateurs et DevSecOps gérant des clusters Proxmox VE, cherchant une intégration native et une optimisation drastique du stockage.

#### C.1.2. Veeam Backup & Replication (Community Edition)
* **Présentation générale :** Le leader mondial propriétaire de la sauvegarde en entreprise, offrant une version communautaire gratuite jusqu'à 10 charges de travail.
* **Fonctionnement :** Agit comme un orchestrateur central puissant capable de s'interfacer avec presque tous les hyperviseurs et systèmes d'exploitation du marché.
* **Profil :** Entreprises et environnements fortement hétérogènes (Windows/Linux, VMware/Hyper-V) cherchant une solution "tout-en-un" avec support professionnel.

#### C.1.3. Restic / BorgBackup
* **Présentation générale :** Outils open-source en ligne de commande, réputés pour leur rapidité, leur sécurité et leur légèreté.
* **Fonctionnement :** Se basent sur la déduplication au niveau des fichiers et des blocs de fichiers, poussant les données chiffrées vers des stockages locaux ou cloud.
* **Profil :** Développeurs et sysadmins cherchant à sauvegarder des fichiers, des conteneurs ou des bases de données avec une très faible empreinte système.

### C.2. Comparatifs des solutions

| Exigence | Proxmox Backup Server | Veeam (Community) | Restic / BorgBackup |
| :--- | :--- | :--- | :--- |
| **[REQ-F01 (VMs & Fichiers)]** | Validé (via Proxmox Backup Client) | Validé | Évaluation (Excellent pour fichiers, inadapté pour VMs à chaud) |
| **[REQ-F02 (Déduplication)]** | Validé (Excellente à la source) | Validé | Validé (Très performante) |
| **[REQ-T01 (Debian/Linux)]** | Validé (Base Debian native) | Non validé (Le serveur principal nécessite Windows) | Validé |
| **[REQ-T02 (API & Ansible)]** | Validé (API exhaustive) | Validé (API disponible) | Évaluation (Pas d'API web, uniquement CLI) |
| **[REQ-T03 (Incrémentiel)]** | Validé (Incrémentiel natif et rapide) | Validé | Validé |

## D. Solution proposée

La solution proposée pour l'infrastructure est **Proxmox Backup Server (PBS)**.

PBS coche absolument toutes les cases pour LoutikCLOUD. Installé sur la machine virtuelle Debian dédiée (avec ses 50 Go d'OS et 500 Go de stockage), il s'intègre nativement, en quelques clics, à l'hyperviseur Proxmox VE de production. Cette synergie permet des sauvegardes incrémentielles de VMs extrêmement rapides. De plus, pour répondre au besoin de sauvegarder des dumps de bases de données ou des fichiers de configuration, PBS met à disposition le `proxmox-backup-client`. Cet utilitaire en ligne de commande s'installe sur n'importe quel conteneur ou machine Linux et permet de pousser des fichiers isolés directement vers le serveur PBS, tout en bénéficiant de la même déduplication puissante. L'intégralité de cette plateforme expose une API REST riche, ce qui m'a permis d'automatiser sa configuration et la création de ses "datastores" via Ansible.

**Justification du rejet des solutions alternatives :**

* **Veeam Backup & Replication :** Bien qu'il s'agisse d'une solution exceptionnellement puissante, son architecture impose que le serveur de gestion principal tourne sous Windows Server. Cela rompt totalement ma contrainte technique (REQ-T01) d'un écosystème 100% Linux/Debian. De plus, sa consommation en ressources (RAM/CPU) serait démesurée pour un simple homelab.
* **Restic / BorgBackup :** Ce sont d'excellents outils que j'utilise parfois pour des sauvegardes locales de fichiers. Cependant, ils ne sont pas conçus pour interagir nativement avec l'hyperviseur Proxmox VE pour réaliser des sauvegardes à chaud de machines virtuelles. Il aurait fallu scripter manuellement l'arrêt, le snapshot et l'export des VMs, ce qui ajoute une complexité de maintenance inutile et un risque d'erreur important là où PBS gère cela de manière native.

---

[^1]: **Dump** : Une copie brute de l'intégralité des données contenues dans une base de données à un instant T, généralement sous la forme d'un gros fichier texte lisible ou compressé.
[^2]: **Déduplication** : Technologie d'optimisation qui analyse les données lors de la sauvegarde. Si un même bloc de données (ex: les fichiers de base de Linux) est détecté sur plusieurs machines, il n'est écrit qu'une seule fois sur le disque physique pour économiser de la place.
[^3]: **API REST** : Une interface de programmation qui permet à des scripts ou des logiciels de communiquer avec le serveur (pour le configurer ou lancer des actions) en utilisant des requêtes web standards (HTTP).
[^4]: **Sauvegarde incrémentielle** : Une méthode de sauvegarde intelligente qui, après une première copie complète, ne va sauvegarder que les données qui ont été modifiées ou ajoutées depuis la veille, permettant de gagner énormément de temps et de ressources réseau.