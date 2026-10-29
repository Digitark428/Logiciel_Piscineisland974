"use server";
import { requireContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { appearanceSchema } from "./theme";
import { revalidatePath } from "next/cache";

export async function saveAppearance(input: unknown): Promise<{ ok: boolean; message: string }> {
  const ctx = await requireContext();
  const parsed = appearanceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Les réglages sont invalides." };
  const supabase = await createClient();
  const { error } = await supabase.from("user_appearance_preferences").upsert({ user_id: ctx.userId, preferences: parsed.data, updated_at: new Date().toISOString() });
  if (error) return { ok: false, message: "Impossible d’enregistrer les réglages. Réessayez plus tard." };
  revalidatePath("/app", "layout");
  return { ok: true, message: "Vos préférences personnelles ont été enregistrées." };
}
