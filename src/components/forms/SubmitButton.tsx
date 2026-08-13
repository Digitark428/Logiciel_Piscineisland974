"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils/cn";

/**
 * Bouton « Enregistrer » standard : affiche l'état d'enregistrement en cours.
 * Répond à l'exigence : l'utilisateur sait toujours si l'enregistrement est en cours.
 */
export function SubmitButton({
  children = "Enregistrer",
  pendingLabel = "Enregistrement…",
  variant = "primary",
  className,
}: {
  children?: React.ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
}) {
  const { pending } = useFormStatus();
  const variantClass =
    variant === "danger" ? "btn-danger" : variant === "secondary" ? "btn-secondary" : "btn-primary";
  return (
    <button type="submit" disabled={pending} className={cn(variantClass, className)} aria-busy={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}
