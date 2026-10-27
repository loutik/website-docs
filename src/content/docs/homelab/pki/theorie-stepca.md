---
title: "Théorie - PKI step-ca"
description: "Cours et concepts fondamentaux autour de la PKI step-ca."
sidebar:
  order: 1
---

## A. Présentation

La PKI[^1] **step-ca** est une Autorité de Certification (CA[^2]) légère et moderne, taillée pour les infrastructures cloud-native et le DevSecOps. Son but principal est de sécuriser les communications internes de votre infrastructure en générant, distribuant et renouvelant automatiquement des certificats TLS/SSL[^3] de confiance pour vos propres machines et services, tout en se comportant comme une autorité reconnue (à l'image de Let's Encrypt, mais pour votre réseau privé).

:::note
Dans le cadre de LoutikCLOUD, step-ca permet de s'affranchir définitivement des alertes de sécurité des navigateurs (le fameux avertissement "connexion non sécurisée") sur les services internes qui ne sont pas exposés sur Internet.
:::

## B. Problématiques résolues

- **Gestion manuelle et fastidieuse des certificats :** step-ca intègre nativement le protocole ACME[^4], ce qui permet d'automatiser entièrement la demande, le déploiement et le renouvellement des certificats sans aucune intervention humaine.
- **Sécurité des flux internes (Zero Trust) :** Chiffrer de bout en bout est complexe avec des autorités publiques lorsqu'un service n'est pas accessible depuis l'extérieur. step-ca permet de sécuriser chaque composant interne (Proxmox, OPNsense, Kubernetes) avec sa propre identité cryptographique validée localement.

## C. Fonctionnement

step-ca fonctionne sur un modèle API-first. Le serveur écoute les requêtes des clients (les machines de l'infrastructure) et délivre des certificats valides en s'appuyant sur une hiérarchie de confiance stricte et mathématique.

- **Root CA (Autorité Racine) :** C'est le cœur absolu de la confiance. Elle signe l'autorité intermédiaire. C'est elle que vos appareils (PC, smartphones) doivent approuver manuellement une seule fois pour faire implicitement confiance à tout le reste de l'infrastructure.
- **Intermediate CA (Autorité Intermédiaire) :** C'est elle qui est active au quotidien sur le serveur step-ca. Elle signe les certificats finaux (pour vos sites et services) afin de protéger la clé racine d'une éventuelle compromission.
- **Provisioners (Fournisseurs d'identité) :** Ce sont les méthodes d'authentification (comme ACME, OIDC ou des jetons) qui prouvent au serveur step-ca qu'une machine a bien le droit de réclamer et de recevoir un certificat.

## D. Exemples

- **Sécurisation des hyperviseurs Proxmox VE :** Utiliser le client ACME intégré nativement à Proxmox pour demander automatiquement un certificat valide à l'instance step-ca afin de sécuriser l'interface d'administration Web (port 8006).
- **Chiffrement du routeur OPNsense :** Déployer un certificat interne valide via le plugin ACME pour sécuriser le portail d'administration du pare-feu, sans avoir besoin d'exposer OPNsense sur Internet pour répondre à un challenge Let's Encrypt classique.

## E. Bonnes pratiques

| Règle | Catégorie | Justification |
| :--- | :--- | :--- |
| **Ségrégation de la Root CA** | Sécurité | La clé privée de l'autorité racine ne doit idéalement jamais être stockée sur un serveur connecté. Gardez-la hors-ligne et utilisez l'autorité intermédiaire pour les opérations courantes. |
| **Certificats à durée de vie courte** | Sécurité | Privilégiez des certificats valides 24h ou quelques jours. En cas de vol d'une clé, le certificat expirera très vite, réduisant drastiquement la surface d'attaque. |
| **Automatisation stricte via ACME** | Maintenance | Ne renouvelez jamais manuellement un certificat. L'automatisation prévient les pannes liées à l'oubli humain ("fat-finger") et rend possible l'usage de certificats à courte durée de vie. |

---

[^1]: **PKI (Public Key Infrastructure) :** Infrastructure à clés publiques. C'est l'ensemble des règles, des politiques et des logiciels permettant de créer, gérer et distribuer des certificats numériques de manière sécurisée.
[^2]: **CA (Certificate Authority) :** Autorité de Certification. C'est l'entité de confiance (ici, le logiciel step-ca) qui vérifie les identités et émet les certificats. On peut la voir comme la "préfecture" qui délivre des cartes d'identité numériques pour vos serveurs.
[^3]: **TLS/SSL :** Protocoles de sécurité permettant de chiffrer les échanges de données sur un réseau (c'est ce qui génère le fameux "cadenas" du HTTP**S**).
[^4]: **ACME (Automatic Certificate Management Environment) :** Protocole informatique permettant d'automatiser totalement les échanges entre l'autorité de certification et un serveur pour obtenir, vérifier et renouveler un certificat de sécurité.
