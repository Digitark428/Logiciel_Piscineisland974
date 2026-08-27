"use client";

import { useState } from "react";
import { ActionForm } from "@/components/forms/ActionForm";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { setClientPortal, regeneratePortalToken } from "@/lib/actions/clients";
import { Card } from "@/components/ui";
import { Checkbox } from "@/components/ui/Checkbox";

export function ClientPortalCard({
  clientId,
  enabled,
  hasCode,
  portalUrl,
}: {
  clientId: string;
  enabled: boolean;
  hasCode: boolean;
  portalUrl: string | null;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <Card>
      <h2 className="text-lg font-semibold text-graphite-900">Espace client (lien privé)</h2>
      <p className="mt-1 text-sm text-graphite-500">
        Le client accède uniquement à ses informations via un lien privé et un code personnel.
      </p>

      <ActionForm action={setClientPortal} className="mt-4 space-y-4" successMessage="Enregistré.">
        <input type="hidden" name="clientId" value={clientId} />
        <label className="flex items-center gap-3">
          <Checkbox name="enabled" defaultChecked={enabled} tone="selection" className="-my-2 -ml-2" />
          <span className="text-sm font-medium text-graphite-800">Activer l'accès client</span>
        </label>
        <div>
          <label className="label" htmlFor="private_code">
            Code privé du client {hasCode && <span className="text-graphite-400">(défini — laisser vide pour conserver)</span>}
          </label>
          <input id="private_code" name="private_code" className="input" placeholder={hasCode ? "••••••" : "Ex. 4826"} autoComplete="off" />
          <p className="mt-1 text-xs text-graphite-400">Au moins 4 caractères. Stocké de façon sécurisée (haché).</p>
        </div>
        <SubmitButton>Enregistrer l'accès</SubmitButton>
      </ActionForm>

      {enabled && portalUrl && (
        <div className="mt-5 rounded-xl bg-graphite-50 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-graphite-400">Lien privé</div>
          <div className="mt-1 break-all font-mono text-sm text-graphite-700">{portalUrl}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                navigator.clipboard?.writeText(portalUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? "Copié ✓" : "Copier le lien"}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={async () => {
                if (confirm("Régénérer le lien ? L'ancien lien cessera de fonctionner.")) {
                  await regeneratePortalToken(clientId);
                }
              }}
            >
              Régénérer le lien
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
