"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Client Supabase côté navigateur (clé anon uniquement).
 * Toutes les requêtes passent par la RLS — jamais la clé service_role ici.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

/**
 * Le lien de récupération est ouvert depuis l'e-mail : le flux implicite
 * permet au navigateur destinataire de recevoir la session de récupération
 * sans dépendre d'un cookie créé lors de la demande initiale.
 */
export function createRecoveryClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { flowType: "implicit" } },
  );
}
