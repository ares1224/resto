"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { toPublicError } from "@/lib/public-error";

type CreateResult = {
  tempPassword?: string;
  activationPath?: string;
  message?: string;
};

export function EmployeeCreateForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CreateResult | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    role: "",
    email: "",
    phone: "",
    hourlyRate: "",
    weeklyMaxHours: "35",
    contractType: "CDI" as const,
    loginRole: "employe" as "employe" | "manager",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        hourlyRate: Number(form.hourlyRate) || 0,
        weeklyMaxHours: Number(form.weeklyMaxHours) || 35,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(toPublicError(data.error, "Erreur lors de l'enregistrement"));
      return;
    }

    setResult({
      tempPassword: data.tempPassword,
      activationPath: data.activationPath,
      message: data.message,
    });

    router.refresh();
  }

  function closeAndReset() {
    setOpen(false);
    setResult(null);
    setForm({
      firstName: "",
      lastName: "",
      role: "",
      email: "",
      phone: "",
      hourlyRate: "",
      weeklyMaxHours: "35",
      contractType: "CDI",
      loginRole: "employe",
    });
  }

  if (!open) {
    return <Button size="lg" onClick={() => setOpen(true)}>Ajouter un employé</Button>;
  }

  const activationUrl =
    typeof window !== "undefined" && result?.activationPath
      ? `${window.location.origin}${result.activationPath}`
      : result?.activationPath ?? "";

  return (
    <Card title="Nouvelle fiche employé">
      {result ? (
        <div className="space-y-4">
          <p className="font-semibold text-green-900">Employé enregistré avec succès.</p>
          <p className="text-sm text-amber-900">{result.message}</p>
          {result.tempPassword && (
            <div className="rounded-lg bg-amber-50 p-4 text-sm">
              <p className="font-bold">Mot de passe temporaire (à transmettre à l&apos;employé) :</p>
              <p className="mt-1 font-mono text-lg">{result.tempPassword}</p>
              <p className="mt-2 text-xs text-stone-600">
                L&apos;employé pourra le changer dès sa première connexion ou via « Mon mot de passe ».
              </p>
            </div>
          )}
          {activationUrl && (
            <div className="rounded-lg bg-stone-100 p-4 text-sm">
              <p className="font-bold">Lien d&apos;activation (choix du mot de passe personnel) :</p>
              <p className="mt-1 break-all font-mono text-xs">{activationUrl}</p>
              <p className="mt-2 text-xs text-stone-600">Valide 7 jours. Une notification a aussi été envoyée à l&apos;employé.</p>
            </div>
          )}
          <Button onClick={closeAndReset}>Fermer</Button>
        </div>
      ) : (
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <input required placeholder="Prénom *" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} className="rounded-lg border px-3 py-2" />
          <input required placeholder="Nom *" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} className="rounded-lg border px-3 py-2" />
          <input required placeholder="Poste (ex. Serveur) *" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className="rounded-lg border px-3 py-2 sm:col-span-2" />
          <input type="email" required placeholder="Email (compte connexion) *" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="rounded-lg border px-3 py-2 sm:col-span-2" />
          <input placeholder="Téléphone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="rounded-lg border px-3 py-2" />
          <input type="number" step="0.01" placeholder="Taux horaire €" value={form.hourlyRate} onChange={(e) => setForm((f) => ({ ...f, hourlyRate: e.target.value }))} className="rounded-lg border px-3 py-2" />
          <input type="number" placeholder="Heures max / semaine" value={form.weeklyMaxHours} onChange={(e) => setForm((f) => ({ ...f, weeklyMaxHours: e.target.value }))} className="rounded-lg border px-3 py-2" />
          <select value={form.loginRole} onChange={(e) => setForm((f) => ({ ...f, loginRole: e.target.value as "employe" | "manager" }))} className="rounded-lg border px-3 py-2 sm:col-span-2">
            <option value="employe">Compte employé</option>
            <option value="manager">Compte manager</option>
          </select>
          <p className="text-xs text-stone-600 sm:col-span-2">
            Un mot de passe temporaire et un lien d&apos;activation seront générés automatiquement. L&apos;employé recevra une notification in-app.
          </p>
          {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={loading}>{loading ? "Enregistrement…" : "Enregistrer"}</Button>
            <Button type="button" variant="secondary" onClick={closeAndReset}>Annuler</Button>
          </div>
        </form>
      )}
    </Card>
  );
}
