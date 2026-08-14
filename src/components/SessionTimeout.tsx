"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const TIMEOUT_MS = 30 * 60 * 1000;

export function SessionTimeout({ minutes = 30 }: { minutes?: number }) {
  const router = useRouter();
  const timeout = minutes * 60 * 1000;

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login?reason=timeout");
    router.refresh();
  }, [router]);

  useEffect(() => {
    let timer = setTimeout(logout, timeout || TIMEOUT_MS);

    function resetTimer() {
      clearTimeout(timer);
      timer = setTimeout(logout, timeout || TIMEOUT_MS);
    }

    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));

    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [logout, timeout]);

  return null;
}
