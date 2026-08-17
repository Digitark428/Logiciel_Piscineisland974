# DECISIONS.md — Décisions durables

> Conserver ici les décisions qui ne doivent pas être rediscutées implicitement par un autre agent. Chaque entrée doit indiquer la décision et sa raison.

## Mémoire commune Codex ↔ Claude Code

**Décision :** `PROJECT_CONTEXT.md`, `AI_CHANGELOG.md` et `DECISIONS.md` sont la mémoire officielle partagée entre les deux agents.

**Raison :** permettre une reprise fiable du projet sans dépendre de l'historique d'une conversation unique.

## Architecture multi-tenant et sécurité

**Décision :** une entreprise est isolée par `workspace_id`, avec RLS deny-by-default et contrôles applicatifs de contexte et de permissions.

**Raison :** empêcher l'accès aux données d'une autre entreprise, y compris en cas de manipulation d'URL ou d'identifiant.

## Usage du service role Supabase

**Décision :** le client `src/lib/supabase/admin.ts` et la clé `service_role` restent strictement côté serveur.

**Raison :** cette clé contourne les protections RLS et ne doit jamais être accessible au navigateur.

## Évolution du schéma

**Décision :** toute modification de base de données passe par une nouvelle migration dans `supabase/migrations/`; les migrations existantes sont immuables.

**Raison :** conserver la synchronisation et la traçabilité entre le dépôt et Supabase.

## Factures et contrats

**Décision :** les factures et contrats sont des fichiers stockés dans `documents`, importés depuis la fiche client ; l'application ne les génère pas.

**Raison :** ce comportement correspond au périmètre fonctionnel actuel.

## Mode démo

**Décision :** le mode démo reste retiré et ne doit pas être réintroduit.

**Raison :** la migration `0019_remove_demo.sql` a supprimé cette mécanique de l'état actuel du projet.

## Cibles de production

**Décision :** les changements publiés utilisent exclusivement la branche GitHub `claude/piscine-island-saas-cvvhln`, le projet Vercel `logiciel-piscineisland974-eu7f` et le projet Supabase `umrjrpbritekqcfqkhxz`.

**Raison :** les anciens projets `piscineisland-logiciel` et leur base éventuelle sont obsolètes.