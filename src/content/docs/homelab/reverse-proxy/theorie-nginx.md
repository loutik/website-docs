---
title: "Théorie - NGINX"
description: "Cours et concepts fondamentaux autour du Reverse Proxy NGINX."
sidebar:
  order: 1
---

## A. Présentation

Un reverse proxy (ou proxy inverse) agit comme l'unique porte d'entrée d'une infrastructure comme LoutikCLOUD. Lorsqu'un visiteur demande à accéder à un service, NGINX intercepte la requête, vérifie sa validité, et la redirige discrètement vers le bon serveur en arrière-plan. Cela permet de masquer la complexité du réseau interne tout en centralisant le contrôle du trafic.

:::note
Contrairement à un proxy classique qui protège les utilisateurs (en cachant leur origine vers Internet), le reverse proxy protège les serveurs (en cachant l'infrastructure interne aux yeux d'Internet).
:::

## B. Problématiques résolues

* **Sécurité et exposition restreinte :** Évite d'exposer directement les serveurs d'applications et les bases de données sur Internet. NGINX encaisse les requêtes et filtre le trafic.
* **Centralisation des certificats SSL/TLS[^1] :** Gère le chiffrement HTTPS en un seul point de contrôle plutôt que de devoir le configurer individuellement sur chaque application.
* **Répartition de charge (Load Balancing)[^2] :** Distribue intelligemment le trafic entrant sur plusieurs serveurs ou conteneurs pour éviter les surcharges.

## C. Fonctionnement

NGINX fonctionne de manière asynchrone et événementielle, ce qui lui permet de traiter des milliers de connexions simultanées avec une empreinte mémoire extrêmement faible. Il lit ses fichiers de configuration pour savoir comment router chaque requête HTTP/HTTPS[^3] entrante.

* **Le Worker Process :** C'est le moteur de NGINX. Au lieu de créer un nouveau processus lourd pour chaque visiteur, un *worker* unique gère de multiples connexions simultanément grâce à une boucle d'événements.
* **Le Server Block (Virtual Host) :** C'est la règle de routage. Il indique à NGINX : "Si on te demande *app.loutik.cloud*, envoie le trafic vers l'adresse interne *10.0.0.50* sur le port *8080*".

## D. Exemples

* **Hébergement multi-sites :** Héberger un blog, une instance Nextcloud et un portail d'audit sur la même adresse IP publique. NGINX lit le nom de domaine demandé et aiguille la requête vers le bon conteneur Docker.
* **Terminaison SSL :** Décharger les serveurs internes de la lourdeur du chiffrement. NGINX s'occupe de la sécurisation HTTPS avec Let's Encrypt côté public, puis dialogue en HTTP simple et rapide avec les applications locales.

## E. Bonnes pratiques

| Règle | Catégorie | Justification |
| :--- | :--- | :--- |
| **Désactiver les tokens (server_tokens off;)** | Sécurité | Masque le numéro de version de NGINX dans les en-têtes HTTP pour compliquer la tâche des attaquants cherchant des failles connues. |
| **Forcer la redirection HTTPS** | Sécurité | Garantit que toutes les communications entre le client et l'infrastructure soient systématiquement chiffrées. |
| **Modulariser la configuration** | Maintenance | Utiliser un fichier de configuration distinct par service (`/etc/nginx/conf.d/`) pour faciliter l'automatisation (via Ansible, par exemple) et le dépannage. |

---

[^1]: **SSL/TLS** : Un protocole de sécurité qui crée un tunnel chiffré (le fameux cadenas dans le navigateur) pour protéger les données échangées contre l'interception.
[^2]: **Load Balancing** : Technique consistant à répartir la charge de travail entre plusieurs machines identiques pour qu'aucune ne tombe en panne sous la pression.
[^3]: **HTTP/HTTPS** : Le langage de communication (protocole) standard utilisé par les navigateurs web pour demander et afficher des pages internet de manière claire ou sécurisée.