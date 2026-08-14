import { cn } from "@/lib/utils";

export function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
}) {
  const variants = {
    default: "bg-[#F3F4F6] text-[#4B5563]",
    success: "bg-[#D1FAE5] text-[#047857]",
    warning: "bg-[#FEF3C7] text-[#B45309]",
    danger: "bg-[#FEE2E2] text-[#B91C1C]",
    info: "bg-[#EEF2FF] text-[#1B3AE8]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[20px] px-2.5 py-1 text-[11px] font-semibold leading-none",
        variants[variant]
      )}
    >
      {children}
    </span>
  );
}
