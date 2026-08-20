"use client";

import { LogOut } from "lucide-react";
import type { Session } from "@/lib/auth";

export function AdminShell({
  session,
  children,
}: {
  session: Session;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F5F6FA]">
      <header className="flex items-center justify-between border-b border-[#ECEEF3] bg-white px-4 py-3 md:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1B3AE8] text-sm font-bold text-white">
            R
          </div>
          <div>
            <p className="text-[15px] font-bold text-[#1A1D23]">Plateforme</p>
            <p className="text-[12px] text-[#6B7280]">Super-admin · {session.name}</p>
          </div>
        </div>
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-semibold text-[#6B7280] hover:bg-[#F3F4F6]"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </form>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 md:px-8">{children}</main>
    </div>
  );
}
