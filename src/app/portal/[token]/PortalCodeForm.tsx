"use client";

import { useActionState } from "react";
import { openPortal } from "@/lib/actions/portal";
import { idle } from "@/lib/actions/result";
import { SubmitButton } from "@/components/forms/SubmitButton";

export function PortalCodeForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(openPortal, idle);
  return (
    <form action={formAction} className="space-y-4">
      {state.message && !state.ok && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800 ring-1 ring-red-200">{state.message}</div>
      )}
      <input type="hidden" name="token" value={token} />
      <div>
        <label className="label" htmlFor="code">Votre code d'accès</label>
        <input id="code" name="code" required autoFocus autoComplete="off" className="input text-center text-lg tracking-widest" placeholder="••••" />
      </div>
      <SubmitButton pendingLabel="Vérification…" className="w-full py-3">Accéder à mon espace</SubmitButton>
    </form>
  );
}
