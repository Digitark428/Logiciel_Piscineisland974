/** Résultat standard d'une Server Action, pour un retour utilisateur fiable. */
export interface ActionResult {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Données utiles renvoyées (id créé, code généré, etc.). */
  data?: Record<string, unknown>;
}

export const idle: ActionResult = { ok: false };

export function ok(message?: string, data?: Record<string, unknown>): ActionResult {
  return { ok: true, message, data };
}

export function fail(message: string, fieldErrors?: Record<string, string>): ActionResult {
  return { ok: false, message, fieldErrors };
}
