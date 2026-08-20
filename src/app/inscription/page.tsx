"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { toPublicError } from "@/lib/public-error";

const CUISINES = ["Bistrot", "Brasserie", "Française", "Italienne", "Japonaise", "Fusion", "Autre"];

const inputClass =
  "w-full rounded-xl border border-[#ECEEF3] bg-[#F5F6FA] px-4 py-3 text-[14px] outline-none focus:border-[#1B3AE8]";
const labelClass = "mb-1 block text-[13px] font-semibold text-[#374151]";

export default function InscriptionPage() {
  const [restaurantName, setRestaurantName] = useState("");
  const [address, setAddress] = useState("");
  const [cuisineType, setCuisineType] = useState("Bistrot");
  const [phone, setPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== passwordConfirm) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/signup", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurantName,
        address,
        cuisineType,
        phone,
        contactEmail,
        firstName,
        lastName,
        email,
        password,
        passwordConfirm,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      const loginResponse = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const loginData = await loginResponse.json().catch(() => ({}));
      window.location.href = loginData.redirectTo || data.redirectTo || "/dashboard";
      return;
    }
    setError(toPublicError(data.error, "Impossible de créer le compte"));
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F6FA] p-4 py-10">
      <div className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1B3AE8] text-lg font-bold text-white">
            R
          </div>
          <h1 className="text-2xl font-bold text-[#1A1D23]">Inscrire un restaurant</h1>
          <p className="mt-1 text-[14px] text-[#6B7280]">
            Créez l’espace de votre établissement.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <section>
            <h2 className="mb-3 text-[15px] font-bold text-[#1A1D23]">Restaurant</h2>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Nom du restaurant</label>
                <input className={inputClass} value={restaurantName} onChange={(e) => setRestaurantName(e.target.value)} required />
              </div>
              <div>
                <label className={labelClass}>Adresse complète</label>
                <input className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} required />
              </div>
              <div>
                <label className={labelClass}>Type de cuisine</label>
                <select className={inputClass} value={cuisineType} onChange={(e) => setCuisineType(e.target.value)}>
                  {CUISINES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Téléphone</label>
                <input className={inputClass} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </div>
              <div>
                <label className={labelClass}>Email de contact du restaurant</label>
                <input className={inputClass} type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required />
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-[15px] font-bold text-[#1A1D23]">Compte gérant</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Prénom</label>
                <input className={inputClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>
              <div>
                <label className={labelClass}>Nom</label>
                <input className={inputClass} value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>
            </div>
            <div className="mt-3 space-y-3">
              <div>
                <label className={labelClass}>Email (identifiant de connexion)</label>
                <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className={labelClass}>Mot de passe</label>
                <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>
              <div>
                <label className={labelClass}>Confirmation du mot de passe</label>
                <PasswordInput value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} required minLength={6} />
              </div>
            </div>
          </section>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Inscription…" : "Créer mon espace"}
          </Button>
        </form>
        <p className="mt-6 text-center text-[14px] text-[#6B7280]">
          Déjà inscrit ?{" "}
          <Link href="/login" className="font-semibold text-[#1B3AE8] hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
