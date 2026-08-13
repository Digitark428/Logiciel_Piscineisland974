"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { createMember } from "@/lib/actions/team";
import { idle } from "@/lib/actions/result";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { PermissionsFields } from "@/components/forms/PermissionsFields";
import { DEFAULT_MEMBER_PERMISSIONS } from "@/lib/permissions";

export function NewMemberForm() {
  const [state, formAction] = useFormState(createMember, idle);
  const [role, setRole] = useState<"admin" | "member">("member");

  return (
    <form action={formAction} className="space-y-6">
      {state.message && !state.ok && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800 ring-1 ring-red-200">{state.message}</div>
      )}

      <div className="card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-graphite-400">Informations</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="first_name">Prénom *</label>
            <input id="first_name" name="first_name" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="last_name">Nom *</label>
            <input id="last_name" name="last_name" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="member_type">Type de membre</label>
            <select id="member_type" name="member_type" className="input" defaultValue="employe">
              <option value="employe">Employé</option>
              <option value="prestataire">Prestataire</option>
              <option value="stagiaire">Stagiaire</option>
              <option value="alternant">Alternant</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="role">Rôle</label>
            <select id="role" name="role" className="input" value={role} onChange={(e) => setRole(e.target.value as "admin" | "member")}>
              <option value="member">Membre de l'équipe</option>
              <option value="admin">Administrateur</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-graphite-400">Identifiants de connexion</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="email">Adresse e-mail *</label>
            <input id="email" name="email" type="email" required className="input" autoComplete="off" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="password">Mot de passe initial *</label>
            <input id="password" name="password" type="text" required minLength={8} className="input" autoComplete="off" />
            <p className="mt-1 text-xs text-graphite-400">
              Au moins 8 caractères. À communiquer au membre. Il est stocké de façon sécurisée (jamais en clair).
            </p>
          </div>
        </div>
      </div>

      {role === "member" && (
        <div className="card p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-graphite-400">Permissions</h3>
          <PermissionsFields selected={DEFAULT_MEMBER_PERMISSIONS} />
        </div>
      )}
      {role === "admin" && (
        <div className="rounded-xl bg-pool-50 px-4 py-3 text-sm text-pool-800">
          Un administrateur possède automatiquement toutes les permissions sur cet espace.
        </div>
      )}

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Création…">Créer le compte</SubmitButton>
      </div>
    </form>
  );
}
