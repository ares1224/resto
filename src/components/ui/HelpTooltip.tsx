"use client";

import { HelpCircle } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";

export function HelpTooltip({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span className={cn("relative inline-flex align-middle", className)}>
      <button
        type="button"
        id={id}
        aria-expanded={open}
        aria-describedby={open ? `${id}-tip` : undefined}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[#9CA3AF] hover:bg-[#EEF2FF] hover:text-[#1B3AE8]"
        aria-label="Aide"
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            aria-label="Fermer l'aide"
            onClick={() => setOpen(false)}
          />
          <span
            id={`${id}-tip`}
            role="tooltip"
            className="absolute left-1/2 top-full z-50 mt-2 w-56 -translate-x-1/2 rounded-xl bg-white p-3 text-[12px] leading-relaxed text-[#6B7280] shadow-[0_2px_8px_rgba(0,0,0,0.08)] sm:w-64"
          >
            {text}
          </span>
        </>
      )}
    </span>
  );
}
