# Piscine Island — Architecture technique

> SaaS multi-tenant de gestion pour piscinistes (TPE de 2 à 10 personnes).
> Priorité : **Simplicité + Fiabilité + Sécurité + Confort d'utilisation**, esprit Apple.

---

## 1. Stack technique

| Domaine | Choix | Raison |
|---|---|---|
| Framework | **Next.js 14 (App Router)** | SSR/RSC, Server Actions, Route Handlers, API serveur sécurisée dans un seul projet. |
| Langage | **TypeScript strict** | Fiabilité, refactor sûr. |
| UI | **Tailwind CSS** + composants maison | Design sobre Apple, blanc/graphite/bleu piscine, responsive. |
| Base de données | **Supabase (PostgreSQL)** | Multi-tenant, RLS natif, Auth, Storage. |
| Auth | **Supabase Auth** (email/password) | Mots de passe jamais en clair (hash côté Supabase). |
| Stockage fichiers | **Supabase Storage** (buckets privés) | Photos, documents, factures, sauvegardes ; URLs signées. |
| Validation | **Zod** | Validation stricte des entrées serveur. |
| Tests | **Vitest** | Parcours critiques, isolation multi-tenant. |

### Principe de sécurité en couches

1. **Application** : middleware + guards par rôle/permission sur chaque route.
2. **Authentification** : Supabase Auth ; session serveur via `@supabase/ssr`.
3. **Base de données** : **RLS activée sur toutes les tables métier**, filtrage par `workspace_id`.
4. **Permissions** : table `permissions` granulaire + rôle admin (toutes permissions).
5. **Routes/API serveur** : opérations sensibles (création de membre, reset password, suppression de workspace) exécutées **côté serveur uniquement** avec la clé `service_role`, jamais exposée au client.
6. **Isolation** : impossible de contourner par manipulation d'URL/ID — chaque requête est re-filtrée par RLS **et** par le contexte de session serveur.

---

## 2. Modèle multi-tenant

- Entité racine : **`workspaces`** (un espace = une entreprise).
- Chaque utilisateur est rattaché à un workspace via **`memberships`** (`user_id` + `workspace_id` + `role`).
- **Toutes** les données métier portent une colonne `workspace_id` (NOT NULL, FK) et sont protégées par RLS.
- Fonction SQL `auth_workspace_ids()` : renvoie les workspaces de l'utilisateur courant. Les policies RLS l'utilisent pour autoriser l'accès.
- Le **code entreprise** (`company_code`, ex. `DCI-7K4P92`) identifie l'espace au moment de la connexion — ce n'est **pas** un secret d'authentification.

### Rôles

| Rôle | Portée |
|---|---|
| `admin` | Tous les droits sur **son** workspace. |
| `member` | Droits limités par ses permissions granulaires. |
| `super_admin` | Plateforme entière — **hors** du système de workspaces, table dédiée `platform_admins`, protégé séparément. |

Types de membre (`member_type`) : `employe`, `prestataire`, `stagiaire`, `alternant`.

---

## 3. Schéma de base de données (résumé)

Tables principales (toutes avec `id uuid`, `created_at`, `updated_at` sauf mention) :

- **`workspaces`** — entreprise : nom, adresse, tél, email, SIRET, infos légales, `company_code` unique, `status`, `is_demo`.
- **`memberships`** — lien user↔workspace : `role`, `member_type`, `status` (active/disabled), profil (prénom, nom, photo, infos pro).
- **`permissions`** — permissions granulaires par membership (clé/valeur booléenne).
- **`platform_admins`** — Super Admins (séparé des workspaces).
- **`clients`** — fiche client + `private_code_hash`, `portal_token`.
- **`pools`** (piscines) — rattachées à un client.
- **`services`** (prestations) — unique ou occurrence de récurrence ; `code` unique, `status`, dates, membre assigné.
- **`service_series`** — définition d'une récurrence (fréquence ou dates manuelles).
- **`service_tasks`** — tâches d'entretien d'une prestation.
- **`tasks`** — tâches pro/perso (admin & membres).
- **`documents`** — fichiers liés (client/pool/service/contrat/facture/membre).
- **`contracts`** — contrats client.
- **`invoices`** + **`invoice_lines`** — factures.
- **`notifications`** — notifications internes (in-app).
- **`activity_logs`** — journal d'activité.
- **`backups`** — sauvegardes/exports (métadonnées + chemin storage).

Buckets Storage (privés) : `avatars`, `documents`, `backups`.

Voir migrations SQL dans `supabase/migrations/` pour le détail (colonnes, contraintes, index, RLS, triggers, fonctions).

---

## 4. Parcours d'authentification

```
/  (accueil)
 ├─ « Créer mon espace »  → /signup            (crée workspace + admin + code entreprise)
 ├─ « Se connecter »      → /login             (1. code entreprise → 2. qui êtes-vous ? → 3. email+mdp)
 ├─ « Essayer la démo »   → /demo              (connexion auto au workspace démo, rôle gérant/membre)
 └─ Super Admin           → /super-admin/login (séparé, renforcé)

Client final : /portal  → code privé client → espace client (token révocable)
```

Provisioning à la création d'espace (Server Action, service_role, transactionnel via RPC SQL) :
1. créer `workspaces` (+ `company_code` généré) ;
2. créer l'utilisateur Auth ;
3. créer `memberships` (role=admin) ;
4. attribuer **toutes** les permissions ;
5. journaliser.

---

## 5. Permissions granulaires

Clés (extensible) : `clients.view/edit/delete`, `pools.view/edit`, `services.view/create/edit/complete`,
`planning.view`, `tasks.view/manage`, `documents.view/manage`, `contracts.manage`, `invoices.manage`,
`team.manage`, `settings.manage`, `backups.manage`, `sensitive.view`.

- **admin** : bypass — toutes les permissions accordées d'office (vérifié en base et en applicatif).
- **member** : uniquement les permissions activées par l'admin.

---

## 6. Organisation du code

```
src/
  app/
    (marketing)/                 accueil publique
    signup/                      création d'espace
    login/                       connexion (code → rôle → auth)
    demo/                        entrée démo
    portal/                      espace client (token)
    (app)/                       application authentifiée (layout protégé)
      dashboard/  clients/  pools/  services/  planning/
      team/  tasks/  documents/  invoices/  contracts/
      notifications/  backups/  activity/  settings/
    super-admin/                 outil propriétaire plateforme
    api/                         route handlers (cron backups, storage signed urls…)
  lib/
    supabase/                    clients (browser, server, admin/service-role)
    auth/                        session, guards, permissions
    db/                          types générés, requêtes
    validation/                  schémas Zod
    utils/                       helpers (codes, dates, formatage)
  components/                    UI réutilisable
supabase/
  migrations/                    SQL ordonné (schéma, RLS, fonctions, seed démo)
tests/                           Vitest
```

---

## 7. Sécurité — règles non négociables

- `SUPABASE_SERVICE_ROLE_KEY` : **serveur uniquement**, jamais dans le bundle client.
- Aucun secret commité — voir `.env.example`.
- RLS **activée par défaut** sur toute table métier ; deny-by-default.
- Opérations destructives (suppression membre/workspace, reset démo) : confirmation explicite + contrôle serveur.
- Storage privé + URLs signées à durée courte.
- Journalisation des actions sensibles.
- Super Admin totalement isolé ; un admin de workspace ne peut pas s'auto-promouvoir.

---

## 8. Évolutions prévues (non développées en V1, mais architecture prête)

Forfaits/abonnements, essai 14 j, paiement, e-mails (Resend), assistant IA, monitoring.
Colonnes/tables réservées (`workspaces.plan`, `workspaces.trial_ends_at`) préparées sans logique active.

**Resend n'est pas intégré en V1.** Notifications = in-app uniquement.
