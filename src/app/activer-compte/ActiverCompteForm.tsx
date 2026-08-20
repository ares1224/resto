"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { toPublicError } from "@/lib/public-error";

export function ActiverCompteForm({ token }: { token: string }) {
  const router = useRouter();
  const [valid, setValid] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setValid(false);
      return;
    }
    fetch(`/api/auth/activate?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        setValid(data.valid === true);
        if (data.email) setEmail(data.email);
      })
      .catch(() => setValid(false));
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(toPublicError(data.error));
      return;
    }
    router.push(data.redirectTo || "/dashboard");
    router.refresh();
  }

  if (valid === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-amber-50">
        <p>Vérification du lien…</p>
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-amber-50 p-4">
        <div className="rounded-xl border bg-white p-8 text-center">
          <h1 className="text-xl font-bold text-amber-950">Lien invalide ou expiré</h1>
          <p className="mt-2 text-sm text-stone-600">Contactez votre établissement pour un nouveau lien ou utilisez le mot de passe temporaire.</p>
          <Button className="mt-4" onClick={() => router.push("/login")}>Aller à la connexion</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 to-stone-100 p-4">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-amber-950">Créer votre mot de passe</h1>
        <p className="mt-2 text-sm text-amber-900">Compte : {email}</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Nouveau mot de passe</label>
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Confirmer</label>
            <PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Activation…" : "Activer mon compte"}
          </Button>
        </form>
      </div>
    </div>
  );
}
