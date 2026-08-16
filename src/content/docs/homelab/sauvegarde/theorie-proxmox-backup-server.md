---
title: "Théorie - Proxmox Backup Server"
description: "Cours et concepts fondamentaux autour de Proxmox Backup Server."
sidebar:
  order: 1
---

## A. Présentation

Proxmox Backup Server (PBS) est une solution de sauvegarde d'entreprise taillée sur mesure pour les environnements virtualisés (notamment Proxmox VE). Son but principal est de sauvegarder et de restaurer des machines virtuelles, des conteneurs et des hôtes physiques de la manière la plus rapide et la plus économe en espace de stockage possible. Contrairement à une simple copie de fichiers, PBS est conçu pour manipuler intelligemment les données à grande échelle.

:::note
Si Proxmox VE est l'usine qui fait tourner vos serveurs, Proxmox Backup Server est le coffre-fort hautement sécurisé et optimisé qui en conserve les plans et l'état à l'instant T.
:::

## B. Problématiques résolues

* **L'explosion de l'espace de stockage :** Les sauvegardes traditionnelles complètes prennent énormément de place. PBS résout cela grâce à la déduplication[^1], qui garantit qu'un même bloc de données n'est stocké qu'une seule fois sur le disque, même s'il est présent sur 50 serveurs différents.
* **Les fenêtres de sauvegarde trop longues :** Copier des téraoctets de données chaque nuit sature le réseau et ralentit les disques. PBS utilise des sauvegardes incrémentielles[^2] rapides, ne transmettant au serveur que les blocs qui ont été modifiés depuis la veille.

## C. Fonctionnement

La logique interne de PBS repose sur un découpage chirurgical de l'information. Lorsqu'une sauvegarde est lancée, le système source ne transfère pas un gros bloc monolithique. Il lit le disque virtuel, le découpe en petits morceaux (les *chunks*), calcule leur empreinte numérique, et demande à PBS : "As-tu déjà ce morceau ?". Si oui, il ne l'envoie pas.

* **Le datastore :** Le *Datastore* est le disque physique ou le dossier où sont stockées les données brutes. 
* **Les namespaces :** Les *Namespaces* (espaces de noms) permettent de créer des dossiers virtuels à l'intérieur de ce Datastore pour organiser proprement les sauvegardes (ex: séparer le lab de développement de la production) sans perdre le bénéfice de la déduplication globale.
* **Le garbage collection :** C'est le processus de nettoyage de PBS. Lorsque de vieilles sauvegardes sont supprimées, leurs "morceaux" restent sur le disque car ils pourraient appartenir à d'autres sauvegardes plus récentes. Le *Garbage Collection* inspecte tout le stockage et supprime physiquement les blocs devenus totalement orphelins.

## D. Exemples

* **Restauration granulaire d'un fichier :** Un utilisateur supprime par erreur un fichier critique dans une machine virtuelle Linux (VLAN Utilisateur). Au lieu de restaurer les 50 Go de la machine virtuelle entière, l'administrateur explore le contenu de la sauvegarde directement depuis l'interface PBS, télécharge uniquement le fichier `.conf` manquant et le réinjecte.
* **Sauvegarde hors-site optimisée :** Dans le cadre de LoutikCLOUD, un serveur PBS local sauvegarde les machines tous les soirs. PBS est capable de se synchroniser de manière chiffrée avec un second PBS (ou un stockage externe) situé dans le cloud. Comme il ne transfère que les blocs dédupliqués modifiés, la synchronisation ne prend que quelques secondes même sur une petite connexion internet.

## E. Bonnes pratiques

| Règle | Catégorie | Justification |
| :--- | :--- | :--- |
| **Chiffrement côté client** | Sécurité | Les données doivent être chiffrées par le serveur source (Proxmox VE) *avant* de transiter sur le réseau et d'être stockées sur PBS. Ainsi, même si le serveur de backup est compromis ou volé, les données sont illisibles sans la clé cryptographique[^3]. |
| **Automatisation du Pruning et du GC** | Maintenance | Il faut configurer des tâches planifiées pour le *Prune* (la suppression des vieilles sauvegardes selon une politique de rétention) suivi du *Garbage Collection*. Sans cela, le serveur finira inéluctablement par saturer son espace disque. |
| **Ségrégation réseau (VLAN dédié)** | Sécurité / Performance | Le trafic de sauvegarde est massif et critique. Placer PBS sur un VLAN de management dédié isole les données sensibles du trafic public et empêche la saturation de la bande passante allouée aux applications des utilisateurs. |

---

[^1]: **Déduplication** - Technique informatique consistant à identifier les données répétées en double (ou en mille exemplaires) et à n'en conserver qu'une seule copie physique pour économiser drastiquement l'espace sur les disques durs.
[^2]: **Sauvegarde incrémentielle** - Méthode de sauvegarde qui consiste à ne sauvegarder que les données qui ont été ajoutées ou modifiées depuis la toute dernière sauvegarde effectuée, ce qui fait gagner beaucoup de temps.
[^3]: **Clé cryptographique** - Une sorte de mot de passe mathématique extrêmement long et complexe, indispensable pour verrouiller (chiffrer) ou déverrouiller (déchiffrer) des données confidentielles.