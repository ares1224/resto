"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";

export default function SetupPage() {
  const router = useRouter();
  const [restaurantName, setRestaurantName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantName, name, email, password }),
    });
    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? "Erreur lors de la configuration");
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 to-stone-100 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-amber-950">Configuration initiale</h1>
        <p className="mt-2 text-sm text-amber-900">
          Bienvenue. Créez votre compte et renseignez les informations de base de votre établissement.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Nom de l&apos;établissement</label>
            <input
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              placeholder="Ex. La Table du Marché"
              className="w-full rounded-lg border px-4 py-3"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Votre nom</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full rounded-lg border px-4 py-3" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email de connexion</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full rounded-lg border px-4 py-3" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Mot de passe</label>
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Configuration…" : "Créer mon espace"}
          </Button>
        </form>
      </div>
    </div>
  );
}
