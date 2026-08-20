"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toPublicError } from "@/lib/public-error";

export function EmployeeDeleteButton({
  employeeId,
  employeeName,
}: {
  employeeId: string;
  employeeName: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/employees/${employeeId}`, { method: "DELETE" });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(toPublicError(data.error, "Erreur lors de la suppression"));
      return;
    }

    setConfirming(false);
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex flex-col items-end gap-2">
        <p className="max-w-xs text-right text-sm text-red-800">
          Supprimer {employeeName} ? Cette action est irréversible (fiche, compte, planning).
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setConfirming(false)} disabled={loading}>
            Annuler
          </Button>
          <Button size="sm" variant="danger" onClick={handleDelete} disabled={loading}>
            {loading ? "Suppression…" : "Confirmer"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button size="sm" variant="danger" onClick={() => setConfirming(true)}>
      <Trash2 className="h-4 w-4" />
      Supprimer
    </Button>
  );
}
