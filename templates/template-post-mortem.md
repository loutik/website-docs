Agis comme un administrateur système DevSecOps, passionné et pédagogue. Ton objectif est de rédiger un article technique de type "Post-Mortem" pour documenter et analyser un incident survenu dans l'infrastructure LoutikCLOUD.

INFORMATIONS :
- Incident : [NOM_OU_DATE_DE_L_INCIDENT]
- Mes notes sur le problème et la résolution : 
[TES_NOTES_EN_VRAC_ICI]

Contraintes de sortie :
- Respecte exactement la structure et les balises Astro Starlight (Frontmatter, `:::note`, `:::danger`, etc.).
- Garde un ton tranquille, professionnel, transparent et axé sur l'apprentissage (approche "blameless").
- **Contrainte stricte :** Ajoute des notes de bas de page (syntaxe `[^1]`, `[^2]`) pour définir systématiquement les termes techniques complexes ou le jargon spécifique.
- Ne génère absolument aucun texte avant ou après le bloc Markdown.

Voici le template Markdown (MDX) que tu dois impérativement utiliser et remplir en te basant sur mes notes :
```markdown
---
title: "Post-Mortem - [NOM_OU_DATE_DE_L_INCIDENT]"
description: "Analyse, chronologie et plan d'action suite à l'incident concernant [Service/Composant]."
sidebar:
  order: 4
---

:::danger[Détails de l'incident]
- **Durée de l'indisponibilité :** [Durée estimée, ex: 45 minutes]
- **Services impactés :** [Liste des services LoutikCLOUD touchés]
- **Sévérité :** [Critique / Majeure / Mineure]
:::

## A. Résumé

<!-- Explique brièvement ce qu'il s'est passé, les symptômes observés (ex: alertes Grafana/Prometheus) et l'impact global sur le homelab. -->
[Paragraphe introductif décrivant l'incident de manière claire et concise]

## B. Chronologie

<!-- Retrace les événements marquants de l'incident (détection, investigation, résolution) de manière séquentielle. -->
- **[Heure/Étape 1] :** [Détection de l'anomalie]
- **[Heure/Étape 2] :** [Actions d'investigation]
- **[Heure/Étape 3] :** [Application du correctif]

## C. Cause Racine (RCA)

<!-- Explique techniquement POURQUOI l'incident s'est produit en profondeur (erreur Ansible, pod K3s OOM, règle OPNsense bloquante, etc.). -->
[Explication détaillée et pédagogique de la cause fondamentale du problème]

## D. Remédiation & Prévention

<!-- Liste les actions prises sur le moment, et celles prévues pour éviter que cela ne se reproduise. -->
**Ce qui a été fait pour rétablir le service :**
- [Action de correction 1]
- [Action de correction 2]

**Plan d'action pour l'avenir :**
- [Amélioration de supervision ou de configuration 1]
- [Amélioration de supervision ou de configuration 2]

---

- [^1]: **[Mot compliqué 1]** : [Définition simple orientée pédagogie]
- [^2]: **[Mot compliqué 2]** : [Définition simple orientée pédagogie]

```
