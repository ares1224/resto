import { cn } from "@/lib/utils";
import { HelpTooltip } from "@/components/ui/HelpTooltip";

export function Card({
  className,
  children,
  title,
  action,
  help,
}: {
  className?: string;
  children: React.ReactNode;
  title?: string;
  action?: React.ReactNode;
  help?: string;
}) {
  return (
    <div className={cn("card-surface mb-3", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 px-4 pt-4">
          {title && (
            <h3 className="flex items-center gap-2 text-[15px] font-bold text-[#1A1D23]">
              {title}
              {help && <HelpTooltip text={help} />}
            </h3>
          )}
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
