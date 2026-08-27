"use client";

import Image from "next/image";
import { ActionForm } from "@/components/forms/ActionForm";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { deleteWorkspaceLogo, updateWorkspaceLogo } from "@/lib/actions/workspace";

export function WorkspaceLogoSettings({ logoUrl }: { logoUrl: string | null }) {
  return (
    <section id="company-logo" className="card mb-6 scroll-mt-24 p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xl">
          <p className="leti-eyebrow">Identité de l’entreprise</p>
          <h2 className="mt-1 text-lg font-semibold text-graphite-900">Logo dans le header</h2>
          <p className="mt-2 text-sm leading-6 text-graphite-500">
            SVG recommandé pour une qualité optimale. PNG haute résolution ou JPG/JPEG accepté.
            Utilisez de préférence un logo avec fond transparent et de bonne qualité.
          </p>
        </div>
        <div className="flex h-20 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl border border-graphite-100 bg-graphite-50 p-3 sm:w-52">
          {logoUrl ? (
            <Image src={logoUrl} alt="Logo actuel de l’entreprise" width={360} height={120} className="h-full w-full object-contain" />
          ) : (
            <span className="text-center text-xs text-graphite-400">Aucun logo configuré</span>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-graphite-100 pt-5 lg:flex-row lg:items-end lg:justify-between">
        <ActionForm action={updateWorkspaceLogo} className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label className="label" htmlFor="company-logo-file">Choisir un fichier</label>
            <input
              id="company-logo-file"
              name="company_logo"
              type="file"
              accept="image/svg+xml,image/png,image/jpeg,.svg,.png,.jpg,.jpeg"
              required
              className="input block cursor-pointer file:mr-3 file:rounded-lg file:border-0 file:bg-pool-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-graphite-700"
            />
            <span className="mt-1 block text-xs text-graphite-400">4 Mo maximum. Le fichier sera optimisé automatiquement.</span>
          </div>
          <SubmitButton pendingLabel="Optimisation…">{logoUrl ? "Remplacer le logo" : "Ajouter le logo"}</SubmitButton>
        </ActionForm>

        {logoUrl ? (
          <ActionForm action={deleteWorkspaceLogo} className="shrink-0">
            <SubmitButton variant="secondary" pendingLabel="Suppression…" className="w-full lg:w-auto">Supprimer le logo</SubmitButton>
          </ActionForm>
        ) : null}
      </div>
    </section>
  );
}
