import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  buttonSize = "md",
}: {
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  buttonSize?: "xs" | "sm" | "md" | "lg";
}) {
  return (
    <div className="card-surface mb-3 p-8 text-center">
      <p className="text-base font-bold text-[#1A1D23]">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-[13px] text-[#6B7280]">{description}</p>
      <Link href={actionHref} className="mt-6 inline-block">
        <Button size={buttonSize}>{actionLabel}</Button>
      </Link>
    </div>
  );
}
