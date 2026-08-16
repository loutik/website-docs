---
title: "Choix - OPNsense"
description: "Explication et justification du choix technique d'OPNsense au sein de LoutikCLOUD."
sidebar:
  order: 2
---

## A. Contexte

Au sein de l'infrastructure LoutikCLOUD, j'ai rapidement ressenti le besoin d'extraire le rôle critique de routeur et de pare-feu de mon hyperviseur Proxmox. Virtualiser son routeur principal crée une dépendance cyclique complexe (le fameux problème de l'œuf et de la poule lors des redémarrages de l'hyperviseur ou des maintenances matérielles). 

Pour garantir une haute disponibilité d'accès et une véritable ségrégation physique, j'ai fait le choix d'acquérir un équipement bare-metal[^1] dédié : un client léger HP T730. Ce matériel est équipé d'une carte réseau PCI Express Intel d'1 Gb/s et présente l'énorme avantage de consommer très peu d'électricité, un critère essentiel pour une machine destinée à tourner 24h/24 et 7j/7. Il me fallait ensuite choisir le système d'exploitation (OS) capable d'exploiter cette machine pour sécuriser et router le trafic de mon infrastructure de manière moderne, automatisable et robuste.

## B. Cahiers des charges

| ID | Type | Exigence | Description |
| :--- | :--- | :--- | :--- |
| **[REQ-F01]** | Fonctionnel | Filtrage et IPS[^2] | Capacité à bloquer activement le trafic illégitime en local via des listes de contrôle d'accès (ACL[^3]) et un système de prévention d'intrusion performant. |
| **[REQ-F02]** | Fonctionnel | Gratuité et pérennité | La solution doit être 100% gratuite (open-source de préférence) et bénéficier de mises à jour de sécurité très régulières. |
| **[REQ-T01]** | Technique | API REST native | Présence d'une API[^4] complète permettant l'automatisation totale des configurations et la gestion des sauvegardes (notamment via Ansible). |
| **[REQ-T02]** | Technique | Observabilité étendue | Possibilité d'exporter facilement des métriques de performance et de trafic vers des outils de supervision comme Prometheus ou Zabbix. |
| **[REQ-T03]** | Technique | Compatibilité x86 basse conso | L'OS doit être optimisé pour tourner sur une architecture standard (comme le HP T730) sans surcharger inutilement le processeur. |

## C. Les solutions du marché

### C.1. Présentations des solutions

#### C.1.1. OPNsense
* **Présentation générale :** Pare-feu et routeur open-source basé sur HardenedBSD. C'est un *fork* (une dérivation) de pfSense créé pour offrir une interface plus moderne et un code plus ouvert.
* **Fonctionnement :** Utilise un pare-feu *stateful* robuste, intègre Suricata pour la partie IPS, et propose une architecture modulaire basée sur des plugins.
* **Profil :** Orienté DevSecOps, administrateurs réseaux modernes et entreprises cherchant une plateforme ouverte, hautement automatisable via API.

#### C.1.2. pfSense (Community Edition)
* **Présentation générale :** La référence historique des pare-feux open-source, massivement déployée à travers le monde et soutenue par l'entreprise Netgate.
* **Fonctionnement :** Extrêmement stable et complet, il propose un écosystème de paquets très vaste pour étendre ses fonctionnalités (Snort, pfBlockerNG).
* **Profil :** Administrateurs réseaux traditionnels et entreprises cherchant une solution éprouvée avec une immense base de documentation.

#### C.1.3. OpenWRT
* **Présentation générale :** Projet open-source historique, extrêmement léger, conçu à l'origine pour remplacer les firmwares propriétaires des routeurs grand public.
* **Fonctionnement :** Axé sur la légèreté et la flexibilité, il se configure via l'interface web LuCI ou directement en ligne de commande via son système UCI.
* **Profil :** Bidouilleurs, environnements embarqués, points d'accès Wi-Fi et matériels avec de très faibles ressources matérielles (RAM/CPU).

#### C.1.4. VyOS
* **Présentation générale :** OS de routage open-source orienté entreprise, entièrement dépourvu d'interface graphique (GUI).
* **Fonctionnement :** Toute la configuration se fait via une ligne de commande unifiée (CLI) très puissante, inspirée du matériel Juniper.
* **Profil :** Ingénieurs réseaux purs et durs, déploiements cloud massifs où le routage BGP/OSPF prime sur l'interface visuelle.

### C.2. Comparatifs des solutions

| Exigence | OPNsense | pfSense (CE) | OpenWRT | VyOS |
| :--- | :--- | :--- | :--- | :--- |
| **[REQ-F01 (IPS & ACL)]** | Validé (Suricata natif) | Validé (Snort/Suricata) | Évaluation (Complexe à intégrer) | Évaluation (Moins intuitif) |
| **[REQ-T01 (API & Ansible)]** | Validé (API REST riche) | Non validé (Pas d'API native gratuite) | Validé (Via SSH/UCI) | Validé (Excellent support) |
| **[REQ-T02 (Supervision)]** | Validé (Plugins natifs) | Validé | Validé | Validé |
| **[REQ-F02 (Gratuit/À jour)]** | Validé | Évaluation (Modèle vers le payant) | Validé | Évaluation (Images LTS payantes) |

## D. Solution proposée

La solution proposée pour l'infrastructure est **OPNsense**.

Déployé sur le client léger HP T730, OPNsense remplit parfaitement son rôle de douanier physique pour l'ensemble du réseau LoutikCLOUD. Son intégration native de Suricata me permet d'activer un IPS performant qui inspecte les flux entrants et sortants pour couper net toute tentative de compromission détectée par ses signatures. 

Ce qui a définitivement fait pencher la balance en sa faveur, c'est son ouverture aux pratiques DevSecOps. Grâce à son API REST native, je peux orchestrer OPNsense avec Ansible sans avoir à "bidouiller" via SSH. C'est cette même API qui me permet d'automatiser l'extraction des sauvegardes de configuration au format XML pour les externaliser de manière sécurisée, assurant une reprise d'activité immédiate en cas de panne du HP T730. L'export des métriques vers ma stack d'observabilité locale se fait en quelques clics grâce aux plugins communautaires régulièrement mis à jour.

**Justification du rejet des solutions alternatives :**

* **pfSense :** Bien que ce soit une solution légendaire, l'absence d'une véritable API REST dans sa version communautaire (Community Edition) rendait l'automatisation de mes sauvegardes et configurations via Ansible beaucoup trop lourde et instable. De plus, la trajectoire récente de l'éditeur pousse de plus en plus vers la version payante (pfSense Plus).
* **OpenWRT :** C'est un OS fantastique pour des routeurs Wi-Fi limités en puissance, mais son écosystème n'est pas pensé en priorité pour héberger un moteur IPS complet et lourd (comme Suricata) sur une architecture x86. L'interface aurait demandé trop de personnalisations pour atteindre mes objectifs de sécurité.
* **VyOS :** Bien que son interface en ligne de commande unifiée soit un régal pour l'automatisation réseau, l'absence d'interface web rend le diagnostic rapide et la gestion visuelle des règles de pare-feu au quotidien moins pratique dans le cadre d'un homelab polyvalent où je suis le seul mainteneur.

---

[^1]: **Bare-metal** : Fait référence à un équipement informatique physique dédié, sur lequel le système d'exploitation est installé directement sur le matériel, sans couche de virtualisation intermédiaire.
[^2]: **IPS (Intrusion Prevention System)** : Un système de sécurité réseau qui analyse le trafic en temps réel pour détecter et bloquer automatiquement les activités malveillantes (comme les attaques informatiques ou les virus) avant qu'elles n'atteignent leur cible.
[^3]: **ACL (Access Control List)** : Une liste de règles de sécurité strictes définissant très précisément qui ou quoi a le droit d'entrer ou de sortir d'un réseau ou d'accéder à un service (ex: bloquer l'adresse IP X sur le port Y).
[^4]: **API (Application Programming Interface)** : Un pont logiciel qui permet à deux applications différentes de communiquer et d'échanger des données entre elles de manière automatisée, sans intervention humaine.