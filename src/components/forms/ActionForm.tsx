"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { idle, type ActionResult } from "@/lib/actions/result";
import { cn } from "@/lib/utils/cn";

type Action = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

/**
 * Formulaire connecté à une Server Action, avec retour utilisateur fiable :
 * bannière de succès / d'erreur explicite (exigence « bouton Enregistrer »).
 */
export function ActionForm({
  action,
  children,
  className,
  successMessage,
  refreshOnSuccess = true,
  resetOnSuccess = false,
}: {
  action: Action;
  children: React.ReactNode;
  className?: string;
  successMessage?: string;
  refreshOnSuccess?: boolean;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useFormState(action, idle);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const lastHandled = useRef(state);

  useEffect(() => {
    if (state === lastHandled.current) return;
    lastHandled.current = state;
    if (state.ok) {
      if (resetOnSuccess) formRef.current?.reset();
      if (refreshOnSuccess) router.refresh();
    }
  }, [state, refreshOnSuccess, resetOnSuccess, router]);

  return (
    <form ref={formRef} action={formAction} className={className}>
      {state.message && (
        <div
          className={cn(
            "mb-4 rounded-xl px-4 py-3 text-sm font-medium",
            state.ok
              ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
              : "bg-red-50 text-red-800 ring-1 ring-red-200",
          )}
          role="status"
        >
          {state.ok ? state.message || successMessage || "Enregistré." : state.message}
        </div>
      )}
      {children}
    </form>
  );
}
