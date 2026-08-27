"use client";

import React, {
  forwardRef,
  type InputHTMLAttributes,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { cn } from "@/lib/utils/cn";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  /** Menthe pour une action terminée, bleu LETI pour une simple sélection. */
  tone?: "completion" | "selection";
  indeterminate?: boolean;
}

/** Checkbox officielle LETI : input natif accessible et cible tactile de 40 px. */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  {
    className,
    tone = "completion",
    indeterminate = false,
    disabled,
    "aria-checked": ariaChecked,
    ...props
  },
  forwardedRef,
) {
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(forwardedRef, () => inputRef.current as HTMLInputElement);

  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  const checkedTone = tone === "completion"
    ? "peer-checked:border-[#70bfa4] peer-checked:bg-[#7fcdb1] group-hover:peer-checked:bg-[#73c4a8]"
    : "peer-checked:border-pool-500 peer-checked:bg-pool-500 group-hover:peer-checked:bg-pool-600";
  const indeterminateTone = tone === "completion"
    ? "border-[#70bfa4] bg-[#7fcdb1]"
    : "border-pool-500 bg-pool-500";

  return (
    <span className={cn("group relative inline-flex h-10 w-10 shrink-0 items-center justify-center", className)}>
      <input
        {...props}
        ref={inputRef}
        type="checkbox"
        disabled={disabled}
        aria-checked={indeterminate ? "mixed" : ariaChecked}
        className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 focus:outline-none disabled:cursor-not-allowed"
      />
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute h-[22px] w-[22px] rounded-[7px] border border-graphite-300 bg-white shadow-[0_1px_2px_rgba(24,58,89,0.035)] transition-colors duration-150",
          "group-hover:border-pool-400 group-hover:bg-pool-50",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-pool-300 peer-focus-visible:ring-offset-2",
          "peer-disabled:border-graphite-200 peer-disabled:bg-graphite-100 peer-disabled:opacity-60",
          indeterminate ? indeterminateTone : checkedTone,
        )}
      />
      {indeterminate ? (
        <svg aria-hidden="true" viewBox="0 0 16 16" className="pointer-events-none absolute h-4 w-4 text-white peer-disabled:opacity-50">
          <path d="M4 8h8" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
        </svg>
      ) : (
        <svg aria-hidden="true" viewBox="0 0 16 16" className="pointer-events-none absolute h-4 w-4 text-white opacity-0 transition-opacity duration-150 peer-checked:opacity-100 peer-disabled:opacity-40">
          <path d="m3.5 8.2 2.7 2.7 6.3-6.1" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      )}
    </span>
  );
});
