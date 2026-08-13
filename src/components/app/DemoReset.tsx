"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resetDemo } from "@/lib/actions/demo";

export function DemoReset() {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const router = useRouter();
  return (
    <button
      disabled={pending}
      onClick={() =>
        start(async () => {
          if (!confirm("Réinitialiser les données de démonstration à leur état initial ?")) return;
          const r = await resetDemo();
          if (r.ok) { setDone(true); setTimeout(() => setDone(false), 2000); }
          router.refresh();
        })
      }
      className="badge bg-amber-100 text-amber-800 hover:bg-amber-200"
    >
      {pending ? "Réinitialisation…" : done ? "Réinitialisée ✓" : "↻ Réinitialiser la démo"}
    </button>
  );
}
