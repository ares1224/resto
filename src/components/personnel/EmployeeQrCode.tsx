"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";

export function EmployeeQrCode() {
  const [dataUrl, setDataUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(120);

  async function refresh() {
    const res = await fetch("/api/timeclock/qr-token");
    if (!res.ok) return;
    const data = await res.json();
    setDataUrl(data.dataUrl);
    setExpiresAt(data.expiresAt);
    setSecondsLeft(data.refreshInSeconds ?? 120);
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 120000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 120 : s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  return (
    <Card title="Mon QR code de pointage">
      <p className="mb-3 text-sm font-medium text-amber-900">
        Présentez ce code à l&apos;accueil à votre arrivée et au départ. Il se renouvelle toutes les 2 minutes.
      </p>
      {dataUrl ? (
        <div className="flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dataUrl} alt="QR code pointage" className="rounded-xl border-4 border-amber-300" width={280} height={280} />
          <p className="text-sm font-bold text-amber-800">Renouvellement dans {secondsLeft}s</p>
        </div>
      ) : (
        <p className="text-sm">Génération du QR code…</p>
      )}
    </Card>
  );
}
