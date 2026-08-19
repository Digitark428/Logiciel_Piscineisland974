import { requireContext, can } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { signedUrl } from "@/lib/storage";
import { AppShell } from "@/components/app/AppShell";
import { AppSupportWidget } from "@/components/app/AppSupportWidget";
import { NAV_ITEMS } from "@/components/app/nav";
import { memberJobTitle, memberName } from "@/lib/utils/format";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireContext();
  const supabase = createClient();

  // Compteur de notifications non lues visibles par l'utilisateur.
  let notifQuery = supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", ctx.workspace.id)
    .eq("is_read", false);
  notifQuery = ctx.isAdmin
    ? notifQuery.or(`recipient_membership_id.is.null,recipient_membership_id.eq.${ctx.membership.id}`)
    : notifQuery.eq("recipient_membership_id", ctx.membership.id);
  const items = NAV_ITEMS.filter((item) => {
    if (item.adminOnly) return ctx.isAdmin;
    if (!item.perm) return true;
    return can(ctx, item.perm);
  });

  // Ces deux lectures ne dépendent pas l'une de l'autre et ne doivent pas
  // retarder mutuellement l'affichage initial de l'application.
  const [{ count }, avatarUrl] = await Promise.all([
    notifQuery,
    signedUrl("avatars", ctx.membership.photo_path),
  ]);

  return (
    <>
      <AppShell
        items={items}
        workspaceName={ctx.workspace.name}
        companyCode={ctx.workspace.company_code}
        userName={memberName(ctx.membership)}
        avatarUrl={avatarUrl}
        roleLabel={memberJobTitle(ctx.membership) ?? "Membre"}
        notifCount={count ?? 0}
      >
        {children}
      </AppShell>
      <AppSupportWidget />
    </>
  );
}
