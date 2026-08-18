import Link from "next/link";
import { requireContext } from "@/lib/auth/context";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signedUrls } from "@/lib/storage";
import { PageHeader, Card, Badge, Avatar } from "@/components/ui";
import { memberName, MEMBER_TYPE_LABELS } from "@/lib/utils/format";
import type { Membership } from "@/lib/db/types";

export default async function TeamPage() {
  const ctx = await requireContext();
  if (!ctx.isAdmin) redirect("/app");
  const supabase = createClient();

  const { data: members } = await supabase
    .from("memberships")
    .select("*")
    .eq("workspace_id", ctx.workspace.id)
    .order("role")
    .order("first_name", { nullsFirst: false });

  const list = (members ?? []) as Membership[];
  const avatarByPath = await signedUrls("avatars", list.map((member) => member.photo_path));
  const withAvatars = list.map((m) => ({ m, url: m.photo_path ? avatarByPath.get(m.photo_path) ?? null : null }));
  const admins = withAvatars.filter((x) => x.m.role === "admin");
  const team = withAvatars.filter((x) => x.m.role === "member");

  return (
    <div>
      <PageHeader
        title="Équipe"
        description="Retrouvez les membres de votre équipe et leurs informations de travail."
        subtitle={`${list.length} membre(s)`}
        action={<Link href="/app/team/new" className="btn-primary">+ Nouveau membre</Link>}
      />

      <Section title="Administrateurs" items={admins} />
      <Section title="Membres de l'équipe" items={team} empty="Aucun membre pour le moment." />
    </div>
  );
}

function Section({
  title,
  items,
  empty,
}: {
  title: string;
  items: { m: Membership; url: string | null }[];
  empty?: string;
}) {
  if (items.length === 0 && !empty) return null;
  return (
    <div className="mb-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-graphite-400">{title}</h2>
      {items.length === 0 ? (
        <Card><p className="text-sm text-graphite-400">{empty}</p></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ m, url }) => {
            const name = memberName(m);
            return (
              <Link key={m.id} href={`/app/team/${m.id}`} className="card flex items-center gap-3 p-4 transition hover:shadow-float">
                <Avatar name={name} src={url} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-graphite-900">{name}</div>
                  <div className="truncate text-sm text-graphite-500">{MEMBER_TYPE_LABELS[m.member_type]}</div>
                </div>
                {m.status === "disabled" && <Badge tone="disabled">Désactivé</Badge>}
                {m.role === "admin" && m.status === "active" && <Badge tone="admin">Admin</Badge>}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
