import { cn } from "@/lib/utils/cn";

/** Logo LETI - exclusivement composé des assets officiels fournis. */
const SIZES = {
  nav: {
    symbol: "h-9 w-9",
    wordmark: "h-8 w-[76px]",
  },
  hero: {
    symbol: "h-[5.5rem] w-[5.5rem] sm:h-28 sm:w-28",
    wordmark: "h-16 w-40 sm:h-[5.5rem] sm:w-[13.5rem]",
  },
} as const;

export function Logo({
  className,
  showText = true,
  size = "nav",
}: {
  className?: string;
  showText?: boolean;
  size?: keyof typeof SIZES;
}) {
  const dimensions = SIZES[size];

  return (
    <span className={cn("inline-flex items-center gap-1.5", size === "hero" && "gap-3 sm:gap-4", className)} aria-label="LETI">
      <img src="/leti/leti-symbol-transparent.png" alt="" className={cn(dimensions.symbol, "object-contain")} />
      {showText && (
        <img src="/leti/leti-wordmark-transparent.png" alt="" className={cn(dimensions.wordmark, "object-contain")} />
      )}
    </span>
  );
}
