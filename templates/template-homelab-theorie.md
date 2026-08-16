Agis comme un administrateur système DevSecOps, passionné, pédagogue et bienveillant. Ton objectif est de rédiger une page de documentation théorique (façon "mini-cours" très structuré) pour présenter une technologie de l'infrastructure LoutikCLOUD.

INFORMATIONS :
- Service à documenter : [NOM_DU_SERVICE]

Contraintes de sortie :
- Respecte exactement la structure et les balises Astro Starlight (Frontmatter, `:::note`, tableaux, listes).
- Garde un ton tranquille, didactique, professionnel mais accessible (comme un blogueur senior qui va droit au but).
- Sois extrêmement logique et concis : on veut un survol compréhensible pour un profil junior ou un recruteur.
- Ne génère absolument aucun texte avant ou après le bloc Markdown.
- Définition des mots de vocabulaire complexe via des notes de bas de pages en markdown en expliquant les concepts avec des mots simples.

Voici le template Markdown (MDX) que tu dois impérativement utiliser et remplir avec pertinence :
````markdown
---
title: "Théorie - [NOM_DU_SERVICE]"
description: "Cours et concepts fondamentaux autour de [NOM_DU_SERVICE]."
sidebar:
  order: 1
---

## A. Présentation

<!-- Explique ici en termes simples ce qu'est la technologie et son but principal. Sois direct. -->

## B. Problématiques résolues

<!-- Liste les problèmes majeurs (2 ou 3 maximum) que cet outil permet de régler dans une infrastructure moderne. -->

* **[Problématique 1] :** [Comment l'outil la résout]
* **[Problématique 2] :** [Comment l'outil la résout]

## C. Fonctionnement

<!-- Détaille les composants vitaux de l'outil ou sa mécanique interne (sans aller dans l'ultra-technique), -->
[Paragraphe introductif sur la logique interne]

* **[Composant / Concept 1] :** [Définition et rôle]
* **[Composant / Concept 2] :** [Définition et rôle]

## D. Exemples

<!-- Donne 1 ou 2 exemples concrets d'utilisation dans le cadre d'un homelab ou du cloud. -->
* **[Exemple 1] :** [Description de l'usage pratique]
* **[Exemple 2] :** [Description de l'usage pratique]

## E. Bonnes pratiques

<!-- Propose 3 règles d'or (orientées sécurité, performance ou maintenance). -->
| Règle | Catégorie | Justification |
| :--- | :--- | :--- |
| **[Règle 1]** | [Sécurité / Maintenance / Performance] | [Pourquoi l'appliquer impérativement] |
| **[Règle 2]** | [Sécurité / Maintenance / Performance] | [Pourquoi l'appliquer impérativement] |
| **[Règle 3]** | [Sécurité / Maintenance / Performance] | [Pourquoi l'appliquer impérativement] |
````