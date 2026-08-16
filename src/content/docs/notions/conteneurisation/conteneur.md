---
title: "Conteneur Docker"
description: "Fiche technique sur la containerisation Docker pour administrateurs système et étudiants BTS SIO"
---

## Définition
Un conteneur Docker est une unité d'exécution standardisée empaquetant une application avec ses dépendances, bibliothèques et configuration dans un environnement isolé au niveau du système d'exploitation. Il partage le noyau Linux de l'hôte tout en maintenant une séparation des espaces de noms (namespaces) et des groupes de contrôle (cgroups). Cette technologie se positionne entre la virtualisation traditionnelle et le déploiement natif, offrant une granularité fine pour l'orchestration et le cycle de vie applicatif.

## Le problème résolu
L'incompatibilité des environnements entre développement, test et production génère des incidents récurrents et des temps de résolution prolongés.

| Avant (Le problème) | Avec Docker (La solution) |
|---|---|
| Incohérence des dépendances entre environnements | Image immuable garantissant l'identité binaire du dev à la prod |
| Provisionnement lent des serveurs (minutes/heures) | Instantiation de conteneurs en quelques secondes |
| Conflits de versions de bibliothèques sur un même hôte | Isolation par conteneur permettant des versions multiples coexistantes |
| Surcharge resource des machines virtuelles complètes | Partage du noyau hôte réduisant l'overhead mémoire et CPU |

## Comment ça fonctionne concrètement
L'architecture Docker repose sur un modèle client-serveur avec les composants suivants :

- **Docker Daemon (dockerd)** : Service système gérant la création, l'exécution et la distribution des conteneurs
- **Docker Client** : Interface CLI communiquant avec le daemon via l'API REST
- **Registry** : Dépôt centralisé d'images (Docker Hub, registry privé)
- **Image** : Template en lecture seule constitué de couches empilées (layers)
- **Conteneur** : Instance exécutable d'une image avec une couche writable éphémère

Cycle de vie d'un conteneur :
1. Pull de l'image depuis un registry vers le daemon local
2. Création de la couche writable et allocation des namespaces (PID, network, mount, user, IPC, UTS)
3. Application des cgroups pour la limitation des ressources (CPU, mémoire, I/O)
4. Exécution du processus défini par l'instruction CMD ou ENTRYPOINT
5. Supervision du processus PID 1 et collecte des logs stdout/stderr
6. Libération des ressources à l'arrêt ou suppression du conteneur

## Vocabulaire technique
- **Image** : Artefact binaire immuable contenant le filesystem et les métadonnées d'exécution
- **Dockerfile** : Fichier de manifeste déclaratif définissant les instructions de build d'une image
- **Layer** : Couche de filesystem en lecture seule résultant d'une instruction du Dockerfile
- **Volume** : Mécanisme de persistance des données monté dans le filesystem du conteneur
- **Network bridge** : Réseau virtuel NATé permettant la communication inter-conteneurs sur un même hôte

## Exemple concret
```dockerfile
# Dockerfile pour une application Node.js en production
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS runtime

# Création d'un utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

USER nodejs
EXPOSE 3000

# HEALTHCHECK pour l'orchestration
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
```

```bash
# Commandes d'administration système courantes
docker build -t monapp:1.0.0 --no-cache .
docker run -d --name monapp_prod \
  --restart unless-stopped \
  --memory="512m" --cpus="1.0" \
  --log-driver=json-file --log-opt max-size=10m \
  -p 8080:3000 \
  monapp:1.0.0
```

## Production : Bonnes pratiques et Anti-patterns
| Ce qu'il faut faire (Bonne pratique) | Ce qu'il faut fuir (Anti-pattern) | Pourquoi ? |
|---|---|---|
| Utiliser des images minimales (alpine, distroless) | Images complètes avec shells et outils inutiles | Réduction de la surface d'attaque et du temps de pull |
| Exécuter les processus en non-root (USER directive) | Lancement systématique avec l'utilisateur root | Limitation des privilèges en cas de compromission du conteneur |
| Monter les secrets via Docker Swarm secrets ou volumes | Hardcoder les credentials dans l'image ou variables d'environnement | Les secrets dans les images persistent dans l'historique des layers |
| Définir des HEALTHCHECK pour chaque service | Compter uniquement sur le statut du processus PID 1 | Un processus peut tourner sans que le service soit fonctionnel |
| Limiter les ressources via --memory et --cpus | Laisser les conteneurs consommer sans quota | Évite le déni de service par épuisement des ressources de l'hôte |

## L'essentiel à retenir
- Une image est immuable ; un conteneur est une instance exécutable avec une couche writable éphémère
- L'isolation repose sur les namespaces et cgroups du noyau Linux, pas sur une virtualisation matérielle
- La sécurité en production exige : images minimales, utilisateur non-root, ressources limitées, secrets externalisés