"use client";

import { usePathname } from "next/navigation";
import {
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Session } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { getNavigation, isNavLinkActive, isNavGroupActive } from "@/lib/navigation";
import type { ManagerPermissions } from "@/types";
import { NotificationBell } from "./NotificationBell";
import { SessionTimeout } from "./SessionTimeout";
import { SidebarNav, buildInitialExpandedGroups } from "./SidebarNav";
import { RoleOnboarding } from "./onboarding/RoleOnboarding";
import { EmployeeBottomNav } from "./layout/EmployeeBottomNav";
import { BottomNav, type BottomNavItem } from "./layout/BottomNav";

const SIDEBAR_EXPANDED = "16rem";
const SIDEBAR_COLLAPSED = "4.5rem";

const ROLE_LABELS: Record<string, string> = {
  superadmin: "Super-admin",
  gerant: "Gérant",
  manager: "Manager",
  employe: "Employé",
};

export function AppShell({
  session,
  managerPermissions,
  sessionTimeoutMinutes,
  restaurantName,
  children,
}: {
  session: Session;
  managerPermissions: ManagerPermissions;
  sessionTimeoutMinutes: number;
  restaurantName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const navEntries = useMemo(
    () => getNavigation(session.role, managerPermissions),
    [session.role, managerPermissions]
  );
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() =>
    buildInitialExpandedGroups(navEntries, pathname)
  );
  const bottomNavItems = useMemo<BottomNavItem[]>(
    () =>
      navEntries.slice(0, 4).map((entry) =>
        entry.type === "link"
          ? {
              href: entry.href,
              label: entry.label,
              icon: entry.icon,
              active: isNavLinkActive(entry.href, pathname),
            }
          : {
              href: entry.children[0].href,
              label: entry.label,
              icon: entry.icon,
              active: isNavGroupActive(entry, pathname),
            }
      ),
    [navEntries, pathname]
  );

  // Sur tablette (768–1024px) la barre latérale reste en mode icônes par défaut ;
  // sur desktop elle est dépliée, sauf préférence contraire de l'utilisateur.
  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    const isTablet = () => window.innerWidth < 1024;

    if (stored === "1") setCollapsed(true);
    else if (stored === "0") setCollapsed(false);
    else setCollapsed(isTablet());

    function onResize() {
      if (localStorage.getItem("sidebar-collapsed")) return;
      setCollapsed(isTablet());
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    setExpandedGroups((prev) => {
      const active = buildInitialExpandedGroups(navEntries, pathname);
      return new Set([...prev, ...active]);
    });
  }, [pathname, navEntries]);

  function toggleCollapsed() {
    setCollapsed((value) => {
      const next = !value;
      localStorage.setItem("sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  }

  function toggleGroup(id: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const desktopSidebarWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;
  const showLabels = !collapsed || mobileOpen;

  return (
    <div className="flex h-dvh overflow-hidden">
      <SessionTimeout minutes={sessionTimeoutMinutes} />
      <aside
        style={{ width: mobileOpen ? SIDEBAR_EXPANDED : undefined }}
        className={cn(
          "sidebar-panel fixed inset-y-0 left-0 z-40 flex h-dvh flex-col shadow-xl transition-[width,transform] duration-300 ease-in-out",
          mobileOpen ? "w-64 translate-x-0" : "-translate-x-full",
          "md:translate-x-0",
          collapsed ? "md:w-[4.5rem]" : "md:w-64"
        )}
      >
        <div
          className={cn(
            "flex h-16 shrink-0 items-center border-b border-[#ECEEF3] bg-white",
            showLabels ? "justify-between gap-2 px-3" : "justify-center px-2"
          )}
        >
          {showLabels ? (
            <span className="min-w-0 flex-1 truncate text-lg font-bold tracking-tight text-[#1A1D23]">
              {restaurantName || "Mon restaurant"}
            </span>
          ) : (
            <span className="text-lg font-bold text-[#1B3AE8]" aria-hidden>
              {(restaurantName || "M").charAt(0).toUpperCase()}
            </span>
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            className="hidden shrink-0 rounded-lg p-2 text-[#6B7280] hover:bg-[#F3F4F6] md:inline-flex"
            aria-label={collapsed ? "Ouvrir le menu" : "Réduire le menu"}
            title={collapsed ? "Ouvrir le menu" : "Réduire le menu"}
          >
            {collapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="shrink-0 rounded-lg p-2 text-[#6B7280] hover:bg-[#F3F4F6] md:hidden"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 lg:p-3" data-onboarding="sidebar-nav">
          <SidebarNav
            entries={navEntries}
            pathname={pathname}
            showLabels={showLabels}
            expandedGroups={expandedGroups}
            onToggleGroup={toggleGroup}
            onNavigate={() => setMobileOpen(false)}
          />
        </nav>

        <div className="shrink-0 border-t border-[#ECEEF3] bg-white p-2 lg:p-3">
          {showLabels ? (
            <div className="mb-2 flex items-center gap-3 px-1">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EEF2FF] text-[13px] font-bold text-[#1B3AE8]"
                aria-hidden
              >
                {session.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-[#1A1D23]">{session.name}</p>
                <p className="text-[12px] text-[#6B7280]">{ROLE_LABELS[session.role]}</p>
              </div>
            </div>
          ) : (
            <div
              className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-[#EEF2FF] text-[13px] font-bold text-[#1B3AE8]"
              title={session.name}
              aria-hidden
            >
              {session.name.charAt(0).toUpperCase()}
            </div>
          )}
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              title="Déconnexion"
              className={cn(
                "flex w-full min-h-[44px] items-center rounded-xl text-[14px] font-medium text-[#374151] hover:bg-[#FEF2F2] hover:text-[#EF4444]",
                showLabels ? "gap-3 px-3 py-2" : "justify-center px-2 py-2"
              )}
            >
              <LogOut className="h-5 w-5 shrink-0" />
              {showLabels && "Déconnexion"}
            </button>
          </form>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <div
        className="flex min-h-0 min-w-0 flex-1 flex-col transition-[margin-left] duration-300 ease-in-out md:ml-[var(--sidebar-width)]"
        style={{ "--sidebar-width": desktopSidebarWidth } as React.CSSProperties}
      >
        <header className="app-header z-20 flex h-16 shrink-0 items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className="rounded-lg p-2 text-[#1A1D23] md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            <button
              type="button"
              className="hidden rounded-lg p-2 text-[#6B7280] md:inline-flex"
              onClick={toggleCollapsed}
              aria-label={collapsed ? "Ouvrir le menu" : "Réduire le menu"}
              title={collapsed ? "Ouvrir le menu" : "Réduire le menu"}
            >
              {collapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </button>
            <div className="hidden truncate text-[15px] font-bold text-[#1A1D23] sm:block">
              {session.role === "employe"
                ? "Mon espace"
                : restaurantName || "Mon restaurant"}
            </div>
          </div>
          <NotificationBell />
        </header>
        <main className="page-main min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-24 md:pb-6 lg:p-6">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
      </div>
      {session.role === "employe" ? (
        <EmployeeBottomNav />
      ) : (
        <BottomNav items={bottomNavItems} onMore={() => setMobileOpen(true)} />
      )}
      {pathname === "/dashboard" && <RoleOnboarding session={session} />}
    </div>
  );
}
