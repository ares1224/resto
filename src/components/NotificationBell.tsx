"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import type { Notification } from "@/types";
import { Badge } from "./ui/Badge";

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Une réponse inattendue (session expirée, erreur passagère) ne doit jamais
    // faire tomber la page : on ignore tout ce qui n'est pas une liste.
    function load() {
      fetch("/api/notifications")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setNotifications(data);
        })
        .catch(() => {});
    }
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-2 hover:bg-stone-100 min-h-[44px] min-w-[44px]"
        aria-label="Notifications"
      >
        <Bell className="h-6 w-6 text-stone-600" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 max-h-96 w-[calc(100vw-2rem)] max-w-sm overflow-y-auto rounded-xl border border-stone-200 bg-white shadow-lg">
          <div className="border-b border-stone-100 px-4 py-2 font-semibold">Notifications</div>
          {notifications.length === 0 ? (
            <p className="p-4 text-sm text-stone-500">Aucune notification</p>
          ) : (
            notifications.slice(0, 10).map((n) => (
              <div
                key={n.id}
                className={`border-b border-stone-50 px-4 py-3 ${!n.read ? "bg-amber-50/50" : ""}`}
              >
                <button onClick={() => markRead(n.id)} className="w-full text-left hover:opacity-90">
                  <div className="flex items-center gap-2">
                    <Badge variant={n.severity === "critical" ? "danger" : n.severity === "warning" ? "warning" : "info"}>
                      {n.type}
                    </Badge>
                    {!n.read && <span className="h-2 w-2 rounded-full bg-amber-500" />}
                  </div>
                  <p className="mt-1 text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-stone-500">{n.message}</p>
                </button>
                {n.actionHref && (
                  <Link
                    href={n.actionHref}
                    onClick={() => markRead(n.id)}
                    className="mt-2 inline-block text-xs font-medium text-amber-700 hover:underline"
                  >
                    {n.actionLabel ?? "Voir le détail →"}
                  </Link>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
