"use client";

import { useState, useTransition } from "react";
import { createRecoveryClient } from "@/lib/supabase/client";

/** Demande de récupération sans révéler si l'adresse possède un compte. */
export function SuperAdminPasswordRecoveryRequest() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function requestRecovery(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const supabase = createRecoveryClient();
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/super-admin/reset-password`,
      });
      // Réponse volontairement générique : ne pas exposer l'existence d'un compte.
      setMessage("Si cette adresse est autorisée, un lien de réinitialisation vient d’être envoyé.");
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        className="mx-auto mt-4 block text-sm font-medium text-graphite-500 underline-offset-4 hover:text-graphite-800 hover:underline"
        onClick={() => setOpen(true)}
      >
        Mot de passe oublié ?
      </button>
    );
  }

  return (
    <div className="mt-4 border-t border-graphite-100 pt-4">
      <p className="mb-3 text-center text-sm text-graphite-500">Recevez un lien sécurisé pour choisir un nouveau mot de passe.</p>
      <form className="space-y-3" onSubmit={requestRecovery}>
        <label className="label" htmlFor="recovery-email">Adresse e-mail</label>
        <input
          id="recovery-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="input"
        />
        <button type="submit" className="btn-secondary w-full" disabled={pending}>
          {pending ? "Envoi…" : "Recevoir le lien"}
        </button>
      </form>
      {message && <p className="mt-3 text-center text-sm text-graphite-600" role="status">{message}</p>}
    </div>
  );
}
