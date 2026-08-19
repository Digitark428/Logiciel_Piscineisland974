import { Avatar } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { memberJobTitle, memberName } from "@/lib/utils/format";

export interface MemberIdentityData {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  job_title?: string | null;
  role?: "admin" | "member" | string | null;
}

/** Identité homogène des membres : avatar, nom et poste métier. */
export function MemberIdentity({
  member,
  avatarUrl,
  avatarSize = 40,
  className,
  nameClassName,
}: {
  member: MemberIdentityData;
  avatarUrl?: string | null;
  avatarSize?: number;
  className?: string;
  nameClassName?: string;
}) {
  const name = memberName(member);
  const title = memberJobTitle({ job_title: member.job_title ?? null, role: member.role === "admin" ? "admin" : "member" });

  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <Avatar name={name} src={avatarUrl} size={avatarSize} />
      <div className="min-w-0">
        <div className={cn("truncate font-semibold leading-tight text-graphite-900", nameClassName)}>{name}</div>
        {title && <span className="mt-1 inline-flex max-w-full truncate rounded-full bg-graphite-100 px-2 py-0.5 text-[11px] font-medium leading-tight text-graphite-600">{title}</span>}
      </div>
    </div>
  );
}
