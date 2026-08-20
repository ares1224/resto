"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      if (data.mustChangePassword) {
        window.location.assign("/mon-espace/mot-de-passe?required=1");
      } else {
        window.location.assign(data.redirectTo || "/dashboard");
      }
    } else {
      setError(data.error || "Identifiants invalides");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F6FA] p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1B3AE8] text-lg font-bold text-white">
            R
          </div>
          <h1 className="text-2xl font-bold text-[#1A1D23]">Gestion restaurant</h1>
          <p className="mt-1 text-[14px] text-[#6B7280]">Connectez-vous à votre espace</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-[13px] font-semibold text-[#374151]">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-[#ECEEF3] bg-[#F5F6FA] px-4 py-3 text-[14px] outline-none focus:border-[#1B3AE8]"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-[13px] font-semibold text-[#374151]">Mot de passe</label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Connexion..." : "Se connecter"}
          </Button>
        </form>
        <p className="mt-6 text-center text-[14px] text-[#6B7280]">
          Nouveau restaurant ?{" "}
          <Link href="/inscription" className="font-semibold text-[#1B3AE8] hover:underline">
            Créer un espace
          </Link>
        </p>
        <p className="mt-3 text-center text-[13px] text-[#6B7280]">
          Pas reçu l’email de confirmation ?{" "}
          <Link href="/confirmer-email" className="font-semibold text-[#1B3AE8] hover:underline">
            Renvoyer le lien
          </Link>
        </p>
      </div>
    </div>
  );
}
