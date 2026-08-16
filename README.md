# Développement - Loutik Docs

![Bannière Loutik](https://raw.githubusercontent.com/loutik/design-assets/main/loutikdocs/banniere_loutikdocs.png)

## Contexte

Ce dépôt contient le site de documentation Loutik, conçu pour partager mon infrastructure homelab, les composants techniques mis en place, les notions apprises au fil de mes expériences, ainsi que les projets réalisés dans le cadre du BTS SIO.

L’objectif est de centraliser la documentation technique sous une interface claire et facilement navigable, afin de présenter les architectures, les choix de conception, les bonnes pratiques et les retours d’expérience liés au système d’information et à l’automatisation.

---

## Structure du dépôt

L’organisation du dépôt suit la logique suivante :

```text
.
├── public/                     # Fichiers statiques servis par le site
├── src/
│   ├── assets/                # Ressources visuelles et médias
│   ├── components/            # Composants Astro réutilisables
│   ├── content/
│   │   ├── docs/              # Contenu documentaire du site
│   │   └── config.ts         # Configuration des collections de contenu
│   └── ...
├── templates/                 # Modèles de rédaction pour les contenus
├── .github/                   # Configuration GitHub et workflows
├── astro.config.mjs           # Configuration principal du projet Astro
├── docker-compose.yml         # Services Docker du projet
├── Dockerfile                 # Image de conteneur du site
├── nginx.conf                 # Configuration NGINX pour la publication
├── package.json               # Dépendances et scripts npm
├── package-lock.json          # Verrouillage des dépendances
├── tsconfig.json              # Configuration TypeScript
├── README.md                  # Documentation du dépôt
├── README-astro.md            # Documentation Astro de référence
├── LICENSE.md                 # Licence du projet
└── public/                    # Fichiers publics du site
```

- **`src/content/docs/`** : Contient la documentation, les articles, les pages et les ressources associées au site.
- **`src/components/`** : Regroupe les composants Astro utilisés pour la structure et le design du site.
- **`public/`** : Contient les assets statiques exposés directement par le serveur web.
- **`templates/`** : Fournit des modèles pour la rédaction de nouveaux contenus et de pages structurées.
- **`astro.config.mjs`** : Paramètre le moteur Astro ainsi que ses intégrations et plugins.
- **`package.json`** : Déclare les scripts et les dépendances du projet.

---

## Utilisation du projet

### 1. Cloner le dépôt localement

```bash
git clone https://github.com/loutik/website-docs.git
cd loutik_website-docs
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Lancer le site en mode développement

```bash
npm run dev
```

Le site est ensuite accessible par défaut sur l’URL suivante :

```text
http://localhost:4321
```

### 4. Vérifier le rendu du projet

Pour générer la version de production et valider le site avant publication :

```bash
npm run build
npm run preview
```

Cette commande permet de vérifier le rendu final produit par Astro avant un déploiement ou une publication.

### 5. Publier des modifications via une branche et une pull request

```bash
git checkout -b feature/mon-correctif
git add .
git commit -m "Ajout de la documentation ou correction"
git push -u origin feature/mon-correctif
```

Ensuite, ouvrez une pull request sur GitHub pour valider les changements, demander une revue et fusionner la branche dans la branche principale lorsqu’elle est prête.

---

## Bonnes pratiques

1. **Valider le build avant merge** : Exécuter `npm run build` pour s’assurer que le site compile correctement et que les pages sont générées sans erreur.
2. **Conserver une structure documentaire claire** : Organiser les pages par thématiques de manière cohérente (homelab, notions, projets, blog, etc.).
3. **Séparer contenu et composants** : Conserver les fichiers de contenu dans `src/content/docs/` et les éléments réutilisables dans `src/components/`.
4. **Optimiser les assets** : Utiliser les ressources statiques et les images dans des dossiers dédiés pour éviter la confusion et faciliter la maintenance.

```bash
npm run build
```

---

## 👨‍💻 Mainteneurs

- **Louis MEDO** | [LinkedIn](https://www.linkedin.com/in/louismedo/) | [Portfolio](https://louis.loutik.fr/) | [GitHub](https://github.com/FireToak) | [louis.medo@loutik.fr](mailto:louis.medo@loutik.fr)

---

<div align="center">
<br>
<small><i>Dernière mise à jour : 16 août 2026</i></small>
</div>