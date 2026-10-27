---
title: "Choix - PKI step-ca"
description: "Explication et justification du choix technique de step-ca au sein de LoutikCLOUD."
sidebar:
  order: 2
---

## A. Contexte

Dans le cadre du développement de LoutikCLOUD, l'infrastructure s'est complexifiée avec l'ajout de multiples services internes (hyperviseurs Proxmox, pare-feu OPNsense, cluster K3s[^1]). Historiquement, ces interfaces d'administration utilisaient des certificats auto-signés, générant des alertes de sécurité dans les navigateurs et compliquant les automatisations via API.

L'utilisation d'autorités publiques comme Let's Encrypt est inadaptée pour nos services d'infrastructure critiques : elle nécessiterait d'exposer ces services sur Internet ou de complexifier la gestion DNS pour la validation. L'objectif est donc de déployer une PKI[^2] interne capable de délivrer des certificats de confiance pour nos réseaux privés, tout en garantissant un renouvellement automatisé sans intervention humaine (approche "Zero-Touch").

## B. Cahiers des charges

| ID | Type | Exigence | Description |
| :--- | :--- | :--- | :--- |
| **[REQ-F01]** | Fonctionnel | Support natif du protocole ACME[^3] | La solution doit agir comme un serveur ACME pour permettre aux clients (Proxmox, OPNsense, cert-manager) de renouveler leurs certificats automatiquement. |
| **[REQ-F02]** | Fonctionnel | Légèreté et faible empreinte | L'outil doit consommer très peu de ressources (RAM/CPU) pour s'intégrer discrètement dans un conteneur ou une petite machine virtuelle. |
| **[REQ-T01]** | Technique | Intégration Cloud-Native | Doit s'intégrer facilement avec l'écosystème Kubernetes (via cert-manager) et permettre une gestion déclarative (GitOps). |
| **[REQ-T02]** | Technique | Support de l'authentification moderne | Capacité à s'interfacer avec des flux OIDC[^4] pour permettre aux utilisateurs ou aux machines de s'authentifier de manière sécurisée. |

## C. Les solutions du marché

### C.1. Présentations des solutions

#### C.1.1. step-ca (Smallstep)
- **Présentation générale :** Serveur d'autorité de certification open-source, moderne et taillé pour le DevSecOps. Il agit comme un équivalent privé à Let's Encrypt.
- **Fonctionnement :** Expose une API et supporte nativement le protocole ACME. Il s'appuie sur une hiérarchie classique (Root CA hors-ligne, Intermediate CA en ligne) pour signer les requêtes.
- **Profil :** Orienté automatisation, cloud-native, adapté des homelabs jusqu'aux entreprises cherchant à sécuriser leurs microservices (Zero-Trust[^5]).

#### C.1.2. HashiCorp Vault (Moteur PKI)
- **Présentation générale :** Solution open-source (édition communautaire) massivement reconnue pour la gestion des secrets, incluant un moteur PKI puissant.
- **Fonctionnement :** Repose sur une architecture centralisée stockant tous les secrets d'une infrastructure. Le moteur PKI permet de générer des certificats à la volée via API.
- **Profil :** Orienté grandes entreprises et architectures complexes nécessitant une gestion fine des secrets, du chiffrement de bout en bout et des accès dynamiques.

#### C.1.3. Easy-RSA / Scripts OpenSSL
- **Présentation générale :** Ensemble de scripts shell historiques permettant de gérer une infrastructure de clés publiques de base.
- **Fonctionnement :** Basé sur des commandes exécutées manuellement dans un terminal pour générer des clés, des demandes de signature (CSR) et des certificats.
- **Profil :** Orienté administrateurs systèmes traditionnels, souvent utilisé pour configurer rapidement des VPN (comme OpenVPN) de manière statique.

### C.2. Comparatifs des solutions

| Exigence | step-ca (Smallstep) | HashiCorp Vault | Easy-RSA / OpenSSL |
| :--- | :--- | :--- | :--- |
| **[REQ-F01 (ACME)]** | Validé | Validé (via configurations complexes) | Non validé (Manuel) |
| **[REQ-F02 (Légèreté)]** | Validé (Très léger, < 100 Mo RAM) | Non validé (Consommation élevée) | Validé (Scripts statiques) |
| **[REQ-T01 (Cloud-Native)]**| Validé (Intégration cert-manager parfaite) | Validé (Excellente intégration) | Non validé |
| **[REQ-T02 (OIDC)]** | Validé (Support natif) | Validé (Support natif complet) | Non validé |

## D. Solution proposée

La solution proposée pour l'infrastructure est **step-ca (Smallstep)**.

Cette technologie s'intègre parfaitement dans la vision DevSecOps de LoutikCLOUD. Déployé en tant que conteneur léger, step-ca fournit un point d'accès ACME privé sur notre réseau de management. Concrètement, le client ACME natif de Proxmox VE et le plugin ACME d'OPNsense pointent directement vers l'URL de notre instance step-ca. Dès qu'un certificat approche de son expiration, les machines demandent un renouvellement de manière autonome, exactement comme elles le feraient avec Let's Encrypt, mais sans aucune validation DNS publique. De plus, au sein de notre cluster Kubernetes (K3s), `cert-manager` utilise step-ca pour sécuriser dynamiquement nos ingress (points d'entrée de nos applications). L'autorité racine (Root CA) de LoutikCLOUD n'a eu besoin d'être importée qu'une seule fois sur nos postes de travail pour que toute l'infrastructure devienne instantanément de confiance.

**Justification du rejet des solutions alternatives :**

- **HashiCorp Vault :** Bien que ce soit une solution techniquement brillante et un standard de l'industrie, Vault est un "marteau pilon pour écraser une mouche" dans notre contexte. Sa mise en place demande une maintenance lourde (gestion du scellement/descellement, base de données Consul/Raft) et sa consommation de ressources est disproportionnée par rapport à notre simple besoin de PKI automatisée.
- **Easy-RSA / OpenSSL :** Cette approche a été catégoriquement rejetée car elle est fondamentalement incompatible avec nos objectifs d'automatisation. L'absence du protocole ACME impliquerait une gestion manuelle des renouvellements de certificats, ce qui est une source majeure d'incidents informatiques (oublis d'expiration) et empêche l'utilisation de certificats à courte durée de vie (essentiels pour une bonne sécurité).

---

[^1]: **K3s :** Une version allégée et optimisée de Kubernetes, un système qui permet d'orchestrer et de gérer des dizaines de conteneurs (applications) de manière automatisée.
[^2]: **PKI (Public Key Infrastructure) :** Infrastructure matérielle et logicielle permettant de gérer le cycle de vie des certificats numériques (création, distribution, révocation) pour sécuriser les communications.
[^3]: **ACME (Automatic Certificate Management Environment) :** Un protocole de communication qui permet à un serveur web de demander et de renouveler automatiquement ses certificats de sécurité auprès d'une autorité, sans aucune intervention humaine.
[^4]: **OIDC (OpenID Connect) :** Une couche d'identité par-dessus le protocole OAuth 2.0. C'est ce qui vous permet, par exemple, de vous connecter à un site en utilisant le bouton "Se connecter avec Google ou GitHub".
[^5]: **Zero-Trust :** Modèle de sécurité informatique dont le principe est de ne faire confiance par défaut à aucun équipement, même s'il est déjà connecté au réseau interne de l'entreprise. Chaque communication doit être vérifiée et chiffrée.
