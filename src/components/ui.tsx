import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { initials } from "@/lib/utils/format";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("card p-5 sm:p-6", className)}>{children}</div>;
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-graphite-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-graphite-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-pool-50 text-pool-500">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 12h16M12 4v16" strokeLinecap="round" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-graphite-800">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-graphite-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

const BADGE_TONES: Record<string, string> = {
  planned: "bg-pool-50 text-pool-700",
  in_progress: "bg-amber-50 text-amber-700",
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-graphite-100 text-graphite-500",
  active: "bg-emerald-50 text-emerald-700",
  disabled: "bg-graphite-100 text-graphite-500",
  archived: "bg-graphite-100 text-graphite-500",
  draft: "bg-graphite-100 text-graphite-600",
  sent: "bg-pool-50 text-pool-700",
  paid: "bg-emerald-50 text-emerald-700",
  todo: "bg-graphite-100 text-graphite-600",
  done: "bg-emerald-50 text-emerald-700",
  admin: "bg-pool-100 text-pool-800",
  member: "bg-graphite-100 text-graphite-600",
};

export function Badge({
  children,
  tone = "member",
  className,
}: {
  children: React.ReactNode;
  tone?: string;
  className?: string;
}) {
  return <span className={cn("badge", BADGE_TONES[tone] ?? BADGE_TONES.member, className)}>{children}</span>;
}

export function Avatar({
  name,
  src,
  size = 40,
}: {
  name: string;
  src?: string | null;
  size?: number;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover ring-1 ring-graphite-200"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-pool-100 font-semibold text-pool-700 ring-1 ring-pool-200"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(name)}
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
  href,
  tone = "pool",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  href?: string;
  tone?: "pool" | "graphite" | "emerald" | "amber";
}) {
  const tones = {
    pool: "text-pool-600",
    graphite: "text-graphite-700",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
  };
  const inner = (
    <div className="card p-5 transition hover:shadow-float">
      <div className="text-sm font-medium text-graphite-500">{label}</div>
      <div className={cn("mt-1 text-3xl font-bold tracking-tight", tones[tone])}>{value}</div>
      {hint && <div className="mt-1 text-xs text-graphite-400">{hint}</div>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
