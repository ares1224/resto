"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { toPublicError } from "@/lib/public-error";

type RestaurantRow = {
  id: string;
  name: string;
  cuisineType: string;
  contactEmail: string;
  createdAt: string;
  status: "pending" | "active" | "inactive";
  emailConfirmedAt: string | null;
  employeeCount: number;
};

type NotificationRow = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};

type Stats = {
  total: number;
  active: number;
  inactive: number;
  pending: number;
  recent: number;
};

const STATUS_LABEL: Record<RestaurantRow["status"], string> = {
  pending: "En attente",
  active: "Actif",
  inactive: "Inactif",
};

const STATUS_CLASS: Record<RestaurantRow["status"], string> = {
  pending: "bg-amber-50 text-amber-700",
  active: "bg-emerald-50 text-emerald-700",
  inactive: "bg-slate-100 text-[#6B7280]",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function AdminPage() {
  const [restaurants, setRestaurants] = useState<RestaurantRow[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/restaurants");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(toPublicError(data.error, "Impossible de charger les restaurants"));
      return;
    }
    setRestaurants(data.restaurants ?? []);
    setNotifications(data.notifications ?? []);
    setStats(data.stats ?? null);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(id: string, status: "active" | "inactive") {
    setBusyId(id);
    setError("");
    const res = await fetch("/api/admin/restaurants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(toPublicError(data.error, "Mise à jour impossible"));
    } else {
      await load();
    }
    setBusyId(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1A1D23]">Tableau de bord plateforme</h1>
        <p className="mt-1 text-[14px] text-[#6B7280]">Restaurants inscrits, activation et statistiques.</p>
      </div>

      {stats && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Restaurants", value: stats.total },
            { label: "Actifs", value: stats.active },
            { label: "En attente", value: stats.pending },
            { label: "Inscriptions (30 j.)", value: stats.recent },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">{item.label}</p>
              <p className="mt-1 text-2xl font-bold text-[#1A1D23]">{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card title="Restaurants inscrits">
        {restaurants.length === 0 ? (
          <p className="text-[14px] text-[#6B7280]">Aucun restaurant inscrit pour le moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#ECEEF3] text-[#6B7280]">
                  <th className="pb-2 font-semibold">Restaurant</th>
                  <th className="pb-2 font-semibold">Inscription</th>
                  <th className="pb-2 font-semibold">Statut</th>
                  <th className="pb-2 font-semibold">Employés</th>
                  <th className="pb-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {restaurants.map((r) => (
                  <tr key={r.id} className="border-b border-[#F3F4F6]">
                    <td className="py-3">
                      <p className="font-semibold text-[#1A1D23]">{r.name}</p>
                      <p className="text-[12px] text-[#6B7280]">
                        {r.cuisineType || "—"} · {r.contactEmail}
                      </p>
                    </td>
                    <td className="py-3 text-[#374151]">{formatDate(r.createdAt)}</td>
                    <td className="py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold ${STATUS_CLASS[r.status]}`}>
                        {STATUS_LABEL[r.status]}
                      </span>
                    </td>
                    <td className="py-3 text-[#374151]">{r.employeeCount}</td>
                    <td className="py-3">
                      {r.status === "inactive" || r.status === "pending" ? (
                        <Button
                          size="xs"
                          variant="soft"
                          disabled={busyId === r.id}
                          onClick={() => setStatus(r.id, "active")}
                        >
                          Activer
                        </Button>
                      ) : (
                        <Button
                          size="xs"
                          variant="danger"
                          disabled={busyId === r.id}
                          onClick={() => setStatus(r.id, "inactive")}
                        >
                          Désactiver
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Notifications plateforme">
        {notifications.length === 0 ? (
          <p className="text-[14px] text-[#6B7280]">Aucune notification.</p>
        ) : (
          <ul className="space-y-3">
            {notifications.slice(0, 8).map((n) => (
              <li key={n.id} className="rounded-xl bg-[#F5F6FA] px-3 py-2">
                <p className="text-[13px] font-semibold text-[#1A1D23]">{n.title}</p>
                <p className="text-[13px] text-[#374151]">{n.message}</p>
                <p className="mt-1 text-[11px] text-[#6B7280]">{formatDate(n.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
