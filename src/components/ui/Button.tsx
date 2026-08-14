import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /**
   * `soft` = action secondaire bleue (Modifier), `danger` = action destructive rouge (Supprimer).
   */
  variant?: "primary" | "secondary" | "soft" | "danger" | "ghost";
  size?: "xs" | "sm" | "md" | "lg";
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  children,
  ...props
}: ButtonProps) {
  const variants = {
    primary: "bg-[#1B3AE8] text-white hover:bg-[#152FBA]",
    secondary: "bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]",
    soft: "bg-[#EEF2FF] text-[#1B3AE8] hover:bg-[#E0E7FF]",
    danger: "bg-[#FEF2F2] text-[#EF4444] hover:bg-[#FEE2E2]",
    ghost: "bg-transparent text-[#6B7280] hover:bg-[#F3F4F6]",
  };
  const sizes = {
    xs: "rounded-lg px-3 py-1.5 text-[12px] min-h-[30px]",
    sm: "rounded-lg px-3.5 py-2 text-[13px] min-h-[36px]",
    md: "rounded-xl px-5 py-3.5 text-[15px]",
    lg: "rounded-xl px-6 py-4 text-base min-h-[52px]",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 border-0 font-semibold transition-colors disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
