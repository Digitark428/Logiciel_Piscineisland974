/** Convertit une saisie française simple (ex. « 1 250,50 ») en centimes. */
export function parseMoneyToCents(value: string | null | undefined): number | null {
  const normalized = (value ?? "")
    .trim()
    .replace(/[€\s\u00a0\u202f]/g, "");
  if (!normalized) return null;

  const match = normalized.match(/^(\d+)(?:[,.](\d{1,2}))?$/);
  if (!match) return null;

  const whole = Number(match[1]);
  const decimals = Number((match[2] ?? "").padEnd(2, "0"));
  const cents = whole * 100 + decimals;
  return Number.isSafeInteger(cents) && cents <= 99999999999 ? cents : null;
}

/** Formate un montant en centimes pour l'interface française. */
export function formatMoneyCents(amountCents: number | null | undefined): string {
  const cents = amountCents ?? 0;
  const hasDecimals = Math.abs(cents) % 100 !== 0;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  }).format(cents / 100);
}

/** Valeur préremplie d'un champ de saisie, sans symbole monétaire. */
export function moneyCentsInputValue(amountCents: number | null | undefined): string {
  if (amountCents == null) return "";
  const whole = Math.trunc(amountCents / 100);
  const decimals = Math.abs(amountCents) % 100;
  return decimals === 0 ? String(whole) : `${whole},${String(decimals).padStart(2, "0")}`;
}
