---
title: "Théorie - Kubernetes"
description: "Cours et concepts fondamentaux autour de Kubernetes."
sidebar:
  order: 1
---

## A. Présentation

Kubernetes (souvent abrégé K8s) est un orchestrateur de conteneurs[^1]. Son but principal est d'automatiser le déploiement, la gestion et la mise à l'échelle des applications conteneurisées. Au lieu de gérer chaque conteneur manuellement sur chaque serveur, vous confiez vos applications à Kubernetes, qui se charge de les faire tourner de manière fiable, même en cas de panne matérielle.

:::note
Dans un environnement comme LoutikCLOUD ou un homelab, nous utilisons souvent des distributions allégées (comme K3s) pour faire tourner nos clusters de manière optimisée, tout en conservant l'intégralité des fonctionnalités standards de Kubernetes.
:::

## B. Problématiques résolues

* **La tolérance aux pannes (Haute Disponibilité) :** Si un serveur physique vient à s'éteindre ou à crasher, Kubernetes détecte la perte et redémarre instantanément les applications concernées sur un autre serveur sain, sans intervention humaine.
* **La mise à l'échelle dynamique (Scalability) :** Face à un pic de trafic inattendu, l'outil peut multiplier instantanément les instances de l'application (les Pods[^2]) pour absorber la charge, puis les détruire automatiquement lorsque l'activité redevient normale.

## C. Fonctionnement

Kubernetes fonctionne sur une architecture déclarative maître/ouvrier. L'administrateur ne donne pas une suite de commandes à exécuter, mais déclare l'état final souhaité (via des fichiers YAML). Le système observe l'état actuel et agit en permanence pour qu'il corresponde à l'état souhaité.

* **Control Plane (Cerveau) :** C'est le centre de contrôle du cluster. Il prend les décisions globales (comme choisir sur quel serveur lancer un Pod) et détecte les anomalies.
* **Worker Node (Ouvrier) :** C'est un serveur (physique ou machine virtuelle) qui exécute réellement vos charges de travail.
* **Kubelet :** C'est le petit agent logiciel installé sur chaque Node. Il écoute les ordres du Control Plane et s'assure que les conteneurs tournent correctement sur sa machine.

## D. Exemples

* **Déploiement sans coupure (Rolling Update) :** Mettre à jour le code d'une application (ex: MyOpsAPI) vers une version plus récente sans que les utilisateurs ne s'en rendent compte. Kubernetes va remplacer les anciens conteneurs un par un par les nouveaux, en s'assurant qu'ils répondent avant de couper les anciens.
* **Résilience locale :** Héberger un reverse proxy et une base de données sur son infrastructure. Si le disque dur du serveur principal lâche, le cluster migre les services sur le serveur de secours en quelques secondes.

## E. Bonnes pratiques

| Règle | Catégorie | Justification |
| :--- | :--- | :--- |
| **Fixer les limites de ressources (Requests/Limits)** | Performance | Empêche un conteneur mal codé ou gourmand de consommer toute la RAM/CPU et de faire planter l'intégralité du nœud (effet "Noisy Neighbor"). |
| **Principe du moindre privilège (Non-Root)** | Sécurité | Exécuter les conteneurs avec un utilisateur standard. En cas de faille de sécurité dans l'application, l'attaquant n'aura pas les droits d'administrateur sur le serveur hôte. |
| **Approche GitOps[^3]** | Maintenance | Stocker absolument tous les manifestes YAML dans un dépôt Git. Toute modification de l'infrastructure est ainsi tracée, versionnée et facilement réversible en cas d'erreur. |

[^1]: **Conteneur :** Une enveloppe logicielle standardisée (comme Docker) qui contient une application et toutes ses dépendances, garantissant qu'elle fonctionnera de la même manière sur n'importe quel ordinateur.
[^2]: **Pod :** La plus petite unité de calcul gérée par Kubernetes. Un Pod enveloppe généralement un seul conteneur (parfois plusieurs s'ils sont très liés) et partage son stockage et son adresse réseau.
[^3]: **GitOps :** Pratique consistant à utiliser Git comme source unique de vérité pour l'infrastructure. Des outils (comme FluxCD) scrutent le dépôt Git et appliquent automatiquement les changements sur le cluster.