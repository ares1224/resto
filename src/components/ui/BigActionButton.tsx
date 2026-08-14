import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function BigActionButton({
  href,
  label,
  description,
  icon: Icon,
  variant = "primary",
  className,
}: {
  href: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-[72px] items-center gap-4 rounded-2xl border-0 px-4 py-4 font-semibold transition-transform active:scale-[0.98]",
        variant === "primary"
          ? "bg-[#1B3AE8] text-white hover:bg-[#152FBA]"
          : "bg-white text-[#1A1D23] shadow-[0_2px_8px_rgba(0,0,0,0.08)]",
        className
      )}
    >
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          variant === "primary" ? "bg-white/20 text-white" : "bg-[#EEF2FF] text-[#1B3AE8]"
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={2.2} />
      </span>
      <span className="min-w-0 text-left">
        <span className="block text-[15px] font-semibold">{label}</span>
        {description && (
          <span
            className={cn(
              "mt-0.5 block text-[12px] font-normal",
              variant === "primary" ? "text-white/80" : "text-[#6B7280]"
            )}
          >
            {description}
          </span>
        )}
      </span>
    </Link>
  );
}
