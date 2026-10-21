---
title: "Choix - Teleport"
description: "Explication et justification du choix technique de Teleport au sein de LoutikCLOUD."
sidebar:
order: 1
---

## A. Contexte

Avec l'évolution constante de LoutikCLOUD (Proxmox, clusters K3s, bases de données), la gestion des accès distants est devenue un véritable casse-tête de sécurité. Historiquement, l'accès se faisait via un bastion SSH classique[^1], impliquant la gestion manuelle de dizaines de paires de clés asymétriques. Cette approche n'est plus alignée avec les standards DevSecOps modernes : les clés statiques finissent souvent par fuiter, traîner sur des postes non sécurisés ou être oubliées lors des départs.

L'objectif est donc de moderniser notre porte d'entrée. Il me fallait une solution centralisée, orientée "Zéro Trust", capable de simplifier l'expérience développeur tout en élevant drastiquement notre niveau d'auditabilité, le tout sans faire exploser le MCO[^2] de mon homelab.

## B. Cahiers des charges

| ID | Type | Exigence | Description |
| --- | --- | --- | --- |
| **[REQ-F01]** | Fonctionnel | Interface Web UI | La solution doit proposer un portail web permettant de se connecter aux serveurs directement depuis un navigateur, sans client lourd. |
| **[REQ-F02]** | Fonctionnel | Accès Terminal Natif | Les utilisateurs doivent pouvoir se connecter en SSH directement depuis leur terminal local avec un flux de travail naturel. |
| **[REQ-T01]** | Technique | Rotation et gestion des clés | Le système doit gérer automatiquement la création et la rotation des moyens d'authentification (fin des clés statiques). |
| **[REQ-T02]** | Technique | Enregistrement des actions | L'outil doit journaliser précisément qui fait quoi, et proposer un enregistrement vidéo (replay) des sessions SSH. |
| **[REQ-T03]** | Technique | Architecture KISS | Le déploiement doit rester simple (KISS[^3]), compatible avec un déploiement LXC, tout en permettant une centralisation des logs. |

## C. Les solutions du marché

### C.1. Présentations des solutions

#### C.1.1. Bastion OpenSSH Classique

* **Présentation générale :** La solution historique. Un serveur Linux standard exposé sur internet qui sert de rebond pour atteindre les machines internes.
* **Fonctionnement :** Repose sur le démon `sshd`, le transfert d'agent SSH (`ssh-agent`) et le fichier `authorized_keys`.
* **Profil :** Très orienté "SysAdmin Old School", idéal pour les toutes petites infrastructures statiques où la sécurité repose sur la rigueur humaine.

#### C.1.2. Apache Guacamole

* **Présentation générale :** Passerelle d'accès à distance open-source fonctionnant sans client (clientless).
* **Fonctionnement :** Utilise un serveur Tomcat qui traduit les protocoles RDP, SSH ou VNC en HTML5 pour les afficher dans le navigateur web.
* **Profil :** Très populaire dans le monde académique ou les entreprises souhaitant donner accès à des postes de travail graphiques ou des terminaux sans rien installer sur le poste client.

#### C.1.3. Teleport (par Gravitational)

* **Présentation générale :** Un "Identity-Aware Access Proxy" open-source. C'est un bastion de nouvelle génération remplaçant les clés SSH par de l'identité.
* **Fonctionnement :** Fonctionne avec des agents installés sur les cibles qui montent un *reverse tunnel*[^4] vers le proxy central. L'authentification délivre des certificats éphémères[^5] pour un accès temporaire.
* **Profil :** Orienté DevSecOps et Cloud-Native. Pensé pour les équipes distribuées gérant des parcs hétérogènes (Linux, Windows, Kubernetes, Bases de données).

### C.2. Comparatifs des solutions

| Exigence | Bastion OpenSSH | Apache Guacamole | Teleport |
| --- | --- | --- | --- |
| **[REQ-F01 (Interface Web)]** | Non validé | Validé | Validé |
| **[REQ-F02 (Accès Terminal)]** | Validé | Non validé (Web uniquement) | Validé |
| **[REQ-T01 (Rotation des clés)]** | Non validé (Gestion manuelle) | Non validé (Gestion dans l'outil) | Validé (Certificats éphémères) |
| **[REQ-T02 (Enregistrement)]** | Évaluation (Nécessite des surcouches) | Validé (Enregistrement vidéo) | Validé (Logs structurés + Replay) |
| **[REQ-T03 (Architecture KISS)]** | Validé | Évaluation (Stack Java/Tomcat lourde) | Validé (Binaire unique en Go) |

## D. Solution proposée

La solution proposée pour l'infrastructure est **Teleport**.

Dans LoutikCLOUD, Teleport coche absolument toutes les cases de notre approche DevSecOps. L'intégration se fera de manière la plus KISS[^3] possible : le binaire Linux sera déployé en mode *Standalone* dans un conteneur LXC dédié sous Proxmox. Ce choix nous offre une isolation parfaite et facilite les sauvegardes (snapshots).

Pour simplifier la gestion des données, le composant d'authentification (Auth Service) de Teleport sera branché sur notre instance PostgreSQL externe existante. Cela permet d'y stocker l'état du cluster (Cluster State) et les journaux d'audit de manière centralisée. Les enregistrements "vidéo" des terminaux seront quant à eux stockés localement sur le disque du conteneur LXC.

En pratique, l'expérience est transformée : je tape `tsh login` dans mon terminal, je m'authentifie via le web, et je reçois un certificat éphémère de quelques heures. Plus aucune clé permanente n'existe sur les serveurs, et chaque frappe clavier est auditée. L'impact sur notre automatisation est également géré via `tbot`, qui renouvelle silencieusement les certificats pour nos pipelines Ansible.

**Justification du rejet des solutions alternatives :**

* **Bastion OpenSSH Classique :** Rejeté car il ne propose ni interface web, ni enregistrement de session natif. La gestion manuelle du cycle de vie des clés (révocation, rotation) crée une dette technique et un risque de sécurité inacceptable aujourd'hui.
* **Apache Guacamole :** Rejeté malgré son excellente interface web, car il brise le flux de travail naturel d'un administrateur système. Il est impossible de se connecter nativement via son propre terminal local (CLI) au travers de Guacamole. De plus, son architecture basée sur Java Tomcat est plus lourde à maintenir.

---

[^1]: **Bastion SSH :** Un serveur informatique conçu et hautement sécurisé pour servir de point d'entrée unique depuis l'extérieur vers le réseau privé interne.
[^2]: **MCO (Maintien en Conditions Opérationnelles) :** L'ensemble des tâches d'administration (mises à jour, sauvegardes, corrections de bugs) nécessaires pour faire vivre un système au quotidien.
[^3]: **KISS (Keep It Simple, Stupid) :** Un principe de conception qui privilégie la simplicité. En ingénierie, un système simple est plus facile à maintenir, à réparer et moins sujet aux failles de sécurité.
[^4]: **Reverse tunnel (Tunnel inversé) :** Une technique réseau où ce n'est pas le serveur central qui se connecte à la machine, mais la machine qui va "appeler la maison" (le serveur central). Cela permet de sécuriser la machine car elle n'a pas besoin d'ouvrir de port depuis l'extérieur.
[^5]: **Certificat éphémère :** Une carte d'identité numérique cryptographique qui possède une date d'expiration très courte (ex: 8 heures). Passé ce délai, le document s'autodétruit numériquement, obligeant l'utilisateur à se ré-authentifier.
