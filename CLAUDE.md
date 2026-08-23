# CLAUDE.md — Contexte projet (lu automatiquement à chaque session)

> But de ce fichier : permettre à Claude de reprendre le projet **instantanément** dans une
> nouvelle conversation, sans tout re-découvrir. Le dépôt GitHub = la mémoire du projet.
> ⚠️ Aucun secret ici (mots de passe, service_role, clés) — ceux-ci vivent dans Vercel/Supabase.

## 1. Le projet
**Piscine Island** — SaaS **multi-tenant** de gestion pour piscinistes (TPE 2–10 pers.).
Priorité : simplicité, fiabilité, sécurité, confort. Esprit Apple (blanc / graphite / bleu piscine).
Détails de conception : voir [`ARCHITECTURE.md`](./ARCHITECTURE.md). Mise en route : [`README.md`](./README.md).

## 2. Stack
Next.js 14 (App Router) · TypeScript strict · Supabase (Postgres + Auth + Storage + RLS) · Tailwind · Vitest.

## 3. Infrastructure en production (identifiants, PAS de secrets)

### ⭐ CIBLES À UTILISER (toujours celles-ci, ne jamais en changer sans que le propriétaire le demande)
- **Supabase** : projet `Piscine Island` — ref **`umrjrpbritekqcfqkhxz`** — https://umrjrpbritekqcfqkhxz.supabase.co
- **Vercel** : projet **`logiciel-piscineisland974-eu7f`** — équipe `digitark428's projects` (`team_TpnBJ601cRvSklF9aTLzCa3R`)
- **GitHub** : dépôt **`Digitark428/Logiciel_Piscineisland974`**, branche **`claude/piscine-island-saas-cvvhln`** (développer et pousser ICI)
- **Prod (URL publique)** : https://logiciel-piscineisland974-eu7f.vercel.app

### ⛔ NE PAS UTILISER
- L'ancien projet Vercel **`piscineisland-logiciel`** et son éventuelle base Supabase : c'est une **autre version obsolète**, à supprimer. Ne jamais y déployer ni y appliquer de migration.

### Notes
- Chaque `git push` sur la branche ci-dessus → redéploiement Vercel automatique du projet `-eu7f`.
- Les **mots de passe / clés** sont dans le doc privé du propriétaire (hors dépôt) + Vercel + Supabase.
- Connaître ces cibles ≠ y avoir accès : dans une **nouvelle session**, il faut que le propriétaire
  ait **connecté les connecteurs Supabase / Vercel** pour que les outils puissent agir dessus.

## 4. Workflow de développement
1. Travailler sur la branche `claude/piscine-island-saas-cvvhln`.
2. `npm install`, puis `npm run build` (doit passer) et `npm run test` avant de pousser.
3. Commit clair + push → Vercel redéploie.

### Workflow collaboratif Codex ↔ Claude Code

- Avant toute intervention importante, lire `CLAUDE.md`, `PROJECT_CONTEXT.md` et les dernières entrées de `AI_CHANGELOG.md`.
- Consulter `DECISIONS.md` lorsqu'une tâche peut toucher une décision existante, et `AGENTS.md` lorsque les instructions Codex peuvent éclairer le contexte.
- Après une intervention significative, ajouter une entrée concise à `AI_CHANGELOG.md`.
- Mettre à jour `PROJECT_CONTEXT.md` uniquement pour un changement durable et `DECISIONS.md` uniquement pour une décision importante.
- `PROJECT_CONTEXT.md`, `AI_CHANGELOG.md` et `DECISIONS.md` constituent la mémoire commune officielle ; n'y inscrire ni secrets, ni suppositions, ni détails inutiles.

### ⭐ RÈGLE PERMANENTE — « Plan → validation → prise en charge de bout en bout » (demandée par le propriétaire)
> **1. Toujours annoncer le plan d'abord et demander validation.** Avant d'agir sur une demande,
> Claude explique clairement **ce qu'il va faire** (le plan) et attend le **« valide »** du
> propriétaire. Tant que ce n'est pas validé, on ne modifie/déploie rien.
> _(Exceptions : actions purement en lecture / sans effet — ex. sortir un zip, lire l'état,
> répondre à une question — peuvent être faites directement.)_
>
> **2. Dès que le propriétaire dit « valide », Claude fait TOUT lui-même**, sans que le
> propriétaire ait rien à faire manuellement : à **chaque** demande, Claude s'occupe **lui-même**
> de Supabase **+** Vercel **+** GitHub, et ne considère une tâche terminée que lorsque **tout est
> réellement en ligne en production et vérifié**. Ne jamais dire « c'est fait » tant que les points
> ci-dessous ne sont pas cochés **et contrôlés** (pas supposés).

**Définition de « terminé » (checklist à dérouler à chaque tâche) :**
1. **Code** : build (`npm run build`) + tests (`npm run test`) + `npm run typecheck` passent.
2. **Supabase** : toute modif de schéma = nouveau fichier de migration **appliqué via `apply_migration`**
   (l'enregistre dans le ledger), puis **`get_advisors` (security + performance)** pour vérifier
   qu'aucune nouvelle alerte n'est apparue — et corriger si oui (cf. régression `0011`→`0012`).
   Vérifier concrètement les colonnes/fonctions créées (`execute_sql`) plutôt que supposer.
3. **GitHub** : commit clair + push. Le fichier de migration est committé (repo et base synchro).
4. **Vercel (PRODUCTION)** : la mise en ligne publique vient de la branche
   `claude/piscine-island-saas-cvvhln` → l'URL `-eu7f`. Un push sur une **autre** branche ne fait
   qu'un déploiement **preview** (privé), **pas** la prod. Donc : amener les changements sur la
   branche de production, puis **vérifier que le déploiement passe `READY`** (`get_deployment`) et
   que l'alias public pointe bien dessus. **Le propriétaire a autorisé durablement ce déploiement
   en production à chaque tâche** — inutile de redemander, sauf changement risqué ci-dessous.
5. **Rapport** : annoncer l'état réel (fait / vérifié), pas un « ça devrait marcher ».

**Seules exceptions où demander AVANT d'agir** : opération destructrice ou irréversible
(suppression/renommage de colonne ou table, migration avec perte de données potentielle,
suppression d'un projet/déploiement, changement d'une cible d'infra). Là on prévient d'abord.

## 5. Migrations base de données — RÈGLE IMPORTANTE
- Les migrations sont des fichiers **numérotés** dans `supabase/migrations/` (`0001` … actuellement `0025`).
  - `0014` (assistance app users) avait été appliquée en base sans être commitée : fichier restauré.
  - `0015` documents.category + liens prestation↔contrat/facture ; `0016` champs d'accès client structurés ;
    `0017` confidentialité des tâches + table `team_notes` ; `0018` `service_client_notes` (notes portail client) ;
    `0019` **suppression complète du mode démo** (fonction `seed_demo_data`, données démo, colonne `is_demo`) ;
    `0020` correctif contrainte `support_messages.author_type` (accepte `client`/`user`/`admin`) ; `0021` index FK.
- **Toute** modif de schéma = **nouveau fichier** `00XX_description.sql` (jamais éditer un ancien).
- Application : via l'outil MCP Supabase `apply_migration` (préféré, l'enregistre dans le ledger),
  sinon coller le SQL dans **Supabase → SQL Editor** (le lien direct :
  `https://supabase.com/dashboard/project/umrjrpbritekqcfqkhxz/sql/new`).
- Pour connaître l'état appliqué : outil `list_migrations` ou `Database → Migrations` dans Supabase.
- Après application → committer le fichier pour garder repo et base synchronisés.

## 6. Architecture / conventions clés
- **Multi-tenant** : toute table métier porte `workspace_id`. **RLS deny-by-default** partout.
- Fonctions d'autorisation SQL : `auth_is_member`, `auth_is_admin`, `auth_has_permission`,
  `auth_workspace_ids`, `auth_is_platform_admin` (SECURITY DEFINER, utilisées par les policies —
  NE PAS révoquer leur EXECUTE, sinon la RLS casse).
- Clients Supabase : `src/lib/supabase/{client,server,admin}.ts`. `admin.ts` = **service_role**,
  **serveur uniquement** (jamais exposé au client).
- Contexte session / permissions : `src/lib/auth/context.ts` (`requireContext`, `can`, `requirePermission`).
- Super Admin séparé : table `platform_admins` + `src/lib/auth/superadmin.ts` + `/super-admin`.
- Permissions granulaires : `src/lib/permissions.ts` (doit rester synchro avec la fonction SQL `permission_keys()`).
- Server Actions par domaine dans `src/lib/actions/`. Retour standard `ActionResult` + `ActionForm`.
- Notifications = **in-app uniquement** (pas de Resend/email en V1).

### ⭐ Évolutions majeures (série de modifications, migrations 0015→0021)
- **Mode démo SUPPRIMÉ** : plus de route `/demo`, bouton, `seed_demo_data`, `is_demo`, ni `resetDemo`/`enterDemo`.
  `bootstrap.mjs` ne crée plus que le Super Admin. Les espaces de test se créent via l'inscription normale.
- **Factures & Contrats = STOCKAGE (pas de génération)** : ce sont des fichiers dans la table `documents`
  (colonne `category` = `invoice`/`contract`/`photo`/`other`, `entity_type='client'`), importés depuis la fiche
  client (`ClientFiles`), bucket privé + RLS `documents.manage`. Les générateurs `/app/invoices` et `/app/contracts`
  et leurs actions ont été **supprimés** (tables `invoices`/`contracts` conservées mais non alimentées par l'UI).
- **Liens prestation↔contrat/facture** : `services.contract_document_id` / `services.invoice_document_id`
  (+ sur `service_series`, propagés) → « Contrat lié » / « Facture liée » (sinon « Aucun … associé »).
- **Fiche client** : champs d'accès structurés (`access_portal_code`, `access_code`, `access_details` + `notes`),
  et **suppression définitive** (`deleteClientPermanently`, permission `clients.delete`) qui nettoie documents +
  fichiers du bucket + notifications/journal, puis cascade FK. Bouton « Supprimer totalement » (confirmation forte).
- **Tâches — confidentialité (RLS 0017)** : visible si créateur OU destinataire OU (admin ET tâche professionnelle).
  Un membre crée ses tâches perso ; l'attribution reste `tasks.manage`. Page `/app/tasks` = Mes tâches / Tâches
  attribuées / Notes d'équipe. **`team_notes`** = communication d'équipe (suppression : auteur OU gérant).
- **Portail client** : fiche d'intervention `/portal/[token]/service/[id]` (type, date, statut, tâches prévues,
  intervenant photo+nom [+tél si `settings.portal_share_assignee_phone`], contact gérant, message d'accueil).
  **`service_client_notes`** : le client ajoute une note / « information importante » (écriture service_role,
  portée dérivée de la session portail), visible par l'équipe (fiche prestation) + notification.
- **Carte** : marqueur SVG personnalisé (goutte/piscine, couleurs Piscine Island, teinté par statut, jamais rouge).
- **Prestations** : nom du prestataire affiché dans la liste ; bouton « Démarrer » retiré (seulement « Terminer ») ;
  « Durée estimée » ; aide « Chaque retour à la ligne crée une nouvelle tâche ☑️ » sous les tâches d'entretien.
- **Navigation** : entrées « Piscines », « Factures », « Contrats » retirées du menu (données pools conservées).

### Module « Assistance » (support intégré) — migration `0013`
- **But** : le client final contacte le support Piscine Island depuis le **portail client**.
  Flux `Client (portail) → Supabase → Super Admin → réponse → Client`. Aucun WhatsApp, aucun Resend.
- **Tables** : `support_conversations` (workspace_id, client_id, `category` bug/help/suggestion,
  `status` new/in_progress/resolved/closed, `context` jsonb, `*_last_seen_at`, `resolved_at`) et
  `support_messages` (conversation_id, workspace_id, `author_type` client/admin, content, metadata).
  Trigger `support_touch_conversation` (SECURITY DEFINER, EXECUTE révoqué) maj `last_message_at`.
- **RLS** : SELECT = `auth_is_platform_admin() OR auth_is_member(workspace_id)`. Aucune policy
  INSERT/UPDATE/DELETE → **écritures via service_role uniquement** (portail + Super Admin), workspace_id
  et client_id **dérivés côté serveur** de la session portail vérifiée (pas d'usurpation possible).
- **Côté client** : `AssistanceWidget` (bouton flottant 💬 + chat + saisie vocale Web Speech API)
  dans `src/app/portal/[token]/` ; actions `src/lib/actions/assistance.ts` (réutilise le cookie portail).
- **Côté Super Admin** : `/super-admin/assistance` (tableau de bord + filtres + recherche) et
  `/super-admin/assistance/[id]` (fiche + réponse + statuts) ; badge d'attention dans l'en-tête.
  Lecture globale via `src/lib/assistance-admin.ts` ; actions `src/lib/actions/superadmin-assistance.ts`.
- **Constantes partagées** : `src/lib/assistance.ts` (catégories/statuts/placeholders — extensible).
- **Journal** : événements (`support_conversation_created`, `support_message_sent`, `support_reply_sent`,
  `support_status_changed`) écrits dans `activity_logs`.
- **Note (0014/0020)** : `support_messages.author_type` accepte `client`/`user`/`admin` (0014 appliquée en base
  hors dépôt avait restreint à `user`/`admin`, cassant l'insert portail ; corrigé en `0020`).

## 7. Pièges déjà rencontrés (à connaître)
- **RLS & fonctions** : migration `0009` a révoqué l'EXECUTE (anon/authenticated) sur les fonctions
  SECURITY DEFINER mutatrices (provision_*, seed_demo_data, `next_service_code`, …). Conséquence :
  **toute fonction appelée par un trigger déclenché par un utilisateur `authenticated` doit être
  SECURITY DEFINER** (cf. `0010` qui a corrigé `services_set_code`, sinon création de prestation cassée).
  → Si tu ajoutes un trigger appelant une fonction, mets-la en SECURITY DEFINER ou garde son EXECUTE.
- **Vercel / Next.js** : le preset doit être Next.js — forcé via `vercel.json`
  (`framework/buildCommand/outputDirectory`). Sinon build « No Output Directory named public ».
- **Middleware** : tolérant si `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY` absents (évite un 500 global).
- **Variables Vercel** : à cocher pour **Production + Preview + Development**. Les variables `DEMO_*`
  ne sont plus utilisées (mode démo supprimé) et peuvent être retirées de Vercel.
- **Auth Supabase** : e-mail **unique au global** → en V1 un e-mail = un seul workspace.
- **Mode démo supprimé** : ne plus référencer `seed_demo_data`, `is_demo`, ni de workspace de démonstration.

## 8. Commandes
- `npm run dev` · `npm run build` · `npm run test` · `npm run typecheck`
- `npm run bootstrap` : (re)crée Super Admin + workspace démo (nécessite les variables `.env`).

## 9. État actuel
V1 complète, **déployée et fonctionnelle** en production. Base Supabase créée, dernière migration appliquée `20260823063815_optimize_rls_auth_initplans`,
sécurisée, avec Super Admin. **Mode démo entièrement retiré** (code + base). Reste (optionnel) :
changer le mot de passe Super Admin, supprimer l'ancien projet Vercel `piscineisland-logiciel` + sa base,
retirer les variables `DEMO_*` de Vercel, brancher un domaine perso.

## 10. Évolutions prévues (non codées — architecture prête)
Forfaits/abonnements, essai 14 j, paiement, e-mails (Resend), assistant IA, monitoring.
