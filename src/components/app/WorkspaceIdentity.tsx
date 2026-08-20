"use client";

import { useEffect, useState } from "react";

/** Identité compacte de l'espace, réutilisée dans les deux variantes de la sidebar. */
export function WorkspaceIdentity({ name, companyCode }: { name: string; companyCode: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copyCompanyCode = async () => {
    let didCopy = true;
    try {
      await navigator.clipboard.writeText(companyCode);
    } catch {
      // Repli pour les contextes non sécurisés ou les navigateurs plus anciens.
      const input = document.createElement("textarea");
      input.value = companyCode;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      didCopy = document.execCommand("copy");
      input.remove();
    }
    if (didCopy) setCopied(true);
  };

  return (
    <div className="leti-workspace-card rounded-xl border px-3 py-2.5">
      <div className="truncate text-sm font-semibold text-graphite-900">{name}</div>
      <div className="mt-1 flex min-w-0 items-center justify-between gap-2">
        <code className="min-w-0 truncate font-mono text-[11px] text-graphite-500">{companyCode}</code>
        <button
          type="button"
          className="leti-copy-button shrink-0"
          onClick={copyCompanyCode}
          aria-label={copied ? "Code entreprise copié" : "Copier le code entreprise"}
          aria-live="polite"
        >
          {copied ? "Copié ✓" : "Copier"}
        </button>
      </div>
    </div>
  );
}
