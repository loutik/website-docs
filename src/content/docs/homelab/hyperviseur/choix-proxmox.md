---
title: "Choix - Proxmox VE"
description: "Explication et justification du choix technique de Proxmox VE au sein de LoutikCLOUD."
sidebar:
  order: 2
---

## A. Contexte

Le laboratoire LoutikCLOUD repose sur un parc matériel hétérogène de récupération et d'optimisation. L'infrastructure physique se compose de deux machines de bureau HP ProDesk 400 G3 (processeur Intel Core i5-6500, 32 Go de RAM, 256 Go SSD + 500 Go HDD) et d'un ordinateur portable Dell Inspiron 15 3225 (processeur AMD Ryzen 5 5500U offrant 12 cœurs logiques, 16 Go de RAM, 256 Go SSD NVMe + 500 Go HDD). 

Le défi actuel est de transformer ces trois équipements physiques disparates en un environnement d'hébergement unifié, résilient et automatisable. L'objectif est de pouvoir déployer des services d'infrastructure à la volée (via de l'Infrastructure as Code) tout en maîtrisant totalement les coûts. Le besoin d'une solution *bare-metal*[^1] capable de lier ces trois machines est donc critique.

## B. Cahiers des charges

| ID | Type | Exigence | Description |
| :--- | :--- | :--- | :--- |
| **[REQ-F01]** | Fonctionnel | Gratuité | La solution ne doit nécessiter aucune licence payante pour débloquer ses fonctionnalités fondamentales. |
| **[REQ-F02]** | Fonctionnel | Support de Cloud-Init | Capacité à injecter automatiquement des configurations (clés SSH, réseau, utilisateurs) lors du premier démarrage d'une machine virtuelle. |
| **[REQ-T01]** | Technique | Fonctionnement en Cluster | Possibilité de regrouper les trois machines physiques sous une interface et une API de gestion uniques. |
| **[REQ-T02]** | Technique | Tolérance matérielle (HCL) | Le système doit accepter du matériel grand public (cartes réseau Realtek, chipsets de PC portables) sans exiger de matériel certifié serveur. |

## C. Les solutions du marché

### C.1. Présentations des solutions

#### C.1.1. Proxmox VE
* **Présentation générale :** Hyperviseur open-source basé sur la distribution Linux Debian. Il intègre nativement la virtualisation (KVM) et les conteneurs (LXC).
* **Fonctionnement :** Il s'installe directement sur le matériel physique et propose une interface web complète pour gérer le stockage, le réseau et la haute disponibilité.
* **Profil :** Très prisé dans l'écosystème *homelab*[^2] et chez les hébergeurs alternatifs pour sa flexibilité, son absence de bridage de licence et sa robustesse.

#### C.1.2. VMware vSphere (ESXi)
* **Présentation générale :** Le standard historique des entreprises. C'est une solution propriétaire et fermée (désormais gérée par Broadcom).
* **Fonctionnement :** Utilise un micro-noyau très optimisé mais très strict sur les pilotes matériels. La gestion en cluster nécessite un composant externe payant (vCenter).
* **Profil :** Orienté exclusivement vers le monde de l'entreprise (Corporate) avec des budgets de licences conséquents et du matériel certifié.

#### C.1.3. XCP-ng
* **Présentation générale :** Dérivé open-source du projet XenServer, soutenu par l'entreprise Vates.
* **Fonctionnement :** Repose sur l'hyperviseur Xen. Pour être exploité pleinement, il doit être couplé à "Xen Orchestra", une interface de gestion externe (fournie sous forme d'appliance ou à compiler soi-même).
* **Profil :** Orienté infrastructure d'entreprise et fournisseurs de cloud (IaaS), avec une volonté de proposer une alternative open-source sérieuse à VMware.

### C.2. Comparatifs des solutions

| Exigence | Proxmox VE | VMware ESXi | XCP-ng |
| :--- | :--- | :--- | :--- |
| **[REQ-F01 (Gratuité)]** | Validé (gratuit) | Non validé (Licences gratuites supprimées) | Évaluation (Gratuit, mais Xen Orchestra nécessite compilation) |
| **[REQ-F02 (Cloud-Init)]** | Validé (Support natif UI/API) | Évaluation (Complexe sans vCenter) | Évaluation (Nécessite l'interface Xen Orchestra) |
| **[REQ-T01 (Cluster)]** | Validé (Natif via Corosync) | Non validé (Nécessite vCenter payant) | Validé (Natif via Xen Orchestra) |
| **[REQ-T02 (Matériel)]** | Validé (Base Debian permissive) | Non validé (HCL très stricte, refusera le PC portable) | Validé (Base CentOS permissive) |

## D. Solution proposée

La solution proposée pour l'infrastructure est **Proxmox VE**.

Proxmox VE s'impose comme une évidence technique pour LoutikCLOUD. En s'appuyant sur un noyau Debian standard, il garantit la reconnaissance matérielle de nos machines HP ProDesk et du PC portable Dell, là où des hyperviseurs d'entreprise bloqueraient dès l'installation sur des pilotes réseau. Les trois nœuds (les deux HP et le Dell) seront rassemblés au sein d'un même **cluster**[^3] Proxmox. Cela permettra de centraliser l'administration sur une seule adresse IP et de gérer les ressources globales (le calcul CPU et le stockage SSD/HDD) de manière unifiée.

De plus, l'intégration native de **Cloud-init**[^4] dans l'interface de Proxmox s'aligne parfaitement avec notre approche d'automatisation. Il sera possible de déployer un *template* (modèle) de Debian, de lui attribuer une IP statique et des clés SSH à la volée, le tout piloté via des outils comme Terraform ou Ansible.

**Justification du rejet des solutions alternatives :**
* **VMware vSphere (ESXi) :** Rejeté catégoriquement. Broadcom a mis fin à la version gratuite (ESXi Free). De plus, son *HCL*[^5] extrêmement stricte aurait très certainement refusé de s'installer sur la carte réseau grand public du PC portable Dell. Enfin, la création d'un cluster nécessite un serveur vCenter, qui est une solution payante et lourde.
* **XCP-ng :** Rejeté pour des raisons de complexité architecturale dans notre contexte précis. Bien que la solution soit excellente, la gestion de Cloud-init et du clustering nécessite de déployer Xen Orchestra. Pour l'obtenir gratuitement avec toutes les fonctionnalités débloquées, il faut le compiler depuis les sources (XOA), ce qui ajoute une friction de maintenance inutile (mise à jour manuelle de l'orchestrateur) par rapport à l'approche "tout-en-un" native de Proxmox VE.

---

[^1]: **Bare-metal** : Traduit par "métal nu". Désigne un système d'exploitation ou un hyperviseur qui s'installe directement sur le matériel physique de l'ordinateur, sans passer par un système classique (comme Windows ou macOS) au préalable.
[^2]: **Homelab** : Un laboratoire informatique à domicile. C'est un environnement où les passionnés et professionnels de l'informatique hébergent des serveurs chez eux pour expérimenter, apprendre et auto-héberger des services.
[^3]: **Cluster** : Une "grappe" de serveurs. C'est le fait de relier plusieurs ordinateurs physiques ensemble via le réseau pour qu'ils se comportent comme un seul grand système unifié.
[^4]: **Cloud-init** : Un outil standardisé qui permet de configurer automatiquement une machine virtuelle lors de son tout premier démarrage (injection de mots de passe, clés de sécurité, configuration du réseau), évitant ainsi de devoir le faire à la main.
[^5]: **HCL (Hardware Compatibility List)** : Une liste très stricte tenue par les éditeurs de logiciels d'entreprise qui définit exactement quels composants électroniques sont autorisés et reconnus par leur système.