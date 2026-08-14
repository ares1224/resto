"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Session } from "@/lib/auth";
import { ONBOARDING_STEPS, onboardingStorageKey } from "@/lib/onboarding";
import { Button } from "@/components/ui/Button";

export function RoleOnboarding({ session }: { session: Session }) {
  const steps = ONBOARDING_STEPS[session.role];
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const key = onboardingStorageKey(session.userId);
    if (localStorage.getItem(key) !== "done") {
      setVisible(true);
    }
  }, [session.userId]);

  function finish() {
    localStorage.setItem(onboardingStorageKey(session.userId), "done");
    setVisible(false);
  }

  if (!visible || steps.length === 0) return null;

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 pb-[76px] sm:items-center sm:pb-4">
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
        data-onboarding={current.highlight}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              Première visite · {step + 1}/{steps.length}
            </p>
            <h2 className="mt-1 text-xl font-bold text-amber-950">{current.title}</h2>
          </div>
          <button
            type="button"
            onClick={finish}
            className="rounded-lg p-1 text-stone-500 hover:bg-stone-100"
            aria-label="Passer le tutoriel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm leading-relaxed text-stone-700">{current.body}</p>
        <div className="mt-6 flex gap-2">
          {step > 0 && (
            <Button variant="secondary" className="flex-1" onClick={() => setStep((s) => s - 1)}>
              Précédent
            </Button>
          )}
          {isLast ? (
            <Button className="flex-1" onClick={finish}>
              C&apos;est parti
            </Button>
          ) : (
            <Button className="flex-1" onClick={() => setStep((s) => s + 1)}>
              Suivant
            </Button>
          )}
        </div>
        <button
          type="button"
          onClick={finish}
          className="mt-3 w-full text-center text-xs text-stone-500 hover:text-stone-700"
        >
          Passer le tutoriel
        </button>
      </div>
    </div>
  );
}
