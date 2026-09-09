import { Icon } from "@/components/app/icons";

export function PublicPageHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="mx-auto max-w-3xl text-center">
      <p className="leti-eyebrow text-pool-800">{eyebrow}</p>
      <h1 className="mt-4 text-[2.45rem] font-semibold leading-[1.05] tracking-[-0.055em] text-graphite-900 sm:text-5xl lg:text-[3.5rem]">
        {title}
      </h1>
      <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-graphite-500 sm:text-lg sm:leading-8">
        {description}
      </p>
    </header>
  );
}

export function ScreenshotPlaceholder({
  title,
  icon,
}: {
  title: string;
  icon: string;
}) {
  return (
    <div className="flex aspect-[16/10] min-h-64 w-full items-center justify-center rounded-[1.4rem] border border-dashed border-pool-300/80 bg-graphite-50/80 p-6 sm:min-h-72">
      <div className="text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-pool-100 bg-white text-pool-700 shadow-[0_1px_2px_rgba(24,58,89,0.025)]">
          <Icon name={icon} size={21} />
        </span>
        <p className="mt-4 text-sm font-semibold text-graphite-700">Capture de {title}</p>
        <p className="mt-1 text-xs text-graphite-400">À ajouter</p>
      </div>
    </div>
  );
}

export function VideoPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex aspect-video w-full items-center justify-center rounded-[1.4rem] border border-dashed border-graphite-200 bg-graphite-50 p-6">
      <div className="text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-pool-100 bg-white text-pool-700">
          <svg aria-hidden viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 h-5 w-5">
            <path d="M8.4 5.6a1 1 0 0 1 1.54-.84l9.14 6.4a1 1 0 0 1 0 1.68l-9.14 6.4A1 1 0 0 1 8.4 18.4V5.6Z" />
          </svg>
        </span>
        <p className="mt-3 text-sm font-semibold text-graphite-700">{label}</p>
        <p className="mt-1 text-xs text-graphite-400">Emplacement réservé</p>
      </div>
    </div>
  );
}
