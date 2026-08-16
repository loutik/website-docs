---
title: "Théorie - Proxmox VE"
description: "Cours et concepts fondamentaux autour de Proxmox VE."
sidebar:
  order: 1
---

## A. Présentation

Proxmox Virtual Environment (VE) est une plateforme open-source de gestion de virtualisation d'entreprise. Basée sur Debian, elle unifie au sein d'une même interface web la gestion des machines virtuelles (KVM), des conteneurs légers (LXC), du stockage défini par logiciel et de la configuration réseau. C'est la fondation qui permet de découper un serveur physique en de multiples environnements isolés.

:::note
Dans une infrastructure comme LoutikCLOUD, Proxmox VE agit comme le chef d'orchestre matériel. Il fournit la couche de calcul brute sur laquelle reposent ensuite les services, les routeurs virtuels et les orchestrateurs de plus haut niveau.
:::

## B. Problématiques résolues

* **Consolidation matérielle et gestion unifiée :** Évite la prolifération de serveurs physiques sous-utilisés. Proxmox rassemble la gestion des VM (lourdes) et des conteneurs (légers) sous une seule API[^1] et interface web, optimisant drastiquement les ressources.
* **Haute disponibilité[^2] et résilience :** Face aux pannes matérielles (comme une défaillance de disque dur), Proxmox permet de lier plusieurs nœuds en cluster. Si une machine tombe, les services peuvent migrer à chaud vers un autre nœud.

## C. Fonctionnement

La force de Proxmox VE réside dans sa fondation Debian standard enrichie d'un noyau personnalisé et d'un système de fichiers distribué. Il ne s'agit pas d'une boîte noire, mais d'un assemblage robuste d'outils Linux éprouvés.

* **KVM (Kernel-based Virtual Machine) :** Hyperviseur permettant la virtualisation complète. Il simule le matériel pour exécuter des systèmes invités totalement isolés disposant de leur propre noyau (idéal pour des routeurs ou des appliances spécifiques).
* **LXC (Linux Containers) :** Virtualisation au niveau du système d'exploitation. Les conteneurs partagent le noyau de l'hôte, offrant des performances quasi-natives et une très faible consommation de RAM/CPU.
* **pmxcfs (Proxmox Cluster File System) :** Système de fichiers distribué (via Corosync) qui réplique instantanément les fichiers de configuration sur l'ensemble des nœuds d'un cluster, garantissant une cohérence d'état.

:::tip[Cluster Proxmox]
Un cluster regroupe plusieurs serveurs physiques (nœuds) sous une seule interface pour qu'ils agissent ensemble. Le pilier central de ce regroupement est le **quorum**[^3]. C'est la règle de la majorité absolue : pour que le cluster accepte d'écrire des données ou de modifier des configurations, plus de la moitié des nœuds doivent être en ligne et d'accord. Cela protège l'infrastructure contre le redouté "split-brain"[^4] en cas de coupure réseau.
:::

## D. Exemples

* **Déploiement de nœuds d'orchestration :** Provisionnement rapide d'un ensemble de machines virtuelles pour faire tourner un cluster Kubernetes léger (K3s), permettant de déployer ensuite des applications conteneurisées.
* **Routeur virtuel et segmentation réseau :** Hébergement d'une machine virtuelle OPNsense jouant le rôle de pare-feu principal, gérant directement les interfaces virtuelles et isolant les flux via des VLANs[^5] directement depuis l'hyperviseur.

## E. Bonnes pratiques

| Règle | Catégorie | Justification |
| :--- | :--- | :--- |
| **Isoler le réseau d'administration (VLAN dédié)** | Sécurité | Empêche tout accès non autorisé à l'interface web et à l'API depuis les réseaux invités ou utilisateurs, limitant drastiquement la surface d'attaque. |
| **Automatiser via Proxmox Backup Server (PBS)** | Maintenance | Garantit des sauvegardes incrémentales[^6], dédupliquées[^7] et chiffrées, avec des politiques de rétention strictes pour se prémunir d'un sinistre majeur. |
| **Privilégier LXC par défaut pour les services Linux** | Performance | Réduit l'empreinte mémoire et processeur (overhead[^8]) pour les applications standards (bases de données, serveurs web) par rapport à des machines virtuelles complètes. |

[^1]: **API** : Interface qui permet à différents logiciels de communiquer et d'échanger des données automatiquement.
[^2]: **Haute disponibilité (HA)** : Capacité d'une infrastructure à rester en ligne et accessible, même lorsqu'une panne physique survient.
[^3]: **Quorum** : Le nombre minimum de serveurs (la majorité) qui doivent être actifs et connectés pour prendre des décisions fiables et valider le fonctionnement du cluster.
[^4]: **Split-brain** : "Cerveau divisé". Une situation critique où un cluster est coupé en deux par une panne réseau et où chaque moitié tente de prendre le contrôle, risquant de corrompre les données.
[^5]: **VLAN** : Réseau local virtuel. Une technologie réseau permettant de séparer et d'isoler logiquement plusieurs groupes de machines sur un même câble ou équipement physique.
[^6]: **Sauvegarde incrémentale** : Méthode de sauvegarde qui ne copie que les fichiers ou les blocs de données ayant été modifiés depuis la sauvegarde précédente, ce qui est très rapide.
[^7]: **Déduplication** : Mécanisme qui repère et supprime les données identiques copiées plusieurs fois afin d'économiser massivement de l'espace de stockage sur les disques.
[^8]: **Overhead** : La consommation de ressources (CPU, RAM) purement liée au fonctionnement du système de virtualisation lui-même, et non à l'application qui tourne.