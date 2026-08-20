"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { toPublicError } from "@/lib/public-error";

export function ConfirmResendForm({
  defaultEmail = "",
  submitLabel = "Renvoyer l’email",
}: {
  defaultEmail?: string;
  submitLabel?: string;
}) {
  const [email, setEmail] = useState(defaultEmail);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    const res = await fetch("/api/signup/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(toPublicError(data.error, "Impossible de renvoyer l’email"));
      return;
    }
    setMessage("Un nouvel email de confirmation a été envoyé.");
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-3 text-left">
      {!defaultEmail && (
        <label className="block text-[13px] font-semibold text-[#374151]">
          Votre email de connexion
        </label>
      )}
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        readOnly={Boolean(defaultEmail)}
        placeholder="Votre email de connexion"
        className="w-full rounded-xl border border-[#ECEEF3] bg-[#F5F6FA] px-4 py-3 text-[14px] outline-none focus:border-[#1B3AE8]"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-emerald-700">{message}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Envoi…" : submitLabel}
      </Button>
    </form>
  );
}
