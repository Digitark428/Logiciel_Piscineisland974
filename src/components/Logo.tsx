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
  orientation = "horizontal",
  symbolEffect,
}: {
  className?: string;
  showText?: boolean;
  size?: keyof typeof SIZES;
  orientation?: "horizontal" | "vertical";
  symbolEffect?: "hero" | "sidebar";
}) {
  const dimensions = SIZES[size];

  return (
    <span
      className={cn(
        "inline-flex",
        orientation === "vertical" ? "flex-col items-center gap-3 sm:gap-4" : "items-center gap-1.5",
        className,
      )}
      aria-label="LETI"
    >
      <span className={cn("leti-logo-symbol", symbolEffect && `leti-logo-symbol--${symbolEffect}`)}>
        <img src="/leti/leti-symbol-transparent.png" alt="" className={cn(dimensions.symbol, "object-contain")} />
      </span>
      {showText && (
        <img src="/leti/leti-wordmark-transparent.png" alt="" className={cn(dimensions.wordmark, "object-contain")} />
      )}
    </span>
  );
}
