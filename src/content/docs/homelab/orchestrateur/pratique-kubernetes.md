---
title: "Pratique - Kubernetes (k3s)"
description: "Déploiement, architecture et retour d'expérience sur l'intégration de Kubernetes (k3s) dans l'infrastructure LoutikCLOUD."
sidebar:
  order: 3
---

## A. Contexte

L'orchestration de conteneurs est devenue incontournable pour garantir la scalabilité et la maintenabilité d'une infrastructure moderne. Dans le cadre de LoutikCLOUD, j'ai fait le choix d'intégrer Kubernetes via sa distribution allégée K3s. L'objectif est de disposer d'une plateforme robuste, capable d'héberger des services (comme LibreSpeed) tout en appliquant les principes DevSecOps à la lettre : automatisation complète, gestion déclarative de l'état via Git, et sécurité "by design". 

:::note[Bonnes Pratiques de Sécurité]
J'applique systématiquement le principe du moindre privilège sur ce cluster : configuration des `securityContext` pour exécuter les pods avec un utilisateur non-root, désactivation de l'accès direct aux tokens d'API pour les pods qui n'en ont pas besoin, et mise en place systématique de sondes de vie (`livenessProbe` et `readinessProbe`).
:::

## B. Architecture

Pour comprendre comment la magie opère, plongeons sous le capot. L'architecture de cette infrastructure repose sur trois piliers fondamentaux : la haute disponibilité des nœuds maîtres, la gestion déclarative avec ArgoCD, et la sécurisation des données sensibles.

### 1. Les control planes (Haute disponibilité)

Pour garantir une haute disponibilité sans point de défaillance unique, j'ai opté pour une topologie basée sur trois nœuds Control Plane[^1] (`mlt1-k3sc-vm-prd-01`, `02` et `03`). Cette configuration permet d'assurer un quorum[^2] via un consensus Raft[^6] natif à K3s. Ainsi, si une machine tombe, le cluster continue de fonctionner normalement. 

L'accès à l'API Kubernetes n'est pas lié à l'IP d'un seul nœud, mais est géré par une IP virtuelle (VIP) via un DaemonSet[^3] nommé `kube-vip`. Ce dernier s'occupe de faire basculer l'adresse `10.0.12.6` d'un nœud à l'autre en cas de panne.

![Accès au cluster Kuberntes](./assets/acces-cluster-kubernetes.png)
*Accès au cluster Kubernetes (illustration de la VIP)*

Ce schéma illustre les deux flux d'accès principaux au cluster, qui convergent vers l'IP virtuelle (VIP `10.0.12.6`) portée par Kube-vip :

* **Le trafic externe (Web/HTTP) :** Les requêtes des utilisateurs provenant d'Internet arrivent d'abord sur le VPS qui héberge le Loadbalancer NGINX frontal (`infgva1-edge-vm-prd-01`). Celui-ci agit comme un proxy et relaie le trafic vers la VIP du cluster Kubernetes.
* **Le trafic interne (API) :** Les administrateurs (pour la gestion via `kubectl`) et les nœuds workers (pour communiquer avec le cluster) interrogent directement cette même VIP.

Kube-vip redirige ensuite ces requêtes de manière transparente vers le nœud Control Plane actif (le Leader) parmi les trois disponibles, assurant ainsi un accès hautement disponible tant pour les applications hébergées que pour l'administration.

### 2. ArgoCD et le modèle "App of Apps"

Dans une approche GitOps pure, le cluster doit être capable de s'auto-configurer à partir d'un dépôt Git. Pour cela, j'utilise ArgoCD couplé au puissant modèle "App of Apps".

L'idée est simple mais redoutablement efficace : au lieu de déclarer manuellement chaque application dans ArgoCD, on déclare une seule "Application racine" (`bootstrap/app-of-apps.yml`). Cette application pointe vers un dossier de notre dépôt Git (`bootstrap/apps/`) qui contient la définition de toutes les autres applications (LibreSpeed, Homepage, etc.). Si je veux ajouter un nouveau service, je dépose juste un fichier YAML dans ce dossier, et ArgoCD s'occupe du reste.

* Dépôt ArgoCD : [infrastructure-argocd](https://github.com/loutik/infrastructure-argocd)
* Article de Stephane Robert sur ArgoCD : [ArgoCD, Concepts et architecture](https://blog.stephane-robert.info/docs/pipeline-cicd/argocd/concepts/)

```text
 [ Dépôt Git : infrastructure-argocd ]
                  |
                  v
 +-----------------------------------+
 |    Application Racine (ArgoCD)    | <-- bootstrap/app-of-apps.yml
 +-----------------------------------+
                  | (Scrute et génère)
                  v
 +-----------------------------------+
 |        Applications Enfants       |
 |  - apps/librespeed.yml            | <-- Pointe vers le dossier de l'app
 |  - apps/homepage.yml              |
 |  - infra/traefik-config.yml       |
 +-----------------------------------+
                  | (Synchronise les manifests)
                  v
        [ Cluster Kubernetes ]
        (Deployments, Services...)
```

### 3. Gestion des secrets

Le plus gros défi du GitOps est la gestion des mots de passe. Il est hors de question de *commit* des secrets en clair sur GitHub. C'est là qu'intervient **Sealed Secrets**.

Le principe repose sur le chiffrement asymétrique[^7]. Un contrôleur tourne dans mon cluster K3s et possède une clé privée. Sur ma machine locale, j'utilise l'utilitaire `kubeseal` avec la clé publique correspondante pour chiffrer mon secret. Le résultat est un objet `SealedSecret` que je peux pousser sereinement sur Git. Une fois synchronisé par ArgoCD, seul le contrôleur K3s est capable de le déchiffrer pour recréer un secret natif Kubernetes utilisable par mes pods.

## C. Déploiement

Le déploiement de l'infrastructure et des applications repose entièrement sur l'automatisation et le paradigme GitOps[^4].

* **Provisionnement Ansible :** Comme pour Proxmox, j'ai scindé l'initialisation. Un premier playbook (`k3sc-cluster-init.yml`) amorce le nœud leader. Une fois ce dernier prêt, un second playbook (`k3sc-init.yml`) fait rejoindre les deux autres maîtres. L'API est exposée sur la VIP `10.0.12.6` attachée à l'interface `eth0`, avec une résolution DNS HA (`api.prd.k3s.infra.loutik.fr`) intégrée aux certificats K3s (`tls-san`).
* **GitOps avec ArgoCD :** L'entièreté des déploiements applicatifs est gérée par ArgoCD, s'appuyant sur l'infrastructure détaillée plus haut (visible sur [le dépôt GitHub](https://github.com/loutik/infrastructure-argocd)).
* **Gestion des Manifests et Secrets :** Chaque application respecte un triptyque strict : Service, Ingress (géré par Traefik), et Deployment. J'utilise occasionnellement Kustomize pour générer dynamiquement des ConfigMaps as code depuis des fichiers bruts, évitant ainsi de monter des volumes en dur. Les données sensibles sont gérées exclusivement via `kubeseal`.

## D. Difficultés

Lors de la mise en place, quelques ajustements ont été nécessaires :

* **Le timing de provisionnement Ansible :** Lors du lancement des actions post-installation, Ansible tentait de joindre le cluster avant qu'il ne soit pleinement opérationnel. Pour résoudre cela, j'ai ajouté une tâche utilisant le module `ansible.builtin.wait_for` dans mon rôle `k3s-controle-plane`. Cela force Ansible à patienter activement (jusqu'à 300 secondes) que le port 6443 de l'IP virtuelle (10.0.12.6) réponde correctement avant de continuer.
* **Le proxy système K3s :** Mes nœuds n'ayant pas d'accès direct à internet, j'ai dû injecter les variables `HTTP_PROXY` et `HTTPS_PROXY` dans le service systemd de K3s pour qu'il puisse tirer ses images via mon Squid. Il a fallu prendre grand soin d'exclure les plages locales et la VIP via la directive `NO_PROXY` pour ne pas casser le réseau interne du cluster.
* **Le Reverse Proxy et les erreurs 404 K8s :** Quand un pod tombait, l'utilisateur avait une page 404 brute de Traefik/K8s au lieu de ma jolie page d'erreur personnalisée. J'ai découvert et ajouté l'argument `proxy_intercept_errors on;` dans mon rôle Ansible Nginx (via la variable `nginx_vhosts`). Cela permet au Nginx frontal d'intercepter les codes d'erreur de Kubernetes et de servir correctement ma page customisée.

---

[^1]: **Control Plane** - Le "cerveau" d'un cluster Kubernetes, regroupant les composants qui prennent les décisions globales (planification, gestion de l'état) et répondent aux événements du cluster.
[^2]: **Quorum** - Le nombre minimum de nœuds devant être actifs et connectés pour que le cluster puisse prendre des décisions fiables, évitant ainsi les problèmes de "split-brain".
[^3]: **DaemonSet** - Un objet Kubernetes qui s'assure qu'une copie d'un Pod spécifique s'exécute sur tous les nœuds (ou une sélection de nœuds) du cluster.
[^4]: **GitOps** - Une méthodologie de gestion d'infrastructure où un dépôt Git est utilisé comme source unique de vérité. Les modifications poussées sur Git sont automatiquement répliquées sur l'infrastructure.
[^5]: **Sealed Secrets** - Un outil permettant de chiffrer des données sensibles (mots de passe, tokens) de manière asymétrique pour pouvoir les versionner publiquement en toute sécurité sur Git sans fuite de données.
[^6]: **Raft** - Un algorithme de consensus distribué utilisé pour s'assurer que tous les nœuds du Control Plane partagent exactement la même vision de l'état du cluster, même en cas de panne réseau.
[^7]: **Chiffrement asymétrique** - Une méthode de cryptographie utilisant une paire de clés : une clé publique pour chiffrer (verrouiller) la donnée, et une clé privée distincte pour la déchiffrer (déverrouiller).