---
title: "Pratique - NGINX"
description: "Déploiement, architecture et retour d'expérience sur l'intégration de NGINX dans l'infrastructure LoutikCLOUD."
sidebar:
  order: 3
---

## A. Contexte

Dans la topologie LoutikCLOUD, NGINX n'est pas hébergé directement dans mon réseau local (LAN), mais sur un serveur externe agissant comme un point de présence "Edge". Déployé sur une machine virtuelle (VPS[^1]) sous Debian située chez Infomaniak à Genève, ce serveur encaisse le trafic public via une IP dédiée. NGINX agit ici en tandem avec CrowdSec (pour la partie pare-feu applicatif) et communique de manière chiffrée avec mes serveurs internes locaux au travers d'un tunnel VPN[^2] (Tailscale). C'est la pierre angulaire qui sécurise et route l'accès à des services comme le SSO, le portail de documentation ou le tableau de bord de supervision.

## B. Architecture

L'objectif de cette architecture est de garantir qu'aucun de mes serveurs locaux (bases de données, conteneurs K3s, proxmox) ne soit directement exposé à Internet. Le VPS "Edge" absorbe la charge et filtre les requêtes malveillantes.

```text
       [ Utilisateurs Externes ]
                  |
                  | HTTP/3 (QUIC) / HTTPS
                  v
+---------------------------------------------+
| VPS EDGE (Infomaniak) - IP: 83.228.215.158  |
|                                             |
|  1. [ WAF CrowdSec ] (Analyse IP/Requêtes)  |
|         |                                   |
|  2. [ Reverse Proxy NGINX ]                 |
|     - Terminaison TLS (Certbot)             |
|     - Headers de sécurité (HSTS)            |
|     - Routage dynamique                     |
+---------------------------------------------+
                  |
                  | Tunnel chiffré (10.0.x.x)
                  v
       [ VPN Tailscale (Réseau privé) ]
                  |
                  v
+---------------------------------------------+
| HOMELAB (LoutikCLOUD - Local)               |
|                                             |
|  - 10.0.12.2 : Docker / Portainer           |
|  - 10.0.22.x : Kubernetes K3s               |
|  - 10.0.13.1 : DNS PowerDNS                 |
+---------------------------------------------+
```

## C. Déploiement

Toute l'installation et la configuration sont strictement gérées via l'outil d'automatisation Ansible, au travers de deux rôles distincts (`edge-nginx-install` et `edge-nginx-config`). Cette séparation me permet de réinstaller la machine de zéro en quelques minutes.

* **Durcissement et "Catch-all" :** La première étape déploie les paquets de base et masque immédiatement la version de NGINX (`server_tokens off`). J'ai configuré un serveur par défaut (Catch-all) qui rejette systématiquement les requêtes HTTP/HTTPS visant directement l'adresse IP du serveur ou des noms de domaine non reconnus.
* **Templating dynamique des vHosts :** J'utilise un fichier Jinja2[^3] (`vhost.conf.j2`) qui boucle sur une liste de domaines (ex: `sso.loutik.fr`, `docs.loutik.fr`). Le code génère automatiquement la configuration du proxy, lance Certbot pour récupérer les certificats Let's Encrypt via la méthode HTTP01 et injecte des pages d'erreur HTML personnalisées utilisant les balises SSI[^4] pour afficher dynamiquement le statut de l'erreur.

:::note
La gestion des pages d'erreurs (403, 404, 502...) se fait de manière unifiée via un fichier partagé `error_pages.conf`. Ainsi, si un conteneur crash dans le homelab, le visiteur voit une page de maintenance propre aux couleurs de LoutikCLOUD plutôt qu'une erreur brute du navigateur.
:::

## D. Difficultés

Lors de la mise en place, quelques ajustements ont été nécessaires pour fiabiliser le routage vers mes applications locales :

* **Erreurs 502 (Bad Gateway) sur le SSO Authentik :** Les requêtes d'authentification génèrent parfois de très gros en-têtes HTTP (cookies, tokens). NGINX, par défaut, utilise des tampons (buffers) assez petits. Lorsqu'ils étaient saturés, NGINX coupait la connexion avec l'erreur 502. J'ai résolu ce problème en créant un fichier de configuration additionnel (`99-proxy-buffers.conf`) augmentant la taille des tampons (`proxy_buffer_size 128k; proxy_buffers 4 256k;`).
* **Déconnexions intempestives des WebSockets :** Certaines applications comme le portail SSO ou la supervision en temps réel nécessitent des connexions bidirectionnelles persistantes (WebSockets). Le proxy HTTP standard de NGINX les bloquait. J'ai dû modifier mon template Ansible pour injecter dynamiquement les en-têtes `Upgrade $http_upgrade` et étendre les `timeout` (jusqu'à 3600s) spécifiquement pour les hôtes nécessitant cette technologie.

---

[^1]: **VPS (Virtual Private Server)** - Un serveur distant loué chez un hébergeur cloud offrant des ressources dédiées et une adresse IP publique fixe, idéal pour exposer des services.
[^2]: **VPN (Virtual Private Network)** - Un tunnel réseau chiffré qui permet de relier de manière transparente et sécurisée des machines situées dans des lieux géographiques différents.
[^3]: **Jinja2** - Un moteur de création de modèles utilisé par Ansible permettant de générer des fichiers de configuration dynamiques en utilisant des variables et des boucles de code.
[^4]: **SSI (Server Side Includes)** - Une fonctionnalité de NGINX permettant d'exécuter des directives simples pour injecter des variables (comme le code de l'erreur HTTP ou le nom d'hôte) à l'intérieur d'une page HTML statique avant de l'envoyer au visiteur.