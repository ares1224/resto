# Gestion restaurant

Application web responsive (PWA) pour la gestion d'établissements de restauration : planning, stocks, finances, clientèle, hygiène, opérations et marketing.

**Aucune donnée fictive** — l'application démarre vide. Au premier lancement, configurez votre établissement et créez vos données depuis l'interface.

## Démarrage

```bash
npm install
npm run dev
```

Ouvrir http://localhost:3000 — la **configuration initiale** vous guide pour créer votre compte gérant.

## Première utilisation

1. Créer votre compte gérant (nom, email, mot de passe)
2. Ajouter employés, fournisseurs, stocks, plats, etc. module par module

## Architecture

```
Interface (Next.js PWA) → API Routes → Moteur métier → data/restaurant.json
```

## Modules

- **Personnel** — Planning, disponibilités, remplacements, pointage, fiches RH
- **Stocks** — Inventaire, liste de courses, fournisseurs, gaspillage
- **Finances** — Food cost, trésorerie, export comptable
- **Clientèle** — Réservations, avis, fidélité
- **Hygiène** — HACCP, registre, allergènes
- **Opérationnel** — Carte / menu, maintenance, main courante
- **Marketing** — Réseaux, fréquentation
- **Assistant IA** (gérant) — Proposition planning, prévisions, anomalies

## Réinitialiser les données

Supprimez `data/restaurant.json` et relancez l'application pour repartir d'une base vide.

## Déploiement Vercel

Le dépôt GitHub est `https://github.com/ares1224/resto`.

1. Aller sur [vercel.com](https://vercel.com) et se connecter avec GitHub
2. **Add New Project** → sélectionner **ares1224/resto**
3. Framework : Next.js (détecté automatiquement)
4. **Aucune variable d'environnement n'est obligatoire** pour le premier déploiement (voir `.env.example`)
5. **Deploy**

Vercel redéploiera à chaque push sur `main`.

**Stockage obligatoire :** sur Vercel le disque `/tmp` est perdu entre deux requêtes. Créez un **Blob store privé** :

1. Projet Vercel → **Storage** → **Create Database** → **Blob**
2. Accès : **Private**
3. **Connect** le store au projet `resto` (Production + Preview)
4. Redéployez

Les variables `BLOB_STORE_ID` / `BLOB_READ_WRITE_TOKEN` sont ajoutées automatiquement. Sans ce store, un compte créé à l’inscription disparaît et la connexion affiche « Identifiants invalides ».

En local, les données restent dans `data/restaurant.json`.
