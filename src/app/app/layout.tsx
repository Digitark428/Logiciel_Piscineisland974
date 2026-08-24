import { requireContext, can } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { signedUrl } from "@/lib/storage";
import { AppShell } from "@/components/app/AppShell";
import { DeferredAppSupportWidget } from "@/components/app/DeferredAppSupportWidget";
import { ACCOUNT_NAV_ITEMS, filterNavEntries, NAV_ITEMS, type NavItem } from "@/components/app/nav";
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
  const canShowNavItem = (item: NavItem) => {
    if (item.adminOnly) return ctx.isAdmin;
    if (!item.perm) return true;
    return can(ctx, item.perm);
  };
  const items = filterNavEntries(NAV_ITEMS, canShowNavItem);
  const accountItems = filterNavEntries(ACCOUNT_NAV_ITEMS, canShowNavItem);

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
        accountItems={accountItems}
        profileHref={ctx.isAdmin ? `/app/team/${ctx.membership.id}` : null}
        workspaceName={ctx.workspace.name}
        companyCode={ctx.workspace.company_code}
        userName={memberName(ctx.membership)}
        avatarUrl={avatarUrl}
        roleLabel={memberJobTitle(ctx.membership) ?? "Membre"}
        notifCount={count ?? 0}
      >
        {children}
      </AppShell>
      <DeferredAppSupportWidget />
    </>
  );
}
