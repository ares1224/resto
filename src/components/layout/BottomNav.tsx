"use client";

import Link from "next/link";
import { Menu, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type BottomNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
};

function itemClasses() {
  return "flex h-[60px] flex-col items-center justify-center gap-1 px-1";
}

function iconClasses(active: boolean) {
  return cn(
    "flex h-8 w-12 items-center justify-center rounded-xl transition-colors",
    active ? "bg-[#1B3AE8] text-white" : "text-[#6B7280]"
  );
}

function labelClasses(active: boolean) {
  return cn(
    "max-w-full truncate text-[10px] font-semibold leading-none",
    active ? "text-[#1B3AE8]" : "text-[#6B7280]"
  );
}

export function BottomNav({
  items,
  onMore,
}: {
  items: BottomNavItem[];
  onMore?: () => void;
}) {
  const columns = items.length + (onMore ? 1 : 0);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_8px_rgba(0,0,0,0.08)] md:hidden"
      aria-label="Navigation principale"
    >
      <div className="grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {items.map(({ href, label, icon: Icon, active }) => (
          <Link key={href} href={href} className={itemClasses()}>
            <span className={iconClasses(active)}>
              <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
            </span>
            <span className={labelClasses(active)}>{label}</span>
          </Link>
        ))}
        {onMore && (
          <button type="button" onClick={onMore} className={itemClasses()}>
            <span className={iconClasses(false)}>
              <Menu className="h-5 w-5" strokeWidth={2} />
            </span>
            <span className={labelClasses(false)}>Menu</span>
          </button>
        )}
      </div>
    </nav>
  );
}
