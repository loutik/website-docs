---
title: "Choix - NGINX"
description: "Explication et justification du choix technique de NGINX au sein de LoutikCLOUD."
sidebar:
  order: 2
---

## A. Contexte

Au sein de l'infrastructure LoutikCLOUD, l'accès depuis l'extérieur présentait un défi architectural majeur. Mon accès Internet domestique repose sur une adresse IP publique dynamique, ce qui rend la joignabilité incertaine. De plus, exposer l'infrastructure nécessitait une double redirection de ports complexes : depuis la box opérateur vers le pare-feu OPNsense, puis vers le reverse proxy interne. 

Pour professionnaliser l'accès et contourner ces limitations, j'ai fait le choix d'acquérir un VPS[^1] chez Infomaniak. Ce serveur dans le cloud agit comme un point d'entrée externe avec une adresse IP publique fixe et dédiée. Il me fallait donc déployer sur ce VPS un reverse proxy capable d'encaisser le trafic, de le filtrer, puis de le router de manière sécurisée vers mon infrastructure locale (derrière OPNsense). Ce composant critique se devait d'être léger, hautement automatisable et taillé pour la sécurité moderne.

## B. Cahiers des charges

| ID | Type | Exigence | Description |
| :--- | :--- | :--- | :--- |
| **[REQ-F01]** | Fonctionnel | Pages d'erreur personnalisées | Capacité à servir des pages web statiques (HTML/CSS) sur-mesure pour les codes d'erreur HTTP (404, 403, 502). |
| **[REQ-F02]** | Fonctionnel | Support HTTP/3 | Prise en charge native du protocole HTTP/3[^5] pour garantir des temps de réponse optimaux aux utilisateurs. |
| **[REQ-T01]** | Technique | Compatibilité WAF CrowdSec | Intégration fluide avec le moteur de détection et de remédiation CrowdSec[^3] pour bloquer les IP malveillantes. |
| **[REQ-T02]** | Technique | Provisionnement Ansible | Fichiers de configuration lisibles et facilement déployables via des playbooks Ansible[^4]. |
| **[REQ-T03]** | Technique | Empreinte minimale | Consommation très faible de la mémoire (RAM) et du processeur (CPU) pour ne pas surcharger le VPS. |

## C. Les solutions du marché

### C.1. Présentations des solutions

#### C.1.1. NGINX
* **Présentation générale :** Serveur web et reverse proxy open-source, devenu le standard de l'industrie pour les architectures modernes et cloud-native.
* **Fonctionnement :** Repose sur une architecture asynchrone et événementielle, lui permettant de gérer des milliers de connexions avec très peu de ressources.
* **Profil :** Orienté DevOps, idéal pour les infrastructures nécessitant de la haute performance, du load balancing et une forte personnalisation via des fichiers de configuration clairs.

#### C.1.2. HAProxy
* **Présentation générale :** Solution open-source ultra-spécialisée dans la répartition de charge (Load Balancing) et le proxying TCP/HTTP.
* **Fonctionnement :** Conçu pour maximiser la disponibilité et les performances réseau, il analyse et dispatche le trafic avec une précision chirurgicale.
* **Profil :** Architectures d'entreprise à très haut trafic où la fiabilité absolue du routage est la priorité, souvent utilisé en amont d'autres serveurs web.

#### C.1.3. Caddy
* **Présentation générale :** Serveur web moderne écrit en Go, célèbre pour sa gestion automatique des certificats HTTPS (Let's Encrypt).
* **Fonctionnement :** Met l'accent sur la simplicité "out-of-the-box" (prêt à l'emploi) avec un fichier de configuration (`Caddyfile`) extrêmement minimaliste.
* **Profil :** Développeurs et administrateurs cherchant à déployer des services rapidement sans se soucier de la gestion des certificats SSL/TLS.

#### C.1.4. Apache
* **Présentation générale :** Le serveur web historique, extrêmement modulaire et robuste, pilier de l'Internet depuis les années 90.
* **Fonctionnement :** Fonctionne historiquement de manière synchrone (un processus/thread par connexion), bien qu'il puisse être optimisé. Il gère de nombreux modules dynamiques.
* **Profil :** Hébergement mutualisé traditionnel, applications nécessitant des règles `.htaccess` spécifiques ou des architectures Legacy.

### C.2. Comparatifs des solutions

| Exigence | NGINX | HAProxy | Caddy | Apache |
| :--- | :--- | :--- | :--- | :--- |
| **[REQ-F01 (Pages sur-mesure)]** | Validé (Natif et très simple) | Évaluation (Possible mais moins adapté pour du statique) | Validé | Validé |
| **[REQ-F02 (Support HTTP/3)]** | Validé (Module officiel) | Validé | Validé (Natif par défaut) | Évaluation (Expérimental/Complexe) |
| **[REQ-T01 (CrowdSec)]** | Validé (Bouncer officiel mature) | Validé (Bouncer officiel) | Validé (Bouncer officiel récent) | Validé (Bouncer officiel) |
| **[REQ-T02 (Ansible)]** | Validé (Écosystème DevOps massif) | Validé | Évaluation (Configuration parfois "trop magique" à templater) | Validé (Mais syntaxe lourde) |
| **[REQ-T03 (Légèreté)]** | Validé | Validé (Excellent) | Validé | Non validé (Plus gourmand) |

## D. Solution proposée

La solution proposée pour l'infrastructure est **NGINX**.

Déployé directement sur le VPS Infomaniak, NGINX s'intègre parfaitement comme bouclier frontal pour LoutikCLOUD. Son intégration est entièrement automatisée via Ansible (rôles et templates Jinja2), ce qui garantit une reproductibilité totale de la configuration. Le trafic externe arrive sur l'IP publique fixe du VPS, est inspecté par le *bouncer* CrowdSec intégré à NGINX, puis, s'il est légitime, est acheminé de manière sécurisée vers mon OPNsense local. De plus, sa capacité native à agir comme un serveur web statique me permet de servir des pages d'erreurs élégantes et brandées "LoutikCLOUD" sans solliciter l'infrastructure backend. Enfin, la prise en charge de HTTP/3 assure une navigation fluide aux utilisateurs.

**Justification du rejet des solutions alternatives :**

* **Apache :** Son architecture historique basée sur les processus est beaucoup trop gourmande en ressources pour le simple rôle de reverse proxy sur un petit VPS. Sa syntaxe de configuration est également trop verbeuse pour une automatisation élégante.
* **HAProxy :** Bien qu'il soit le roi incontesté des performances réseau pures, il est moins intuitif que NGINX pour servir de simples pages HTML statiques (pages d'erreur 404/502). Il s'agit d'un outil surdimensionné pour ce besoin spécifique.
* **Caddy :** Caddy est fantastique pour sa gestion automatique du HTTPS. Cependant, la magie de sa configuration (qui fait beaucoup de choses par défaut) rend parfois le templating via Ansible moins granulaire et explicite qu'avec les blocs `server` et `location` très structurés de NGINX. L'intégration de CrowdSec sur NGINX dispose également d'une antériorité et d'une communauté DevSecOps plus vaste.

---

[^1]: **VPS (Virtual Private Server)** : Un serveur virtuel loué chez un fournisseur cloud (comme Infomaniak), offrant une machine disponible en permanence sur Internet avec une adresse IP fixe.
[^2]: **Redirection de ports (Port Forwarding)** : Règle réseau permettant d'autoriser et de transférer le trafic venant d'Internet vers une machine précise cachée dans un réseau local.
[^3]: **WAF (Web Application Firewall)** : Un bouclier de sécurité qui analyse en temps réel les requêtes web pour bloquer les comportements suspects et les cyberattaques.
[^4]: **Ansible** : Un outil d'Infrastructure as Code (IaC) qui permet de configurer et déployer des serveurs de manière totalement automatisée grâce à du code.
[^5]: **HTTP/3** : La dernière évolution du langage d'Internet. Il rend le chargement des sites plus rapide et plus résistant aux coupures réseau en utilisant un protocole moderne (QUIC).