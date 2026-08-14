"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useState } from "react";

export function GdprActions() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function exportData() {
    setLoading(true);
    const res = await fetch("/api/gdpr/export");
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "mes-donnees.json";
      a.click();
      setMessage("Export téléchargé");
    }
    setLoading(false);
  }

  async function requestDeletion() {
    if (!confirm("Demander la suppression de vos données ? Une notification sera envoyée à l'établissement.")) return;
    setLoading(true);
    await fetch("/api/gdpr/request-deletion", { method: "POST" });
    setMessage("Demande de suppression enregistrée — vous serez recontacté(e)");
    setLoading(false);
  }

  return (
    <Card title="Vos droits RGPD">
      <div className="flex flex-wrap gap-3">
        <Button onClick={exportData} disabled={loading}>Télécharger mes données (JSON)</Button>
        <Button variant="danger" onClick={requestDeletion} disabled={loading}>Demander la suppression</Button>
      </div>
      {message && <p className="mt-3 text-sm font-semibold text-green-800">{message}</p>}
    </Card>
  );
}
