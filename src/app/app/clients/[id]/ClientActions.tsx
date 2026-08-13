"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveClient } from "@/lib/actions/clients";

export function ArchiveButton({ clientId, archived }: { clientId: string; archived: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      className="btn-secondary"
      onClick={() =>
        start(async () => {
          const ok = archived
            ? true
            : confirm("Archiver ce client ? Il n'apparaîtra plus dans la liste active.");
          if (!ok) return;
          await archiveClient(clientId, !archived);
          router.refresh();
        })
      }
    >
      {pending ? "…" : archived ? "Réactiver" : "Archiver"}
    </button>
  );
}
