---
title: "Pratique - OPNsense"
description: "Déploiement, architecture et retour d'expérience sur l'intégration d'OPNsense dans l'infrastructure."
sidebar:
  order: 3
---

## A. Contexte

Dans l'infrastructure LoutikCLOUD, OPNsense occupe la place centrale. Il n'est pas virtualisé, mais installé directement sur un matériel dédié (un HP T730 dit "bare-metal"). Ce choix garantit que le réseau reste opérationnel même en cas de maintenance ou de panne de mes hyperviseurs Proxmox. Il agit comme le point de terminaison de mon réseau local, gérant la connexion vers Internet (via ma box opérateur sur le port `WAN`), et distribuant le trafic vers de multiples réseaux isolés (VLANs) sur son port `LAN`. C'est lui qui héberge le tunnel VPN (Tailscale) permettant de relier mon infrastructure locale au proxy frontal situé chez Infomaniak.

## B. Architecture

L'architecture s'articule autour d'une approche "Zero Trust" intra-réseau. Plutôt que d'avoir un grand réseau plat où toutes les machines discutent librement, OPNsense découpe et route le trafic (réseau `10.0.x.0/16`) à travers de multiples VLANs hermétiques, regroupés par zones de sécurité logiques.

```text
                                [ INTERNET ]
                                     |
                                  (WAN)
+-------------------------------------------------------------------------+
|                          OPNsense (HP T730)                             |
|                                                                         |
|  [ IPS Suricata ] <---> [ Pare-feu (Règles strictes) ] <---> [ Routage] |
+-------------------------------------------------------------------------+
                                     |
                             (Trunk 802.1Q)
                                     |
      +------------------+-----------+-------+------------------+
      |                  |                   |                  |
[ DMZ Externe ]    [ DMZ Interne ]        [ ZDR ]            [ LAN ]
- VLAN 10 (VPN)    - VLAN 12 (Services)   - VLAN 17 (DB)     - VLAN 19 (Users)
- VLAN 11 (Bastion)- VLAN 13 (Infra)      - VLAN 18 (PKI)    - VLAN 20 (Admoob)
                   - VLAN 14 (Supervision)
                   - VLAN 15 (Deploy)     +---------------------------+
                   - VLAN 16 (Backup)     |      [ Pre-Production ]   |
                   - VLAN 23 (Proxy)      | - VLAN 21 & 22 (Dev/Test) |
                                          +---------------------------+

```

Cette macro-segmentation permet un contrôle granulaire. Par exemple, la Zone de Diffusion Restreinte (ZDR) abritant les bases de données (VLAN 17) est strictement isolée d'Internet et n'accepte des requêtes que depuis la DMZ Interne (VLAN 12) sur le port PostgreSQL.

## C. Déploiement

Contrairement au reste de l'infrastructure, la configuration pure d'OPNsense n'a pas été réalisée via Ansible (IaC[^1]). Bien que l'outil propose une API, celle-ci ne couvre pas l'intégralité des fonctionnalités requises. Tenter de tout automatiser importait une complexité disproportionnée (développement de modules complexes) pour un faible retour sur investissement, sachant qu'il n'y a qu'un seul routeur physique dans ce homelab. J'ai donc opté pour une configuration manuelle via l'interface web.

Cependant, l'automatisation conserve un rôle critique pour la pérennité du service :

* **Configuration manuelle structurée :** Création des interfaces (`vlan0.11` à `vlan0.23`), configuration du pare-feu avec une politique de rejet par défaut ("Default Deny"), et mise en place des services (Unbound DNS, Tailscale, Suricata).
* **Sauvegardes automatisées via Ansible :** Un rôle Ansible dédié se connecte régulièrement à l'API d'OPNsense avec un compte de service restreint (`svc-opnsense-backup`). Il orchestre l'export du fichier de configuration XML et le pousse sécuritairement vers mon instance Proxmox Backup Server (PBS) locale, ainsi que vers mon Nextcloud distant (Infomaniak) pour le stockage froid hors-site.

## D. Difficultés

Lors de la mise en place et de l'exploitation, plusieurs incidents riches en enseignements se sont produits :

* **Auto-blocage par l'IDS/IPS :** Lors de l'activation du moteur de détection d'intrusions (Suricata), des règles un peu trop agressives ont identifié mon trafic d'administration légitime comme une menace. Conséquence : blocage total de l'accès à l'interface web d'OPNsense. J'ai dû implémenter une règle explicite d'anti-lockout pour le sous-réseau d'administration (`10.0.20.0/24`) afin de m'en prémunir définitivement.
* **Perte d'accès à distance via le VPN :** Suite à une mauvaise manipulation lors d'une révision des règles de filtrage sur l'interface virtuelle Tailscale (`opt2`), j'ai totalement coupé mon accès externe à l'infrastructure. La résolution a nécessité une intervention physique locale sur le VLAN d'administration pour annuler la modification.    
* **Corruptions silencieuses de configuration :** À un moment donné, des morceaux entiers de ma configuration (règles, alias) disparaissaient aléatoirement après des redémarrages. Le diagnostic a révélé que le disque SSD NVMe[^2] du HP T730 était défectueux. Grâce à ma stratégie de sauvegarde automatisée Ansible, j'ai pu remplacer le disque, réinstaller l'OS et réinjecter le fichier XML en moins de dix minutes.

---

[^1]: **IaC (Infrastructure as Code)** - Pratique consistant à gérer et configurer des infrastructures informatiques à l'aide de fichiers de code (comme Ansible ou Terraform) plutôt que via des interfaces graphiques manuelles.
[^2]: **SSD NVMe (Non-Volatile Memory express)** - Un type de composant de stockage matériel ultra-rapide qui se branche directement sur la carte mère de l'ordinateur, remplaçant les anciens disques durs mécaniques.