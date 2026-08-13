import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Client Supabase ADMIN (service_role). SERVEUR UNIQUEMENT.
 * Contourne la RLS : à n'utiliser que pour les opérations privilégiées
 * (provisioning d'espace, création/gestion de membres, reset démo, super-admin, cron).
 * L'appelant DOIT valider l'autorisation avant tout usage.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY manquant (serveur uniquement).");
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
