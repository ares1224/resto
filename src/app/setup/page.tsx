"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import type { SetupDraft } from "@/types";

const STEPS = [
  { n: 1, title: "Restaurant" },
  { n: 2, title: "Compte gérant" },
  { n: 3, title: "Paramètres" },
  { n: 4, title: "Récapitulatif" },
];

const CUISINES = ["Bistrot", "Brasserie", "Française", "Italienne", "Japonaise", "Fusion", "Autre"];
const TIMEZONES = [
  { value: "Europe/Paris", label: "Europe/Paris (UTC+1/+2)" },
  { value: "Europe/Brussels", label: "Europe/Bruxelles" },
  { value: "America/Martinique", label: "Martinique" },
  { value: "America/Guadeloupe", label: "Guadeloupe" },
  { value: "Indian/Reunion", label: "La Réunion" },
];
const CURRENCIES = [
  { value: "EUR", label: "Euro (€)" },
  { value: "USD", label: "Dollar ($)" },
  { value: "GBP", label: "Livre (£)" },
  { value: "CHF", label: "Franc suisse (CHF)" },
];
const LOCALES = [
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
];

const EMPTY: SetupDraft = {
  step: 1,
  restaurantName: "",
  address: "",
  cuisineType: "",
  covers: "",
  name: "",
  email: "",
  password: "",
  timezone: "Europe/Paris",
  currency: "EUR",
  locale: "fr",
};

function cuisineLabel(value: string) {
  return CUISINES.includes(value) ? value : value || "—";
}

function timezoneLabel(value: string) {
  return TIMEZONES.find((t) => t.value === value)?.label ?? value;
}

function currencyLabel(value: string) {
  return CURRENCIES.find((c) => c.value === value)?.label ?? value;
}

function localeLabel(value: string) {
  return LOCALES.find((l) => l.value === value)?.label ?? value;
}

export default function SetupPage() {
  const [draft, setDraft] = useState<SetupDraft>(EMPTY);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [welcome, setWelcome] = useState<string | null>(null);

  useEffect(() => {
    if (!welcome) return;
    const t = setTimeout(() => window.location.assign("/dashboard"), 4000);
    return () => clearTimeout(t);
  }, [welcome]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const persistDraft = useCallback(async (next: SetupDraft) => {
    try {
      await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_draft", draft: next }),
      });
    } catch {
      // Hors ligne : le prochain passage réessaiera.
    }
  }, []);

  useEffect(() => {
    fetch("/api/setup")
      .then((r) => r.json())
      .then((data) => {
        if (data.needsSetup === false) {
          window.location.replace("/dashboard");
          return;
        }
        if (data.draft) setDraft({ ...EMPTY, ...data.draft });
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  useEffect(() => {
    function flush() {
      const current = draftRef.current;
      const hasContent =
        current.restaurantName || current.name || current.email || current.address;
      if (!hasContent) return;
      void persistDraft(current);
    }
    function onHide() {
      if (document.visibilityState === "hidden") flush();
    }
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [persistDraft]);

  function update(partial: Partial<SetupDraft>) {
    setDraft((prev) => {
      const next = { ...prev, ...partial };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => void persistDraft(next), 600);
      return next;
    });
  }

  function validateStep(step: number): string | null {
    if (step === 1 && !draft.restaurantName.trim()) {
      return "Indiquez le nom de l'établissement.";
    }
    if (step === 2) {
      if (!draft.name.trim()) return "Indiquez votre nom.";
      if (!draft.email.trim()) return "Indiquez votre email.";
      if (draft.password.length < 6) return "Le mot de passe doit contenir au moins 6 caractères.";
    }
    return null;
  }

  async function goNext() {
    const message = validateStep(draft.step);
    if (message) {
      setError(message);
      return;
    }
    setError("");
    const next = { ...draft, step: Math.min(4, draft.step + 1) };
    setDraft(next);
    await persistDraft(next);
  }

  function goBack() {
    setError("");
    const next = { ...draft, step: Math.max(1, draft.step - 1) };
    setDraft(next);
    void persistDraft(next);
  }

  async function finish() {
    const first = validateStep(1) || validateStep(2);
    if (first) {
      setError(first);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Erreur lors de la configuration");
        setLoading(false);
        return;
      }
      setWelcome(data.restaurantName ?? draft.restaurantName);
    } catch {
      setError("Impossible d'enregistrer. Vérifiez votre connexion et réessayez.");
      setLoading(false);
    }
  }

  function enterDashboard() {
    window.location.assign("/dashboard");
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F6FA]">
        <p className="text-[#6B7280]">Chargement…</p>
      </div>
    );
  }

  if (welcome) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F6FA] p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1B3AE8] text-xl font-bold text-white">
            {welcome.charAt(0).toUpperCase()}
          </div>
          <p className="section-label">Bienvenue</p>
          <h1 className="mt-2 text-2xl font-bold text-[#1A1D23]">{welcome}</h1>
          <p className="mt-2 text-[14px] text-[#6B7280]">Votre espace est prêt.</p>
          <p className="mt-1 text-[12px] text-[#9CA3AF]">Redirection vers le tableau de bord…</p>
          <Button size="lg" className="mt-6 w-full" onClick={enterDashboard}>
            Commencer
          </Button>
        </div>
      </div>
    );
  }

  const progress = (draft.step / STEPS.length) * 100;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F6FA] p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.08)] sm:p-8">
        <p className="section-label">Configuration initiale</p>
        <h1 className="mt-1 text-2xl font-bold text-[#1A1D23]">Créer votre espace</h1>
        <p className="mt-1 text-[13px] text-[#6B7280]">
          Étape {draft.step} sur {STEPS.length} — vous pourrez reprendre plus tard.
        </p>

        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#ECEEF3]">
          <div
            className="h-full rounded-full bg-[#1B3AE8] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <ol className="mt-3 grid grid-cols-4 gap-1 text-center text-[11px] font-semibold">
          {STEPS.map((s) => (
            <li
              key={s.n}
              className={s.n <= draft.step ? "text-[#1B3AE8]" : "text-[#9CA3AF]"}
            >
              {s.n}. {s.title}
            </li>
          ))}
        </ol>

        <div className="mt-6 space-y-4">
          {draft.step === 1 && (
            <>
              <Field label="Nom de l'établissement">
                <input
                  value={draft.restaurantName}
                  onChange={(e) => update({ restaurantName: e.target.value })}
                  placeholder="Ex. La Table du Marché"
                  className="w-full rounded-xl border border-[#ECEEF3] bg-[#F5F6FA] px-4 py-3 text-[14px] outline-none focus:border-[#1B3AE8]"
                  autoFocus
                />
              </Field>
              <Field label="Adresse">
                <input
                  value={draft.address}
                  onChange={(e) => update({ address: e.target.value })}
                  placeholder="12 rue du Marché, Lyon"
                  className="w-full rounded-xl border border-[#ECEEF3] bg-[#F5F6FA] px-4 py-3 text-[14px] outline-none focus:border-[#1B3AE8]"
                />
              </Field>
              <Field label="Type de cuisine">
                <select
                  value={draft.cuisineType}
                  onChange={(e) => update({ cuisineType: e.target.value })}
                  className="w-full rounded-xl border border-[#ECEEF3] bg-[#F5F6FA] px-4 py-3 text-[14px] outline-none focus:border-[#1B3AE8]"
                >
                  <option value="">Choisir…</option>
                  {CUISINES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Capacité (couverts)">
                <input
                  type="number"
                  min={0}
                  value={draft.covers}
                  onChange={(e) => update({ covers: e.target.value })}
                  placeholder="40"
                  className="w-full rounded-xl border border-[#ECEEF3] bg-[#F5F6FA] px-4 py-3 text-[14px] outline-none focus:border-[#1B3AE8]"
                />
              </Field>
            </>
          )}

          {draft.step === 2 && (
            <>
              <Field label="Votre nom">
                <input
                  value={draft.name}
                  onChange={(e) => update({ name: e.target.value })}
                  className="w-full rounded-xl border border-[#ECEEF3] bg-[#F5F6FA] px-4 py-3 text-[14px] outline-none focus:border-[#1B3AE8]"
                  autoFocus
                />
              </Field>
              <Field label="Email de connexion">
                <input
                  type="email"
                  value={draft.email}
                  onChange={(e) => update({ email: e.target.value })}
                  className="w-full rounded-xl border border-[#ECEEF3] bg-[#F5F6FA] px-4 py-3 text-[14px] outline-none focus:border-[#1B3AE8]"
                />
              </Field>
              <Field label="Mot de passe">
                <PasswordInput
                  value={draft.password}
                  onChange={(e) => update({ password: e.target.value })}
                  minLength={6}
                />
              </Field>
            </>
          )}

          {draft.step === 3 && (
            <>
              <Field label="Fuseau horaire">
                <select
                  value={draft.timezone}
                  onChange={(e) => update({ timezone: e.target.value })}
                  className="w-full rounded-xl border border-[#ECEEF3] bg-[#F5F6FA] px-4 py-3 text-[14px] outline-none focus:border-[#1B3AE8]"
                >
                  {TIMEZONES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Devise">
                <select
                  value={draft.currency}
                  onChange={(e) => update({ currency: e.target.value })}
                  className="w-full rounded-xl border border-[#ECEEF3] bg-[#F5F6FA] px-4 py-3 text-[14px] outline-none focus:border-[#1B3AE8]"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Langue">
                <select
                  value={draft.locale}
                  onChange={(e) => update({ locale: e.target.value })}
                  className="w-full rounded-xl border border-[#ECEEF3] bg-[#F5F6FA] px-4 py-3 text-[14px] outline-none focus:border-[#1B3AE8]"
                >
                  {LOCALES.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )}

          {draft.step === 4 && (
            <ul className="divide-y divide-[#ECEEF3] rounded-xl bg-[#F5F6FA] px-4">
              <Recap label="Établissement" value={draft.restaurantName || "—"} />
              <Recap label="Adresse" value={draft.address || "—"} />
              <Recap label="Cuisine" value={cuisineLabel(draft.cuisineType)} />
              <Recap label="Couverts" value={draft.covers || "—"} />
              <Recap label="Gérant" value={draft.name || "—"} />
              <Recap label="Email" value={draft.email || "—"} />
              <Recap label="Fuseau" value={timezoneLabel(draft.timezone)} />
              <Recap label="Devise" value={currencyLabel(draft.currency)} />
              <Recap label="Langue" value={localeLabel(draft.locale)} />
            </ul>
          )}
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex gap-2">
          {draft.step > 1 && (
            <Button type="button" variant="secondary" onClick={goBack} className="flex-1">
              <ChevronLeft className="h-4 w-4" />
              Retour
            </Button>
          )}
          {draft.step < 4 ? (
            <Button type="button" onClick={goNext} className="flex-1">
              Continuer
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" onClick={finish} disabled={loading} className="flex-1">
              {loading ? "Enregistrement…" : "Valider et créer l'espace"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[13px] font-semibold text-[#374151]">{label}</label>
      {children}
    </div>
  );
}

function Recap({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-start justify-between gap-3 py-3 text-[14px]">
      <span className="text-[#6B7280]">{label}</span>
      <span className="flex items-center gap-1.5 text-right font-semibold text-[#1A1D23]">
        <Check className="h-3.5 w-3.5 shrink-0 text-[#10B981]" />
        {value}
      </span>
    </li>
  );
}
