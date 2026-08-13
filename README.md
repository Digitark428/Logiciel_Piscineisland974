# Piscine Island

Logiciel SaaS **multi-tenant** de gestion pour piscinistes (TPE de 2 à 10 personnes).
Simple, moderne, rapide, fiable — esprit Apple, univers piscine (blanc / graphite / bleu).

> **Stack** : Next.js 14 (App Router) · TypeScript · Supabase (PostgreSQL + Auth + Storage + RLS) · Tailwind CSS · Vitest.

Voir [`ARCHITECTURE.md`](./ARCHITECTURE.md) pour la conception détaillée.

---

## Fonctionnalités (V1)

- **Multi-tenant** : chaque entreprise = un *workspace* totalement isolé (RLS + permissions + contrôle serveur).
- **Création d'espace** : provisioning workspace + admin + **code entreprise unique** généré automatiquement.
- **Connexion** en 3 étapes : code entreprise → « qui êtes-vous ? » → e-mail + mot de passe (gérant ou membre).
- **Équipe** : l'admin crée les comptes (mot de passe **haché**, jamais en clair), gère e-mail, mot de passe,
  rôle, type, **permissions granulaires**, photo (Storage), activation/désactivation.
- **Clients** : fiche complète, plusieurs piscines, historique, **espace client** via lien privé + code personnel révocable.
- **Piscines** : caractéristiques techniques, notes, prestations associées.
- **Prestations** : uniques ou **récurrentes** (fréquence régulière **ou** dates saisies manuellement),
  tâches d'entretien, assignation, fiche terrain (checklist, compte-rendu, **bouton « Y aller »** Waze/Maps,
  démarrer / terminer).
- **Planning** : vues jour / semaine / mois / année.
- **Tâches**, **documents** (Storage privé + URLs signées), **contrats**, **factures** (lignes + PDF imprimable).
- **Notifications in-app** (cloche + badge) — *aucun e-mail en V1*.
- **Sauvegardes** automatiques quotidiennes (23h) + manuelles, organisées Année / Mois / Jour.
- **Journal d'activité**, **paramètres** de l'entreprise, page **RGPD**.
- **Super Admin** : console propriétaire séparée (`platform_admins`), vue globale, administration des espaces.
- **Mode démo** : vrai workspace isolé, données réalistes, rôles Gérant/Membre, **réinitialisation**.

---

## Mise en route

### 1. Prérequis

- Node.js 20+
- Un projet [Supabase](https://supabase.com)

### 2. Installation

```bash
npm install
cp .env.example .env.local   # puis renseigner les valeurs (voir plus bas)
```

### 3. Variables d'environnement (`.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique (anon) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** — serveur uniquement, jamais commité |
| `NEXT_PUBLIC_APP_URL` | URL de l'app (ex. `http://localhost:3000`) |
| `DEMO_MANAGER_EMAIL` / `DEMO_MANAGER_PASSWORD` | Compte démo gérant |
| `DEMO_MEMBER_EMAIL` / `DEMO_MEMBER_PASSWORD` | Compte démo membre |
| `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` | Compte Super Admin (optionnel) |
| `CRON_SECRET` | Secret protégeant la route de sauvegarde |

> ⚠️ Ne jamais committer de secrets. `.env.local` est ignoré par Git.
> Resend **n'est pas** intégré en V1 (notifications internes uniquement).

### 4. Base de données (migrations)

Les migrations SQL sont dans [`supabase/migrations/`](./supabase/migrations) (ordonnées).
Appliquez-les avec la CLI Supabase :

```bash
supabase link --project-ref <votre-ref>
supabase db push
```

…ou en collant chaque fichier (dans l'ordre `0001` → `0007`) dans le **SQL Editor** de Supabase.

Elles créent : tables, contraintes, index, **RLS** (deny-by-default), fonctions de provisioning,
buckets Storage privés (`avatars`, `documents`, `backups`) et la fonction `seed_demo_data`.

### 5. Bootstrap (Super Admin + démo)

Une fois les migrations appliquées :

```bash
npm run bootstrap
```

Ce script (idempotent) crée le Super Admin, le workspace de démonstration (utilisateurs Auth,
provisioning) et génère les données de démo. Réexécutable à volonté.

### 6. Lancer l'application

```bash
npm run dev      # http://localhost:3000
```

---

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | Développement |
| `npm run build` | Build de production |
| `npm run start` | Serveur de production |
| `npm run typecheck` | Vérification TypeScript |
| `npm run test` | Tests (Vitest) |
| `npm run bootstrap` | Crée Super Admin + démo |

---

## Sauvegardes automatiques (23h00)

La route `POST /api/cron/backups` (protégée par `CRON_SECRET`) sauvegarde chaque workspace actif.
Planifiez-la quotidiennement à 23h, par ex. avec **Vercel Cron** (`vercel.json`) :

```json
{ "crons": [{ "path": "/api/cron/backups", "schedule": "0 23 * * *" }] }
```

…ou tout planificateur appelant la route avec l'en-tête `Authorization: Bearer <CRON_SECRET>`.

---

## Sécurité (principes non négociables)

- **RLS activée** sur toutes les tables métier, filtrage par `workspace_id` — impossible de contourner
  par manipulation d'URL/ID.
- Clé `service_role` **serveur uniquement** ; opérations sensibles côté serveur.
- Mots de passe **hachés** par Supabase Auth ; codes privés clients **hachés** (scrypt).
- Storage **privé** + URLs signées temporaires.
- Super Admin **totalement séparé** — un admin d'espace ne peut pas s'auto-promouvoir.
- Journalisation des actions sensibles.

Le test [`tests/integration/isolation.test.ts`](./tests/integration/isolation.test.ts) vérifie qu'un
workspace ne peut jamais accéder aux données d'un autre (exécuté si les variables Supabase sont présentes).

---

## Évolutions prévues (non incluses en V1)

Forfaits / abonnements / essai 14 j / paiement, système d'e-mails (Resend), assistant IA, monitoring.
L'architecture est prête à les accueillir sans reconstruction (colonnes `plan`, `trial_ends_at` réservées).
