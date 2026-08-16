---
title: Guide de rédaction d'un Post-Mortem
description: Guide complet pour rédiger un Post-Mortem efficace après un incident, afin d'analyser les causes, l'impact et les actions correctives.
---

# Guide de rédaction d'un Post-Mortem

## 1. Définition
Un Post-Mortem (ou RCA - *Root Cause Analysis*) est un document rédigé après un incident pour comprendre ce qui s'est passé et éviter que cela ne se reproduise. Ce n'est pas pour blâmer, mais pour apprendre.

## 2. Quand en rédiger un ?
* Lors d'une interruption de service (*Downtime*).
* Lors d'une perte de données.
* Lors d'un dysfonctionnement majeur impactant les utilisateurs.

## 3. Structure type (Template)

### Méta-données
* **Date de l'incident :** JJ/MM/AAAA
* **Service impacté :** Nom du service (ex: Application Web, API, Base de données)
* **Gravité :** Mineure / Majeure / Critique
* **Statut :** Résolu 🟢 | Non-résolu 🔴

### I. Résumé de l'incident (Executive Summary)
*Description narrative courte (2-3 phrases) : Que s'est-il passé globalement ? Quelle a été la durée de coupure ?*

### II. Impact Utilisateur
* **Symptôme :** Quel était le ressenti concret des utilisateurs (ex: page blanche, lenteur, erreur 403) ?
* **Périmètre :** Qui a été affecté (Tous les clients, Interne, Admin seulement) ?
* **Conséquences :** Répercussions métier (Perte de données, arrêt de production, etc.).

### III. Analyse de la cause racine (Root Cause Analysis)
* **Déclencheur technique :** Quel composant a initialement causé l'incident ?
* **Défaut de détection :** Pourquoi l'incident n'a-t-il pas été détecté plus tôt ?
* **Facteur aggravant :** Y a-t-il eu des éléments qui ont amplifié l'impact ?

### IV. Résolution et Correctif technique
* **Action immédiate :** Qu'a-t-on fait pour rétablir le service rapidement ?
* **Correctif durable :** Quelle modification technique a été appliquée (lien vers le fichier/commit) ?

### V. Analyse de risque résiduel (Optionnel)
* **Risque :** Y a-t-il des risques qui subsistent après la résolution ?
* **Mitigation :** Quelles mesures sont prises pour minimiser ces risques ?

### VI. Leçons apprises
* Quelles sont les principales leçons tirées pour l'avenir (Monitoring à ajouter, Doc à mettre à jour) ?

---

## 4. Exemple de Post-Mortem

````markdown
# Post-Mortem - Incident de bannissement abusif (Faux-positifs Outline)

**Phase 1 – Socle physique et réseau**

![Logo Loutik](/img/logo_loutik.png)

---
## Informations générales

- **Date de création :** 04/01/2026
- **Dernière modification :** 04/01/2026
- **Auteur :** MEDO Louis
- **Version :** 1.0

---
## Informations Post-Mortem

* **Date de l'incident :** 22 décembre 2025
* **Service impacté :** Outline (Wiki/Documentation)
* **Gravité :** Majeure (Indisponibilité de service pour utilisateurs légitimes)
* **Statut :** Résolu 🟢

---
## 1. Résumé de l'incident

Le 22 décembre, plusieurs utilisateurs ont signalé une perte d'accès à l'application Outline, se retrouvant bloqués par une page de bannissement de l'IPS (CrowdSec). L'incident a été causé par une règle de détection CrowdSec trop agressive vis-à-vis du comportement normal de l'API Outline (requêtes multiples avec token expiré). Un correctif (whitelist) a été déployé pour ignorer ces erreurs spécifiques.

---
## 2. Impact Utilisateur

* **Symptôme :** Les utilisateurs dont la session Outline venait d'expirer ne pouvaient pas se reconnecter. Ils recevaient une réponse 403 (Forbidden) générée par le pare-feu applicatif.
* **Périmètre :** Utilisateurs internes ayant une session active en arrière-plan.
* **Conséquence :** Interruption de service nécessitant une intervention manuelle (unban) avant l'application du correctif global.

---
## 3. Analyse de la Cause Racine (Root Cause Analysis)

- **Déclencheur technique :** L'application Outline est une "Single Page Application" (SPA). Lorsqu'un token de session expire, le client tente de rafraîchir les données ou d'accéder à l'API, générant une rafale de requêtes en échec (Codes HTTP **401 Unauthorized** ou **403 Forbidden**).
- **Défaut de détection :** CrowdSec a interprété cette série rapide d'erreurs 401/403 provenant d'une même IP comme une tentative de force brute (scénario `crowdsecurity/http-crawl-non_statics` ou `http-generic-401-bf`).
- **Facteur aggravant :** Le parser Nginx par défaut ne distingue pas un échec d'authentification légitime (token expiré) d'une attaque malveillante sur ces endpoints spécifiques.

---
## 4. Résolution et Correctif technique

Pour rétablir le service et prévenir la récidive, une règle d'exclusion (whitelist) a été développée.

**Action réalisée :** Création d'un parser personnalisé ciblant spécifiquement les logs Nginx de l'API Outline.

- **Fichier :** `/etc/crowdsec/parsers/s02-enrich/outline-whitelist.yaml`
- **Logique appliquée :** Utilisation d'une Regex sur la ligne de log brute (`evt.Line.Raw`) pour contourner les ambiguïtés de parsing (String vs Int).

**Code de la whitelist :**
```yaml
name: custom/outline-whitelist-final
description: "Whitelist brute pour l'API Outline"
whitelist:
  reason: "Outline API False Positives (Auth 401/403)"
  expression:
    # Autorise les erreurs 401/403 uniquement sur les routes /api/
    - evt.Line.Raw matches ".* /api/.*" && evt.Line.Raw matches ".* (401|403) .*"
```
> Pensez à redémarrer CrowdSec après la mise en place de la whitelist (`systemctl reload crowdsec`).

---

## 5. Analyse de risque résiduel

En appliquant cette whitelist, CrowdSec cesse de surveiller les tentatives de brute-force sur les routes `/api/` d'Outline.

* **Risque :** Un attaquant pourrait tenter de deviner des identifiants via l'API sans être banni par l'IPS.
* **Mitigation :** Ce risque est accepté car l'application Outline intègre nativement une limitation de débit (*rate-limiting*) et des délais progressifs sur les échecs d'authentification. La sécurité est déléguée à la couche applicative pour ce périmètre précis.

---

## 6. Leçons apprises

* **Surveillance :** Les logs d'erreurs 4xx doivent être corrélés avec le type d'application (SPA vs Site statique) lors de la mise en place d'un WAF.
* **Configuration :** Les parsers CrowdSec nécessitent une attention particulière sur le type des données (Int/String) lors de l'écriture de règles custom (d'où l'utilisation de `evt.Line.Raw` pour la robustesse).
````