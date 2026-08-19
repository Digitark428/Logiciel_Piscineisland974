import { cn } from "@/lib/utils/cn";

/** Logo LETI - exclusivement composé des assets officiels fournis. */
export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)} aria-label="LETI">
      <img src="/leti/leti-symbol-official.png" alt="" className="h-9 w-9 object-contain" />
      {showText && (
        <img src="/leti/leti-wordmark-official.png" alt="" className="h-8 w-[76px] object-contain" />
      )}
    </span>
  );
}
