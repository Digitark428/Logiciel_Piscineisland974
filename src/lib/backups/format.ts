import type { JsonRecord } from "@/lib/backups/types";

export function recordText(row: JsonRecord | undefined, key: string): string {
  const value = row?.[key];
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value : String(value);
}

export function personLabel(row: JsonRecord | undefined): string {
  const person = [recordText(row, "first_name"), recordText(row, "last_name")].filter(Boolean).join(" ").trim();
  return person || recordText(row, "company_name") || recordText(row, "name") || "Sans nom";
}

export function addressLabel(row: JsonRecord | undefined): string {
  return [
    recordText(row, "address_line1"),
    recordText(row, "address_line2"),
    [recordText(row, "postal_code"), recordText(row, "city")].filter(Boolean).join(" "),
    recordText(row, "country"),
  ].filter(Boolean).join(", ") || "Adresse non renseignée";
}

export function safeFileSegment(value: string, fallback = "fichier"): string {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._ -]+/g, "-")
    .replace(/[. ]+$/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
  return normalized || fallback;
}

export function backupFileName(workspaceName: string, generatedAt: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(generatedAt);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "00";
  return `LETI_Sauvegarde_${safeFileSegment(workspaceName, "Entreprise")}_${get("year")}-${get("month")}-${get("day")}_${get("hour")}h${get("minute")}.zip`;
}

function readableObject(value: object): string {
  const render = (item: unknown): string => {
    if (item === null || item === undefined || item === "") return "—";
    if (typeof item === "boolean") return item ? "Oui" : "Non";
    if (Array.isArray(item)) return item.map(render).join(", ");
    if (typeof item === "object") {
      return Object.entries(item as Record<string, unknown>)
        .map(([key, nested]) => `${key.replaceAll("_", " ")} : ${render(nested)}`)
        .join(" · ");
    }
    return String(item);
  };
  return render(value);
}

export function humanValue(value: unknown, timeZone = "Indian/Reunion"): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  if (typeof value === "number") return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value);
  if (typeof value === "object") return readableObject(value);
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}T/.test(text) && !Number.isNaN(Date.parse(text))) {
    return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone }).format(new Date(text));
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${text}T00:00:00Z`));
  }
  return text;
}
