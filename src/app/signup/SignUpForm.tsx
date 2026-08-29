"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp } from "@/lib/auth/actions";
import { idle } from "@/lib/actions/result";
import { SubmitButton } from "@/components/forms/SubmitButton";

export function SignUpForm() {
  const [state, formAction] = useActionState(signUp, idle);

  if (state.ok && state.data?.companyCode) {
    return (
      <div className="card p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        </div>
        <h2 className="text-xl font-bold text-graphite-900">Votre espace est prêt !</h2>
        <p className="mt-2 text-sm text-graphite-500">
          Voici votre code entreprise. Conservez-le : vos employés en auront besoin pour se connecter.
        </p>
        <div className="my-6 inline-block rounded-2xl bg-graphite-900 px-8 py-4 font-mono text-2xl font-bold tracking-widest text-white">
          {String(state.data.companyCode)}
        </div>
        <div>
          <Link href="/app" className="btn-primary px-6 py-3">Accéder à mon espace</Link>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      {state.message && !state.ok && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800 ring-1 ring-red-200">
          {state.message}
        </div>
      )}

      <div className="card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-graphite-400">Votre entreprise</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="companyName">Nom de l'entreprise *</label>
            <input id="companyName" name="companyName" required className="input" placeholder="Ex. Piscines du Lagon" />
          </div>
          <div>
            <label className="label" htmlFor="siret">SIRET</label>
            <input id="siret" name="siret" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="phone">Téléphone</label>
            <input id="phone" name="phone" className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="address_line1">Adresse</label>
            <input id="address_line1" name="address_line1" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="postal_code">Code postal</label>
            <input id="postal_code" name="postal_code" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="city">Ville</label>
            <input id="city" name="city" className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="companyEmail">E-mail de l'entreprise</label>
            <input id="companyEmail" name="companyEmail" type="email" className="input" />
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-graphite-400">Votre compte gérant</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="firstName">Prénom *</label>
            <input id="firstName" name="firstName" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="lastName">Nom *</label>
            <input id="lastName" name="lastName" required className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="email">Adresse e-mail *</label>
            <input id="email" name="email" type="email" required className="input" autoComplete="email" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="password">Mot de passe *</label>
            <input id="password" name="password" type="password" required minLength={8} className="input" autoComplete="new-password" />
            <p className="mt-1 text-xs text-graphite-400">Au moins 8 caractères.</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Link href="/login" className="text-sm text-graphite-500 hover:text-graphite-700">J'ai déjà un espace</Link>
        <SubmitButton pendingLabel="Création…">Créer mon espace</SubmitButton>
      </div>
    </form>
  );
}
