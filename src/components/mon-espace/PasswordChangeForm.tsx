"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PasswordInput } from "@/components/ui/PasswordInput";

export function PasswordChangeForm({ required }: { required?: boolean }) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword !== confirm) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Erreur");
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/dashboard"), 1500);
  }

  return (
    <Card title={required ? "Changez votre mot de passe" : "Changer mon mot de passe"}>
      {required && (
        <p className="mb-4 text-sm text-amber-900">
          Pour des raisons de sécurité, définissez un mot de passe personnel avant de continuer.
        </p>
      )}
      <form onSubmit={submit} className="grid max-w-md gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Mot de passe actuel</label>
          <PasswordInput value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Nouveau mot de passe</label>
          <PasswordInput value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Confirmer le nouveau mot de passe</label>
          <PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {done && <p className="text-sm font-semibold text-green-800">Mot de passe mis à jour.</p>}
        <Button type="submit" size="lg" disabled={loading}>
          {loading ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </form>
    </Card>
  );
}
