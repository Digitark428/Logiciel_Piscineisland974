"use client";

import { useActionState, useState, useTransition } from "react";
import { resolveCompanyCode, signIn } from "@/lib/auth/actions";
import { idle } from "@/lib/actions/result";
import { SubmitButton } from "@/components/forms/SubmitButton";

type Role = "admin" | "member";

export function LoginFlow() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [code, setCode] = useState("");
  const [workspace, setWorkspace] = useState<{ id: string; name: string; code: string } | null>(null);
  const [role, setRole] = useState<Role>("admin");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [signInState, signInAction] = useActionState(signIn, idle);

  function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setCodeError(null);
    startTransition(async () => {
      const res = await resolveCompanyCode(code);
      if (res.ok && res.data) {
        setWorkspace({
          id: String(res.data.workspaceId),
          name: String(res.data.name),
          code: String(res.data.code),
        });
        setStep(2);
      } else {
        setCodeError(res.message ?? "Code invalide.");
      }
    });
  }

  // Étape 1 — code entreprise
  if (step === 1) {
    return (
      <div className="card p-8">
        <h1 className="text-xl font-bold text-graphite-900">Entrez votre code entreprise</h1>
        <p className="mt-1 text-sm text-graphite-500">Il identifie l'espace de votre entreprise.</p>
        <form onSubmit={submitCode} className="mt-6 space-y-4">
          {codeError && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800 ring-1 ring-red-200">{codeError}</div>
          )}
          <input
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Ex. PIS-7K4P92"
            className="input text-center font-mono text-lg tracking-widest"
            aria-label="Code entreprise"
          />
          <button type="submit" disabled={pending} className="btn-primary w-full py-3">
            {pending ? "Vérification…" : "Continuer"}
          </button>
        </form>
      </div>
    );
  }

  // Étape 2 — qui êtes-vous ?
  if (step === 2 && workspace) {
    return (
      <div className="card p-8">
        <button onClick={() => setStep(1)} className="mb-4 text-sm text-graphite-400 hover:text-graphite-600">← Changer de code</button>
        <h1 className="text-xl font-bold text-graphite-900">{workspace.name}</h1>
        <p className="mt-1 text-sm text-graphite-500">Qui êtes-vous ?</p>
        <div className="mt-6 space-y-3">
          <button
            onClick={() => { setRole("admin"); setStep(3); }}
            className="btn-primary w-full justify-start px-4 py-4 text-left"
          >
            <span>
              <span className="block font-semibold text-graphite-900">Je suis le gérant</span>
              <span className="block text-sm text-graphite-700">Accès administrateur complet</span>
            </span>
          </button>
          <button
            onClick={() => { setRole("member"); setStep(3); }}
            className="btn-primary w-full justify-start px-4 py-4 text-left"
          >
            <span>
              <span className="block font-semibold text-graphite-900">Je suis un membre de l'équipe</span>
              <span className="block text-sm text-graphite-700">Accès selon vos permissions</span>
            </span>
          </button>
        </div>
      </div>
    );
  }

  // Étape 3 — authentification
  return (
    <div className="card p-8">
      <button onClick={() => setStep(2)} className="mb-4 text-sm text-graphite-400 hover:text-graphite-600">← Retour</button>
      <h1 className="text-xl font-bold text-graphite-900">
        Connexion {role === "admin" ? "gérant" : "membre"}
      </h1>
      <p className="mt-1 text-sm text-graphite-500">{workspace?.name}</p>
      <form action={signInAction} className="mt-6 space-y-4">
        {signInState.message && !signInState.ok && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800 ring-1 ring-red-200">{signInState.message}</div>
        )}
        <input type="hidden" name="workspaceId" value={workspace?.id ?? ""} />
        <input type="hidden" name="expectedRole" value={role} />
        <div>
          <label className="label" htmlFor="email">Adresse e-mail</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="input" autoFocus />
        </div>
        <div>
          <label className="label" htmlFor="password">Mot de passe</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" className="input" />
        </div>
        <SubmitButton pendingLabel="Connexion…" className="w-full py-3">Se connecter</SubmitButton>
      </form>
    </div>
  );
}
