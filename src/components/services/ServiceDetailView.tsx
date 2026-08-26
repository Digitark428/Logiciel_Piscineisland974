import Link from "next/link";
import { Avatar, Badge } from "@/components/ui";
import { ServiceDetailTabs } from "@/components/services/ServiceDetailTabs";
import { cn } from "@/lib/utils/cn";
import type { ServiceStatus } from "@/lib/db/types";

export function ServiceDetailView({
  backHref,
  status,
  statusLabel,
  meta,
  editAction,
  client,
  navigation,
  statusActions,
  accessInfo,
  intervention,
  tracking,
  details,
}: {
  backHref: string;
  status: ServiceStatus;
  statusLabel: string;
  meta: React.ReactNode;
  editAction?: { href: string; label: string };
  client: { id: string; name: string; phone?: string | null; context?: string | null };
  navigation?: React.ReactNode;
  statusActions?: React.ReactNode;
  accessInfo?: string | null;
  intervention: React.ReactNode;
  tracking: React.ReactNode;
  details: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl">
      <Link href={backHref} className="mb-5 inline-flex min-h-11 items-center text-sm font-medium text-graphite-500 hover:text-graphite-800">
        <span aria-hidden="true" className="mr-2">←</span>
        Mes entretiens
      </Link>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-[-0.025em] text-graphite-900 sm:text-[1.75rem]">Entretien piscine</h1>
            <Badge tone={status}>{statusLabel}</Badge>
          </div>
          <p className="mt-1.5 text-sm text-graphite-500">{meta}</p>
        </div>
        {editAction && <Link href={editAction.href} className="btn-secondary">{editAction.label}</Link>}
      </header>

      <section aria-label="Informations essentielles de l'entretien" className="card mb-6 overflow-hidden border-pool-100/80 bg-pool-50/35">
        <div className="flex flex-col gap-5 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3.5">
            <Avatar name={client.name} size={46} />
            <div className="min-w-0">
              <Link href={`/app/clients/${client.id}`} className="block truncate font-semibold text-graphite-900 hover:text-pool-700">
                {client.name}
              </Link>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-graphite-500">
                {client.phone && <a href={`tel:${client.phone}`} className="hover:text-graphite-800">{client.phone}</a>}
                {client.phone && client.context && <span aria-hidden="true">·</span>}
                {client.context && <span>{client.context}</span>}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
            {navigation}
            {statusActions}
          </div>
        </div>
        {accessInfo && (
          <div className="border-t border-pool-100/80 bg-white/55 px-4 py-3 text-sm text-graphite-700 sm:px-5">
            <span className="font-semibold text-graphite-900">Accès :</span> {accessInfo}
          </div>
        )}
      </section>

      <ServiceDetailTabs intervention={intervention} tracking={tracking} details={details} />
    </div>
  );
}

export function ServiceDetailSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("py-6 first:pt-0 last:pb-0", className)}>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-graphite-900 sm:text-lg">{title}</h2>
        {description && <p className="mt-1 max-w-2xl text-sm leading-6 text-graphite-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function ServiceDetailItem({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-graphite-400">{label}</dt>
      <dd className="mt-1.5 text-sm leading-6 text-graphite-800">{children}</dd>
    </div>
  );
}
