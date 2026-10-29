import { requireContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { normalizeAppearance } from "@/lib/appearance/theme";
import { AppearanceEditor } from "./AppearanceEditor";

export default async function AppearancePage() {
  const ctx = await requireContext();
  const supabase = await createClient();
  const { data, error } = await supabase.from("user_appearance_preferences").select("preferences").eq("user_id", ctx.userId).maybeSingle();
  return <AppearanceEditor initial={normalizeAppearance(data?.preferences)} unavailable={Boolean(error)} />;
}
