---
title: "Choix - Kubernetes (K3s)"
description: "Explication et justification du choix technique de K3s et Kube-vip au sein de LoutikCLOUD."
sidebar:
    order: 2
---

## A. Contexte

Au sein de l'infrastructure LoutikCLOUD, le besoin d'orchestrer nos conteneurs de manière fiable et résiliente est devenu critique. L'objectif est de déployer un cluster Kubernetes hautement disponible sur nos trois hyperviseurs Proxmox.

Afin de garantir cette résilience, l'architecture prévoit trois nœuds *Control Plane*[^1] (un sur chaque nœud Proxmox pour assurer le *quorum*[^2]). Ces machines virtuelles disposent de ressources contraintes : 3 Go de RAM, 2 vCPU et 50 Go de stockage. Pour éviter de saturer ces ressources vitales, aucun *pod*[^3] applicatif ne devra y être exécuté. Enfin, l'accès à l'API du cluster doit être protégé par une VIP[^4] (10.0.12.6, résolue via `api.prd.k3s.infra.loutik.fr`). Le défi est de trouver un écosystème léger, capable de gérer cette VIP nativement, tout en restant simple à installer et à maintenir dans un environnement de type homelab.

## B. Cahiers des charges

| ID | Type | Exigence | Description |
| --- | --- | --- | --- |
| **[REQ-F01]** | Fonctionnel | Haute Disponibilité (Quorum) | La solution doit supporter un déploiement multi-maîtres sur 3 nœuds distincts pour tolérer la perte d'un hyperviseur. |
| **[REQ-F02]** | Fonctionnel | Gestion de la VIP API | Le système doit attribuer et basculer automatiquement l'adresse IP virtuelle (10.0.12.6) de l'API entre les nœuds maîtres. |
| **[REQ-T01]** | Technique | Empreinte mémoire réduite | Les composants doivent fonctionner de manière fluide et stable avec seulement 3 Go de RAM et 2 vCPU par nœud. |
| **[REQ-T02]** | Technique | Isolation des charges | Possibilité d'appliquer un *Taint*[^5] sur les nœuds maîtres pour interdire l'exécution de services applicatifs. |
| **[REQ-T03]** | Technique | Simplicité d'installation | Le déploiement et la maintenance doivent être adaptés à une gestion homelab, sans l'ingénierie d'un datacenter. |

## C. Les solutions du marché

### C.1. Présentations des solutions

#### C.1.1. K3s associé à Kube-vip

* **Présentation générale :** K3s est une distribution Kubernetes allégée et certifiée, créée par Rancher. Kube-vip est un outil réseau open-source fournissant de la haute disponibilité.
* **Fonctionnement :** K3s remplace les composants lourds par des alternatives légères (etcd optimisé ou base relationnelle). Kube-vip s'exécute sous forme de composant statique pour diffuser la VIP via le protocole ARP, garantissant que l'IP pointe toujours vers un nœud sain.
* **Profil :** Idéal pour l'Edge computing, l'IoT et les architectures homelab exigeantes.

#### C.1.2. Kubernetes Vanilla (Kubeadm) avec Keepalived & HAProxy

* **Présentation générale :** La distribution standard de Kubernetes, déployée avec l'outil officiel Kubeadm, couplée à des paquets Linux classiques de routage.
* **Fonctionnement :** Utilise tous les composants standards dans leur intégralité. La VIP est gérée en externe par un démon Keepalived, et le trafic de l'API est réparti par un load-balancer HAProxy installé sur chaque nœud.
* **Profil :** Orienté grandes entreprises avec des infrastructures massives et des équipes dédiées.

#### C.1.3. MicroK8s

* **Présentation générale :** Une distribution Kubernetes légère maintenue par Canonical (éditeur d'Ubuntu).
* **Fonctionnement :** S'installe via le gestionnaire de paquets Snap et propose un système d'extensions intégrées (add-ons) pour activer des fonctionnalités comme la haute disponibilité.
* **Profil :** Stations de travail des développeurs, appliances et déploiements rapides.

### C.2. Comparatifs des solutions

| Exigence | K3s + Kube-vip | Kubernetes Vanilla + Keepalived | MicroK8s |
| --- | --- | --- | --- |
| **[REQ-F01 (HA)]** | Validé | Validé | Validé |
| **[REQ-F02 (VIP API)]** | Validé (Natif via Kube-vip) | Validé (Mais nécessite des services externes) | Évaluation (Moins standardisé pour l'API) |
| **[REQ-T01 (Légèreté)]** | Validé | Non validé (Gourmand pour 3Go de RAM) | Évaluation (Performances correctes, mais lié à Snap) |
| **[REQ-T02 (Isolation)]** | Validé | Validé | Validé |
| **[REQ-T03 (Simplicité)]** | Validé | Non validé (Maintenance très complexe) | Validé |

## D. Solution proposée

La solution proposée pour l'infrastructure est le duo **K3s couplé à Kube-vip**.

Ce choix répond de manière chirurgicale aux contraintes de LoutikCLOUD. L'installation de K3s est extrêmement frugale, ce qui permet aux trois nœuds *Control Plane* de fonctionner confortablement avec leurs ressources limitées. L'architecture distribuée sur nos trois serveurs Proxmox (PVE1, PVE2, et le nœud de donnée PVE3) garantit un *quorum* robuste : la perte d'un hôte n'entraîne aucune coupure de service.

Pour la gestion de l'API, Kube-vip est configuré pour se déployer automatiquement lors de l'initialisation des maîtres. Il gère l'adresse VIP `10.0.12.6` (`api.prd.k3s.infra.loutik.fr`) de manière autonome par une élection d'ARP gratuit. Si le nœud maître actif devient indisponible, l'IP bascule sur un autre nœud en quelques millisecondes, de façon transparente.

Enfin, la flexibilité de K3s permet d'appliquer un *Taint* strict dès le déploiement. Cela garantit que nos deux nœuds *Workers* (répartis sur PVE1 et PVE2) absorberont 100% de la charge applicative, préservant la stabilité du *Control Plane*.

**Justification du rejet des solutions alternatives :**

* **Kubernetes Vanilla + Keepalived / HAProxy :** Rejeté principalement pour sa lourdeur. Les composants standards de Kubernetes consommeraient une part trop importante des 3 Go de RAM disponibles. De plus, la gestion d'une VIP via Keepalived et HAProxy en dehors du cycle de vie du cluster ajoute une complexité opérationnelle inutile pour un homelab.
* **MicroK8s :** Bien qu'intéressant pour sa simplicité, sa forte dépendance à l'écosystème Snap le rend moins universel pour l'apprentissage et l'administration système brute. De plus, le couplage K3s/Kube-vip offre un contrôle plus granulaire et standardisé sur le réseau du *Control Plane*.

---

[^1]: **Control Plane** : Le "cerveau" du cluster. Il prend les décisions globales (où planifier le travail, surveiller l'état des machines) mais n'héberge pas les applications elles-mêmes.
[^2]: **Quorum** : Le nombre minimum de serveurs actifs nécessaires (ici au moins 2 sur 3) pour que le système puisse valider des décisions et continuer à fonctionner correctement lors d'une panne matérielle.
[^3]: **Pod** : La plus petite unité de travail déployable dans Kubernetes. C'est une "capsule" qui enveloppe un ou plusieurs conteneurs d'application (comme des conteneurs Docker).
[^4]: **VIP (Virtual IP)** : Une adresse IP flottante qui n'est pas rattachée physiquement à une seule carte réseau. Elle peut basculer automatiquement d'un serveur à l'autre en cas de problème, assurant que le service reste joignable.
[^5]: **Taint (Tache)** : Une règle de configuration appliquée sur un serveur qui repousse les *Pods*, leur interdisant de s'y installer. Cela permet de réserver ce serveur uniquement aux processus essentiels du système (comme le *Control Plane*).