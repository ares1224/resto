"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Reservation } from "@/types";

export function ReservationsClient({ reservations }: { reservations: Reservation[] }) {
  const [loading, setLoading] = useState<string | null>(null);

  async function sendReminder(id: string) {
    setLoading(id);
    await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reminder", reservationId: id }),
    });
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="text-sm text-amber-700 hover:underline">← Accueil</Link>
      <h1 className="text-2xl font-bold">Réservations</h1>
      <p className="text-sm text-stone-600">Gérez les réservations et envoyez les rappels SMS/email anti no-show.</p>
      <Card title="Prochaines réservations" help="Les rappels automatiques sont proposés 24 h avant le service.">
        {reservations.length === 0 ? (
          <EmptyState
            title="Aucune réservation"
            description="Enregistrez ici les réservations de vos clients."
            actionLabel="Retour à l'accueil"
            actionHref="/dashboard"
          />
        ) : (
        <div className="space-y-3">
          {reservations.map((res) => (
            <div key={res.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-stone-50 p-4">
              <div>
                <p className="font-medium">{res.guestName} · {res.covers} couverts</p>
                <p className="text-sm text-stone-500">{res.date} à {res.time} · {res.guestPhone}</p>
                {res.notes && <p className="text-xs text-amber-700">{res.notes}</p>}
                <Badge variant={res.status === "confirmed" ? "success" : res.status === "no_show" ? "danger" : "default"}>
                  {res.status}
                </Badge>
              </div>
              {res.status === "confirmed" && !res.reminderSent && (
                <Button size="lg" onClick={() => sendReminder(res.id)} disabled={loading === res.id}>
                  Envoyer rappel SMS/email
                </Button>
              )}
              {res.reminderSent && <span className="text-sm text-green-700">Rappel envoyé ✓</span>}
            </div>
          ))}
        </div>
        )}
      </Card>
    </div>
  );
}
