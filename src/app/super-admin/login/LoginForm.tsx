"use client";

import { useFormState } from "react-dom";
import { signInSuperAdmin } from "@/lib/actions/superadmin";
import { idle } from "@/lib/actions/result";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { SuperAdminPasswordRecoveryRequest } from "./PasswordRecoveryRequest";

export function SuperAdminLoginForm() {
  const [state, formAction] = useFormState(signInSuperAdmin, idle);
  return (
    <>
      <form action={formAction} className="space-y-4">
        {state.message && !state.ok && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800 ring-1 ring-red-200">{state.message}</div>
        )}
        <div>
          <label className="label" htmlFor="email">Adresse e-mail</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="input" autoFocus />
        </div>
        <div>
          <label className="label" htmlFor="password">Mot de passe</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" className="input" />
        </div>
        <SubmitButton pendingLabel="Connexion…" className="w-full py-3">Accéder à la console</SubmitButton>
      </form>
      <SuperAdminPasswordRecoveryRequest />
    </>
  );
}
