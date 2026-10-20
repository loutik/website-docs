---
title: "Post-Mortem - Incident Nginx du 20 Octobre 2026"
description: "Analyse, chronologie et plan d'action suite à l'incident concernant le Reverse Proxy Nginx."
sidebar:
  order: 4
---

:::danger[Détails de l'incident]
- **Durée de l'indisponibilité :** Environ 8 heures (de 01h13 à 9h02)
- **Services impactés :** L'intégralité des services de l'infrastructure LoutikCLOUD
- **Sévérité :** Critique
:::

## A. Résumé

Suite à une maintenance planifiée par notre hébergeur Infomaniak, le serveur hébergeant notre reverse proxy [^1] a subi un redémarrage à 01h13 du matin. Au démarrage du système, le service Nginx n'a pas réussi à s'initialiser, ce qui a entraîné une coupure totale des accès extérieurs vers l'infrastructure LoutikCLOUD. Tous les services hébergés ont été rendus indisponibles jusqu'à l'intervention manuelle à 9h02.

## B. Chronologie

L'incident a débuté à **01h13** avec le redémarrage automatique du serveur, provoquant immédiatement l'échec critique du lancement du service `nginx.service` au démarrage de l'OS.

L'indisponibilité a été détectée à **08h56**. L'investigation a démarré avec la vérification de l'état du service (`sudo systemctl status nginx`), confirmant un arrêt pour cause d'échec (`status=1/FAILURE`). Deux minutes plus tard, à **08h58**, l'analyse de la configuration via `nginx -t` a révélé l'erreur bloquante : `host not found in upstream "vip.prd.k3s.infra.loutik.fr"`. 

Le service a finalement été rétabli à **9h02** via une simple relance manuelle (`sudo systemctl restart nginx`), confirmant que l'anomalie était strictement liée à l'ordre de démarrage initial.

## C. Cause Racine (RCA)

Par défaut, Nginx effectue une vérification stricte de sa configuration avant de démarrer. Si des noms de domaine sont configurés dans les directives de routage (`proxy_pass`), Nginx exige de pouvoir les résoudre immédiatement en adresse IP.

Lors du redémarrage du serveur, le gestionnaire de services système (systemd) a lancé Nginx alors que le serveur DNS local n'était pas encore pleinement opérationnel. Incapable de résoudre l'hôte cible, Nginx a généré une erreur fatale et s'est arrêté. Le composant n'étant pas configuré pour réessayer en cas d'échec, le serveur web est resté éteint de manière permanente.

## D. Remédiation

Le trafic réseau a été restauré instantanément grâce à une relance manuelle. Pour garantir la résilience du service lors des futurs redémarrages, un correctif IaC [^2] automatisé a été déployé via Ansible. Ce correctif implémente un fichier `override.conf` [^3] qui instruit systemd de relancer automatiquement Nginx en cas d'échec (`Restart=on-failure` avec un délai de 5 secondes).

**Figure 1 - fichier de configuration override.conf de NGINX :**

```ini
[Service]
Restart=on-failure
RestartSec=5s
```

**Figure 2 - Extrait du rôle Ansible dédié à la configuration de NGINX avec le correctif :**

```yml
- name: Créer le répertoire pour l'override systemd de Nginx
  ansible.builtin.file:
    path: /etc/systemd/system/nginx.service.d
    state: directory
    owner: root
    group: root
    mode: '0755'

- name: Déployer la configuration de retry (override) pour Nginx
  ansible.builtin.copy:
    src: nginx-override.conf
    dest: /etc/systemd/system/nginx.service.d/override.conf
    owner: root
    group: root
    mode: '0644'
  notify: reload_systemd
```

**Figure 2 - Extrait du handler Ansible dédié à la configuration de NGINX avec les instructions pour relancer le daemon :**

```yml
- name: Reload systemd
  ansible.builtin.systemd:
    daemon_reload: yes
    name: nginx
    state: restarted
  listen: reload_systemd
```

## E. Plan d'action préventif

Pour éviter qu'une défaillance similaire ne paralyse l'ensemble de l'infrastructure, les actions suivantes seront mises en place :

* **Haute Disponibilité multi-hébergeur [^4] :** Déploiement d'un second reverse proxy (serveur web) chez un prestataire différent pour garantir une bascule automatique en cas de perte du nœud principal.
* **Supervision et Alerting (Grafana) :** Mise en place d'une surveillance continue de l'état du service Nginx pour déclencher des alertes immédiates en cas d'inaccessibilité.
* **Analyse des journaux (Loki) :** Collecte et surveillance en temps réel des logs Nginx via Loki pour détecter, diagnostiquer et alerter sur les erreurs critiques au démarrage.

---

[^1]: **Reverse proxy** : Serveur intermédiaire placé devant les serveurs web internes. Il intercepte les requêtes provenant d'Internet et les redistribue vers le bon service.
[^2]: **IaC (Infrastructure as Code)** : Pratique consistant à gérer et provisionner l'infrastructure via du code (ici, Ansible) plutôt que par des processus manuels, garantissant reproductibilité et fiabilité.
[^3]: **Override systemd** : Fichier de configuration additionnel permettant de surcharger le comportement par défaut d'un service système Linux sans altérer son fichier d'installation original.
[^4]: **Haute Disponibilité (HA)** : Conception d'une infrastructure visant à garantir un fonctionnement continu des services, souvent en multipliant les équipements (redondance) pour éviter un point de défaillance unique (SPOF).
