---
title: "Dockerfile"
description: "Fiche technique sur le Dockerfile : définition, fonctionnement, architecture des couches, directive de build et bonnes pratiques DevSecOps pour la production."
---

## Définition
Un Dockerfile est un fichier texte brut contenant la séquence d'instructions déclaratives nécessaires pour assembler une image de conteneur. Il agit comme un script d'automatisation de l'infrastructure immuable, transformant un système d'exploitation de base (image parente) en un environnement d'exécution applicatif isolé. Dans l'écosystème IT, il représente le pilier de l'approche Infrastructure-as-Code (IaC) pour la conteneurisation, garantissant la reproductibilité stricte des déploiements de l'intégration continue jusqu'à la production.

## Le problème résolu
Historiquement, la configuration des environnements d'exécution applicatifs souffrait d'un manque de standardisation et de dérives de configuration entre les serveurs.
| Avant (Le problème) | Avec Dockerfile (La solution) |
|---|---|
| Déploiement manuel ou scripts shell hétérogènes entraînant le syndrome "ça marche sur ma machine" (Configuration Drift). | Définition déclarative, immuable et versionnable (Git) de l'environnement d'exécution garantissant l'identicité des builds. |
| Incohérence des dépendances et bibliothèques entre les environnements de développement, staging et production. | Portabilité absolue : l'artefact généré (l'image) embarque ses dépendances et s'exécute à l'identique sur n'importe quel moteur (Docker, Podman, containerd). |

## Comment ça fonctionne concrètement
Le processus de build (moteur de conteneurisation) lit le Dockerfile séquentiellement de haut en bas et exécute chaque directive dans un conteneur éphémère.
- **Contexte de build :** Le démon reçoit le Dockerfile et les fichiers du répertoire courant de l'hôte (le contexte) pour initier la construction des artefacts.
- **Système de calques (Layers) :** Chaque directive modificatrice du système de fichiers (`RUN`, `COPY`, `ADD`) génère une nouvelle couche immuable en lecture seule au-dessus de la précédente, reposant sur un système de fichiers de type UnionFS (ex: OverlayFS).
- **Cache de build (Build Cache) :** Le moteur identifie chaque couche par un hash SHA256. Si l'instruction et les fichiers sources n'ont pas été modifiés, le cache est réutilisé pour éviter une reconstruction coûteuse.
- **Multi-stage build :** Un motif d'architecture permettant de chainer plusieurs directives `FROM` pour isoler la phase de compilation (nécessitant des outils lourds) de la phase de création de l'artefact final de production (ultra-léger).

## Vocabulaire technique
- **Layer (Couche) :** Modification granulaire du système de fichiers générée par une instruction. Les layers sont empilés et partagés entre différentes images pour économiser l'espace de stockage.
- **Image parente (Base Image) :** L'image définie par l'instruction `FROM` qui sert de point de départ fondamental (ex: `alpine`, `debian:bullseye-slim`, `scratch`).
- **Entrypoint / CMD :** Directives définissant le processus principal (PID 1) exécuté au démarrage du conteneur. L'`ENTRYPOINT` verrouille l'exécutable, tandis que `CMD` fournit les arguments par défaut (surchargeables à l'exécution).
- **Distroless :** Concept d'images de production dépouillées au maximum, ne contenant ni gestionnaire de paquets (apt, apk), ni shell (bash), ni utilitaires système superflus.

## Exemple concret
L'exemple ci-dessous illustre la création d'une image pour une API Python, en appliquant le principe du *Multi-stage build* et l'exécution sans privilèges, optimisé pour un environnement OCI (Docker/Podman).

```dockerfile
# Étape 1 : Build (Environnement de compilation avec outils nécessaires)
# Utilisation d'une image officielle légère comme base
FROM python:3.11-alpine AS builder

# Définit le répertoire de travail par défaut dans le conteneur
WORKDIR /app

# Copie uniquement le fichier des dépendances en premier pour maximiser l'utilisation du cache de build
COPY requirements.txt .

# Installation des dépendances dans un répertoire local utilisateur pour faciliter le transfert ultérieur
RUN pip install --user --no-cache-dir -r requirements.txt

# Étape 2 : Production (Environnement minimaliste final d'exécution)
FROM python:3.11-alpine AS runner

# Création d'un utilisateur système non-privilégié "appuser" pour sécuriser l'exécution
# -D : Pas de mot de passe, -H : Pas de répertoire home par défaut, -u : Attribution d'un UID explicite (1000)
RUN adduser -D -H -u 1000 appuser

WORKDIR /app

# Récupération exclusive des dépendances pré-compilées depuis l'étape 'builder' (isolation des outils de build)
COPY --from=builder /root/.local /home/appuser/.local

# Copie du code source applicatif depuis le contexte de l'hôte vers le conteneur
COPY src/ .

# Attribution des droits de propriété des fichiers au nouvel utilisateur non-root
RUN chown -R appuser:appuser /app

# Bascule du contexte d'exécution : toutes les commandes suivantes (et le PID 1) s'exécuteront sous cet utilisateur
USER appuser

# Injection du chemin des binaires Python locaux dans la variable d'environnement système PATH
ENV PATH=/home/appuser/.local/bin:$PATH

# Déclaration documentaire du port d'écoute réseau du conteneur
EXPOSE 8080

# Définition de la commande d'exécution du processus principal (serveur ASGI Uvicorn)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]

```

## Production : Bonnes pratiques et Anti-patterns

| Ce qu'il faut faire (Bonne pratique) | Ce qu'il faut fuir (Anti-pattern) | Pourquoi ? |
| --- | --- | --- |
| Définir un `USER` non-root explicite avant le processus d'exécution final. | Exécuter le conteneur en tant que `root` (comportement par défaut). | Respecte le principe de moindre privilège. Empêche l'escalade vers l'hôte si une vulnérabilité permet une évasion du conteneur (container breakout). |
| Utiliser le *Multi-stage build* et des images de base distroless ou Alpine. | Inclure les chaînes de compilation (gcc, make) et outils de debug dans l'image finale. | Réduit drastiquement la surface d'attaque (moins de paquets = moins de CVEs potentielles) et optimise les temps de transfert réseau (pull/push). |
| Chaîner les commandes `RUN` (ex: `apt-get update && apt-get install -y p && rm -rf /var/lib/apt/lists/*`). | Multiplier les directives `RUN` séparées pour installer chaque paquet individuellement. | Chaque directive `RUN` crée une couche immuable. Le chaînage permet de nettoyer les caches temporaires d'installation dans la même couche, réduisant le poids final de l'image. |

## L'essentiel à retenir

* Le Dockerfile est un contrat d'infrastructure as code (IaC) qui documente techniquement et garantit l'immutabilité d'un environnement d'exécution.
* L'optimisation séquentielle de l'ordre des instructions est critique : les fichiers changeant le moins (dépendances) doivent être copiés en premier pour exploiter le cache des layers.
* La sécurité d'une image de production exige proactivement l'abandon des droits root, la minimisation stricte de l'OS sous-jacent et le retrait systématique des outils de compilation via le multi-stage.