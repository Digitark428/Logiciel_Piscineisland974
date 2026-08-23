import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Rafraîchit la session Supabase à chaque requête et protège les routes privées.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Si la configuration Supabase est absente, on ne fait pas planter tout le site :
  // les pages publiques restent accessibles (les pages protégées redirigeront vers /login).
  if (!url || !anonKey) {
    return response;
  }

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Valide localement la signature ES256 et l'expiration du JWT via le JWKS
  // Supabase mis en cache. La vérification distante getUser() reste effectuée
  // une seule fois dans le contexte serveur des routes privées afin de conserver
  // la détection immédiate des sessions révoquées.
  const { data: claimsData } = await supabase.auth.getClaims();

  const path = request.nextUrl.pathname;

  // Routes de l'application authentifiée
  const isAppRoute = path.startsWith("/app");
  // La récupération démarre depuis un e-mail Supabase : elle doit pouvoir
  // recevoir le jeton avant qu'une session Super Admin existe.
  const isSuperAdminApp =
    path.startsWith("/super-admin") &&
    !path.startsWith("/super-admin/login") &&
    !path.startsWith("/super-admin/reset-password");

  if ((isAppRoute || isSuperAdminApp) && !claimsData?.claims.sub) {
    const url = request.nextUrl.clone();
    url.pathname = isSuperAdminApp ? "/super-admin/login" : "/login";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  return response;
}
