import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireContext } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { signedUrl } from "@/lib/storage";
import { PageHeader } from "@/components/ui";
import { MemberManagement } from "./MemberManagement";
import { memberName } from "@/lib/utils/format";
import type { Membership } from "@/lib/db/types";

export default async function MemberProfilePage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  const ctx = await requireContext();
  if (!ctx.isAdmin) redirect("/app");

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("memberships")
    .select("*")
    .eq("id", params.id)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle();
  if (!member) notFound();

  const [{ data: perms }, avatarUrl, { data: authUser }] = await Promise.all([
    admin.from("permissions").select("key").eq("membership_id", member.id).eq("granted", true),
    signedUrl("avatars", member.photo_path),
    admin.auth.admin.getUserById(member.user_id),
  ]);

  return (
    <div>
      <Link href="/app/team" className="mb-4 inline-block text-sm text-graphite-500 hover:text-graphite-700">← Équipe</Link>
      <PageHeader title={memberName(member as Membership)} subtitle={ctx.membership.id === member.id ? "Votre profil" : "Profil du membre"} />
      <MemberManagement
        member={member as Membership}
        avatarUrl={avatarUrl}
        permissions={(perms ?? []).map((p) => p.key as string)}
        isSelf={ctx.membership.id === member.id}
        currentEmail={authUser?.user?.email ?? member.email ?? ""}
      />
    </div>
  );
}
