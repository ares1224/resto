import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function ModuleLinks({
  backHref,
  backLabel,
  title,
  links,
}: {
  backHref?: string;
  backLabel?: string;
  title: string;
  links: { href: string; title: string; desc: string }[];
}) {
  return (
    <div>
      {backHref && (
        <Link href={backHref} className="text-[13px] font-semibold text-[#1B3AE8] hover:underline">
          ← {backLabel ?? "Retour"}
        </Link>
      )}
      <h1 className="mt-2 mb-4 text-2xl font-bold text-[#1A1D23]">{title}</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="card-surface flex items-center justify-between gap-3 p-4 transition-transform hover:-translate-y-0.5"
          >
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold text-[#1A1D23]">{link.title}</span>
              <span className="mt-0.5 block text-[12px] text-[#6B7280]">{link.desc}</span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-[#9CA3AF]" />
          </Link>
        ))}
      </div>
    </div>
  );
}
