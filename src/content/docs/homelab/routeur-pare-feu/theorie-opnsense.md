---
title: "Théorie - OPNsense"
description: "Cours et concepts fondamentaux autour d'OPNsense."
sidebar:
  order: 1
---

## A. Présentation

OPNsense est une plateforme open-source de routage et de pare-feu (firewall). Son but principal est de sécuriser, de diriger et d'analyser le trafic réseau qui entre, qui sort, ou qui circule au sein de l'infrastructure. Il agit comme le point de contrôle central (la douane et le chef d'orchestre) du réseau, garantissant que seules les communications légitimes sont autorisées.

:::note
Bien qu'il soit souvent comparé à de simples routeurs de box internet, OPNsense offre des fonctionnalités de niveau entreprise (filtrage avancé, VPN, détection d'intrusions) indispensables pour maîtriser son infrastructure de bout en bout.
:::

## B. Problématiques résolues

* **Sécurité périmétrique et interne :** Empêche les attaques venant d'Internet d'atteindre les serveurs locaux, mais protège également les différentes zones du réseau interne entre elles (pour éviter qu'une machine compromise ne contamine les autres).
* **Segmentation et isolation du trafic :** Permet de découper physiquement ou logiquement le réseau pour séparer, par exemple, un environnement d'expérimentation (homelab) du réseau familial principal.

## C. Fonctionnement

OPNsense fonctionne en interceptant les paquets de données (le trafic réseau) au niveau de ses interfaces (les ports réseau de la machine). Il lit les étiquettes de ces paquets (source, destination, port) et les confronte à une liste de règles strictes lues de haut en bas pour prendre une décision : bloquer, rejeter ou autoriser.

* **Le Pare-feu Stateful[^1] :** C'est le moteur de sécurité. Il ne se contente pas d'appliquer des règles bêtes ; il comprend quelles connexions ont été légitimement initiées de l'intérieur pour autoriser automatiquement le trafic de retour, sans nécessiter de règle supplémentaire.
* **Le Routage :** Le routage détermine le meilleur chemin pour qu'un paquet atteigne sa destination entre différents sous-réseaux. 
* **Le NAT[^2] :** Le NAT permet à plusieurs machines d'un réseau local privé d'utiliser une seule adresse IP publique pour naviguer sur Internet.

## D. Exemples

* **Déploiement de VLANs[^3] pour l'hygiène réseau :** Isoler les flux d'administration (accès aux hyperviseurs Proxmox, iLO) sur un VLAN dédié, strictement séparé du VLAN des conteneurs applicatifs publics (comme K3s) ou du Wi-Fi invité.
* **Passerelle VPN sécurisée :** Configurer un serveur WireGuard ou OpenVPN directement sur OPNsense pour permettre aux administrateurs de se connecter à l'infrastructure de manière chiffrée depuis n'importe où dans le monde, comme s'ils étaient sur place.

## E. Bonnes pratiques

| Règle | Catégorie | Justification |
| :--- | :--- | :--- |
| **Règle du "Default Deny"** | Sécurité | Bloquer absolument tout le trafic par défaut à la fin de la liste des règles, et n'autoriser que les flux strictement nécessaires (Principe du moindre privilège). |
| **Sauvegarde automatisée** | Maintenance | Externaliser régulièrement la configuration XML (via Ansible ou Rclone vers un stockage froid type Nextcloud) pour remonter l'infrastructure en quelques minutes en cas de crash matériel. |
| **Nommage clair des alias** | Maintenance / Performance | Utiliser des "Alias" (des groupes de ports ou d'IP nommés, ex: `SERVEURS_INFRA`) plutôt que de taper les adresses IP en dur dans les règles. Cela allège la lecture et accélère la mise à jour des règles. |

---

[^1]: **Stateful (à états)** - Un pare-feu intelligent qui garde en mémoire (dans une table d'états) les connexions actives. S'il voit qu'un PC du réseau a demandé à afficher un site web, il laisse naturellement entrer la réponse du site web sans bloquer la porte.
[^2]: **NAT (Network Address Translation)** - Mécanisme qui traduit les adresses IP privées (invisibles sur Internet) en une adresse IP publique pour communiquer avec l'extérieur, masquant ainsi la topologie interne du réseau.
[^3]: **VLAN (Virtual Local Area Network)** - Technologie permettant de créer plusieurs réseaux locaux logiques virtuels et totalement isolés en utilisant le même matériel physique (câbles et switchs).