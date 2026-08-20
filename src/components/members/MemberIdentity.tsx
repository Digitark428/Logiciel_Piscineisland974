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
  variant = "default",
  roleTone = "aqua",
  meta,
}: {
  member: MemberIdentityData;
  avatarUrl?: string | null;
  avatarSize?: number;
  className?: string;
  nameClassName?: string;
  /** Le fil social associe visuellement le rôle au nom et garde la date sous l'identité. */
  variant?: "default" | "feed";
  roleTone?: "aqua" | "coral";
  meta?: React.ReactNode;
}) {
  const name = memberName(member);
  const title = memberJobTitle({ job_title: member.job_title ?? null, role: member.role === "admin" ? "admin" : "member" });
  const roleBadge = title && (
    <span className={cn("leti-role-badge inline-flex max-w-full rounded-full px-2 py-0.5 text-[11px] font-medium leading-tight", roleTone === "coral" && "leti-role-badge--coral")}>
      {title}
    </span>
  );

  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", variant === "feed" && "items-start", className)}>
      <Avatar name={name} src={avatarUrl} size={avatarSize} />
      <div className="min-w-0">
        {variant === "feed" ? (
          <>
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <div className={cn("max-w-full truncate font-semibold leading-tight text-graphite-900", nameClassName)}>{name}</div>
              {roleBadge}
            </div>
            {meta && <div className="mt-1 text-xs leading-tight text-graphite-400">{meta}</div>}
          </>
        ) : (
          <>
            <div className={cn("truncate font-semibold leading-tight text-graphite-900", nameClassName)}>{name}</div>
            {roleBadge && <div className="mt-1">{roleBadge}</div>}
            {meta && <div className="mt-1 text-xs leading-tight text-graphite-400">{meta}</div>}
          </>
        )}
      </div>
    </div>
  );
}
