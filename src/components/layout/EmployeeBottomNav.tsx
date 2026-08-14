"use client";

import { usePathname } from "next/navigation";
import { Calendar, Clock, Home, CalendarClock } from "lucide-react";
import { BottomNav } from "./BottomNav";

const ITEMS = [
  { href: "/dashboard", label: "Accueil", icon: Home },
  { href: "/personnel/planning", label: "Horaires", icon: Calendar },
  { href: "/personnel/pointage", label: "Pointer", icon: Clock },
  { href: "/personnel/disponibilites", label: "Dispo", icon: CalendarClock },
];

export function EmployeeBottomNav() {
  const pathname = usePathname();

  return (
    <BottomNav
      items={ITEMS.map((item) => ({
        ...item,
        active:
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href),
      }))}
    />
  );
}
