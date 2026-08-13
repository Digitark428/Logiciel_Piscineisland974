import { cn } from "@/lib/utils/cn";

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-pool-400 to-pool-600 shadow-sm">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 16c1.5 0 1.5 1.5 3 1.5S8.5 16 10 16s1.5 1.5 3 1.5 1.5-1.5 3-1.5 1.5 1.5 3 1.5" />
          <path d="M2 20c1.5 0 1.5 1.5 3 1.5S8.5 20 10 20s1.5 1.5 3 1.5 1.5-1.5 3-1.5 1.5 1.5 3 1.5" />
          <path d="M7 16V5a2 2 0 0 1 4 0M15 16V7" />
        </svg>
      </span>
      {showText && (
        <span className="text-lg font-bold tracking-tight text-graphite-900">
          Piscine <span className="text-pool-600">Island</span>
        </span>
      )}
    </span>
  );
}
