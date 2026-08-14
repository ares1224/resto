"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type NavEntry,
  isNavLinkActive,
  isNavGroupActive,
  findActiveGroupIds,
} from "@/lib/navigation";

type SidebarNavProps = {
  entries: NavEntry[];
  pathname: string;
  showLabels: boolean;
  expandedGroups: Set<string>;
  onToggleGroup: (id: string) => void;
  onNavigate: () => void;
};

export function SidebarNav({
  entries,
  pathname,
  showLabels,
  expandedGroups,
  onToggleGroup,
  onNavigate,
}: SidebarNavProps) {
  return (
    <div className="flex flex-col gap-1">
      {entries.map((entry) => {
        if (entry.type === "link") {
          const Icon = entry.icon;
          const active = isNavLinkActive(entry.href, pathname);
          return (
            <Link
              key={entry.href}
              href={entry.href}
              title={!showLabels ? entry.label : undefined}
              onClick={onNavigate}
              className={cn(
                "flex min-h-[44px] shrink-0 items-center rounded-xl text-[14px] font-medium transition-all",
                showLabels ? "gap-3 px-3 py-2" : "justify-center px-2 py-2",
                active ? "nav-active" : "text-[#374151] hover:bg-[#F3F4F6] hover:text-[#1B3AE8]"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {showLabels && <span className="truncate">{entry.label}</span>}
            </Link>
          );
        }

        const Icon = entry.icon;
        const groupActive = isNavGroupActive(entry, pathname);
        const expanded = expandedGroups.has(entry.id) || groupActive;

        if (!showLabels) {
          const firstChild = entry.children[0];
          return (
            <Link
              key={entry.id}
              href={firstChild.href}
              title={entry.label}
              onClick={onNavigate}
              className={cn(
                "flex min-h-[44px] shrink-0 items-center justify-center rounded-xl px-2 py-2 text-[14px] font-medium transition-all",
                groupActive ? "nav-active" : "text-[#374151] hover:bg-[#F3F4F6] hover:text-[#1B3AE8]"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
            </Link>
          );
        }

        return (
          <div key={entry.id} className="flex flex-col">
            <button
              type="button"
              onClick={() => onToggleGroup(entry.id)}
              className={cn(
                "flex min-h-[44px] w-full shrink-0 items-center gap-3 rounded-xl px-3 py-2 text-left text-[14px] font-semibold transition-all",
                groupActive
                  ? "bg-[#F3F4F6] text-[#1A1D23]"
                  : "text-[#374151] hover:bg-[#F3F4F6] hover:text-[#1B3AE8]"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="flex-1 truncate">{entry.label}</span>
              <ChevronDown
                className={cn("h-4 w-4 shrink-0 transition-transform", expanded && "rotate-180")}
              />
            </button>
            {expanded && (
              <div className="ml-3 mt-0.5 flex flex-col gap-0.5 border-l-2 border-[#ECEEF3] pl-2">
                {entry.children.map((child) => {
                  const childActive = isNavLinkActive(child.href, pathname);
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={onNavigate}
                      className={cn(
                        "flex min-h-[40px] items-center rounded-xl px-3 py-1.5 text-[13px] transition-all",
                        childActive
                          ? "nav-active font-semibold"
                          : "text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#1B3AE8]"
                      )}
                    >
                      {child.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function buildInitialExpandedGroups(entries: NavEntry[], pathname: string): Set<string> {
  const ids = findActiveGroupIds(entries, pathname);
  return new Set(ids);
}
