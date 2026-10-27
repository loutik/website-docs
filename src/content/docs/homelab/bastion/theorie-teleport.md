---
title: "Théorie - Teleport"
description: "Cours et concepts fondamentaux autour de Teleport."
sidebar:
  order: 1
---

## A. Présentation

Teleport est un bastion[^1] moderne, souvent appelé *Identity-Aware Access Proxy*. En termes simples, c'est une porte d'entrée ultra-sécurisée qui permet aux ingénieurs d'accéder à l'infrastructure (serveurs, clusters Kubernetes, bases de données, applications internes) de n'importe où. Au lieu de s'appuyer sur de vieux mots de passe ou des clés SSH statiques qui traînent sur les ordinateurs, Teleport utilise votre identité pour générer des accès temporaires.

:::note
Teleport remplace avantageusement le combo traditionnel "VPN + Serveur de rebond" en apportant une couche d'identité forte et un audit complet des actions.
:::

## B. Problématiques résolues

- **La gestion cauchemardesque des clés SSH :** Au lieu de distribuer des clés SSH statiques qu'on oublie de révoquer quand un employé part, Teleport génère des certificats de courte durée. Si le certificat expire au bout d'une heure, l'accès est automatiquement coupé.
- **Le manque de traçabilité (Audit) :** Sur un serveur classique, il est dur de savoir *exactement* ce qu'a tapé un utilisateur. Teleport résout cela grâce au *Session Recording* (enregistrement de session), qui filme et stocke tout ce qui s'affiche dans le terminal de l'utilisateur pour des raisons de sécurité et de débogage.

## C. Fonctionnement

Teleport repose sur une architecture distribuée et centralisée autour d'une Autorité de Certification (CA) interne. Lorsqu'un utilisateur s'authentifie, il reçoit un certificat temporaire cryptographique qui lui donne le droit de dialoguer avec l'infrastructure.

- **Auth Service :** C'est le cerveau de l'opération. Il gère l'autorité de certification, vérifie les identités (via votre fournisseur SSO[^2]), gère les permissions (RBAC[^3]) et délivre les certificats temporaires.
- **Proxy Service :** C'est le portier. C'est le seul composant exposé sur Internet. Il intercepte les connexions des utilisateurs, vérifie leurs certificats auprès de l'Auth Service, et route le trafic vers la bonne machine.
- **Node / Agent :** C'est le petit service installé sur vos serveurs cibles (ou bases de données). Il écoute les requêtes venant du Proxy et valide les certificats avant d'autoriser l'exécution des commandes.

## D. Exemples

- **Accès SSH distant sans VPN :** Un administrateur dans un café s'authentifie sur Teleport via l'interface web ou la commande `tsh login`. Une fois validé, il tape `tsh ssh admin@mon-serveur` et accède au serveur interne de l'entreprise sans jamais exposer le port SSH (22) du serveur sur Internet.
- **Administration de K3s (Kubernetes) :** Un développeur a besoin d'inspecter des pods. Teleport s'intègre avec `kubectl`. Le développeur s'authentifie, et Teleport lui donne les droits exacts (par exemple, lecture seule) sur un *namespace* spécifique du cluster, tout en enregistrant ses actions.

## E. Bonnes pratiques

| Règle | Catégorie | Justification |
| :--- | :--- | :--- |
| **Déléguer l'authentification (OIDC/SAML)** | Sécurité | Lier Teleport à un fournisseur d'identité externe (comme Authentik ou Entra ID) permet d'appliquer le MFA[^4] obligatoirement et de centraliser les départs des employés. |
| **Appliquer le moindre privilège (RBAC)** | Sécurité | Ne jamais donner les droits `root` par défaut. Créer des rôles précis (ex: `view-only`, `db-admin`) pour limiter l'impact en cas de compromission d'un compte. |
| **Réduire le TTL (Time To Live)** | Sécurité / Maintenance | Configurer la durée de vie des certificats au strict minimum (ex: 1h à 8h max). Ainsi, si un ordinateur portable est volé, l'accès expire très rapidement de lui-même. |

---

[^1]: **Bastion :** Serveur informatique intermédiaire ultra-sécurisé qui sert de point d'entrée unique pour accéder à un réseau privé protégé.
[^2]: **SSO (Single Sign-On) :** Système d'authentification unique permettant à un utilisateur de se connecter une seule fois pour accéder à de multiples applications ou services.
[^3]: **RBAC (Role-Based Access Control) :** Modèle de sécurité où les permissions d'accès sont définies en fonction du rôle de la personne dans l'organisation, et non pas donnée par donnée.
[^4]: **MFA (Multi-Factor Authentication) :** Méthode de sécurité nécessitant de fournir au moins deux preuves d'identité différentes (ex: mot de passe + code sur le téléphone) pour se connecter.
