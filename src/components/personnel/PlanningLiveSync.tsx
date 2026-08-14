"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Garde l'affichage du planning aligné sur les données. On compare l'empreinte
 * rendue côté serveur à celle du serveur : si le responsable ajoute, modifie ou
 * supprime un créneau, la page se rafraîchit sans action de l'utilisateur.
 */
export function PlanningLiveSync({
  signature,
  intervalMs = 15000,
}: {
  signature: string;
  intervalMs?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    let stopped = false;

    async function check() {
      if (stopped || document.visibilityState === "hidden") return;
      try {
        const res = await fetch("/api/shifts/sync", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { signature?: string };
        if (!stopped && data.signature && data.signature !== signature) {
          router.refresh();
        }
      } catch {
        // Hors ligne ou session expirée : on retentera au prochain cycle.
      }
    }

    const interval = setInterval(check, intervalMs);
    // Un retour sur l'onglet doit montrer le planning à jour immédiatement.
    document.addEventListener("visibilitychange", check);
    return () => {
      stopped = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", check);
    };
  }, [signature, intervalMs, router]);

  return null;
}
