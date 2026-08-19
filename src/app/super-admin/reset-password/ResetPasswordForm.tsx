"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { createRecoveryClient } from "@/lib/supabase/client";

type RecoveryState = "checking" | "ready" | "invalid" | "complete";

/** Termine le flux de récupération Supabase puis ne change que le mot de passe du compte reçu par e-mail. */
export function SuperAdminResetPasswordForm() {
  const [status, setStatus] = useState<RecoveryState>("checking");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createRecoveryClient();
    let active = true;

    async function initializeRecovery() {
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            if (active) setStatus("invalid");
            return;
          }
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (active) setStatus(session ? "ready" : "invalid");
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session && active) setStatus("ready");
    });
    void initializeRecovery();
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  function updatePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirmation) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    startTransition(async () => {
      const { error: updateError } = await createRecoveryClient().auth.updateUser({ password });
      if (updateError) {
        setError("Le lien n’est plus valide. Demandez-en un nouveau.");
        return;
      }
      setStatus("complete");
      window.setTimeout(() => window.location.assign("/super-admin"), 700);
    });
  }

  if (status === "checking") {
    return <p className="py-3 text-center text-sm text-graphite-500" aria-live="polite">Vérification du lien sécurisé…</p>;
  }

  if (status === "invalid") {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm leading-6 text-graphite-600">Ce lien est invalide ou a expiré. Demandez un nouveau lien de réinitialisation.</p>
        <Link href="/super-admin/login" className="btn-secondary w-full">Retour à la connexion</Link>
      </div>
    );
  }

  if (status === "complete") {
    return <p className="py-3 text-center text-sm font-medium text-graphite-700" role="status">Mot de passe enregistré. Ouverture de la console…</p>;
  }

  return (
    <form className="space-y-4" onSubmit={updatePassword}>
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800 ring-1 ring-red-200">{error}</p>}
      <div>
        <label className="label" htmlFor="new-password">Nouveau mot de passe</label>
        <input id="new-password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="input" autoFocus />
      </div>
      <div>
        <label className="label" htmlFor="confirm-password">Confirmer le mot de passe</label>
        <input id="confirm-password" type="password" required minLength={8} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="input" />
      </div>
      <button type="submit" className="btn-primary w-full py-3" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer le mot de passe"}</button>
    </form>
  );
}
