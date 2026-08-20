import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import type { CompletenessItem } from "@/lib/setup-completeness";

export function SetupCompletenessBanner({ items }: { items: CompletenessItem[] }) {
  const remaining = items.filter((i) => !i.done);
  if (remaining.length === 0) return null;

  const doneCount = items.length - remaining.length;

  return (
    <div className="card-surface mb-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="section-label">Compléter votre espace</p>
          <p className="mt-1 text-[14px] text-[#6B7280]">
            {doneCount}/{items.length} essentiels renseignés — continuez à votre rythme.
          </p>
        </div>
        <span className="shrink-0 text-[12px] font-semibold text-[#1B3AE8]">
          {Math.round((doneCount / items.length) * 100)} %
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#ECEEF3]">
        <div
          className="h-full rounded-full bg-[#1B3AE8]"
          style={{ width: `${(doneCount / items.length) * 100}%` }}
        />
      </div>
      <ul className="mt-3 space-y-1">
        {items.map((item) => (
          <li key={item.id}>
            {item.done ? (
              <span className="flex items-center gap-2 py-1.5 text-[13px] text-[#6B7280]">
                <Check className="h-4 w-4 text-[#10B981]" />
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="flex items-center justify-between gap-2 rounded-lg py-1.5 text-[13px] font-medium text-[#1A1D23] hover:text-[#1B3AE8]"
              >
                <span>{item.label}</span>
                <ChevronRight className="h-4 w-4 text-[#9CA3AF]" />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
