import type { Client, Membership } from "@/lib/db/types";

export function clientName(c: Pick<Client, "first_name" | "last_name" | "company_name">): string {
  if (c.company_name) return c.company_name;
  const n = [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
  return n || "Client sans nom";
}

export function memberName(
  m: Partial<Pick<Membership, "first_name" | "last_name" | "email">>,
): string {
  const n = [m.first_name, m.last_name].filter(Boolean).join(" ").trim();
  return n || m.email || "Membre";
}

/** Poste affiché : le rôle de sécurité reste distinct de l'intitulé métier. */
export function memberJobTitle(
  m: Partial<Pick<Membership, "job_title" | "role">>,
): string | null {
  const title = m.job_title?.trim();
  if (title) return title;
  // Dans l'architecture actuelle, le rôle admin correspond au gérant de l'espace.
  return m.role === "admin" ? "Gérant" : null;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

const MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${formatDate(iso)} à ${time}`;
}

/** Temps relatif court en français : « à l'instant », « il y a 2 h », « il y a 3 j ». */
export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `il y a ${d} j`;
  return formatDate(iso);
}

export function formatTime(t: string | null | undefined): string {
  if (!t) return "";
  return t.slice(0, 5);
}

/** Formate une durée en minutes de façon lisible : 90 → « 1h30 », 60 → « 1h », 45 → « 45 min ». */
export function formatDuration(minutes: number | null | undefined): string {
  const m = minutes ?? 0;
  if (m <= 0) return "—";
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${rest} min`;
  if (rest === 0) return `${h}h`;
  return `${h}h${String(rest).padStart(2, "0")}`;
}

export function formatMoney(amount: number | null | undefined, currency = "EUR"): string {
  const v = amount ?? 0;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(v);
}

export function formatBytes(bytes: number | null | undefined): string {
  const b = bytes ?? 0;
  if (b < 1024) return `${b} o`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} Ko`;
  return `${(b / (1024 * 1024)).toFixed(1)} Mo`;
}

export const MEMBER_TYPE_LABELS: Record<string, string> = {
  employe: "Employé",
  prestataire: "Prestataire",
  stagiaire: "Stagiaire",
  alternant: "Alternant",
};

export const SERVICE_STATUS_LABELS: Record<string, string> = {
  planned: "Planifiée",
  in_progress: "En cours",
  completed: "Terminée",
  cancelled: "Annulée",
};

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyée",
  paid: "Payée",
  cancelled: "Annulée",
};
