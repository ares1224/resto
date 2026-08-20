import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Role } from "@/types";

const PUBLIC_PATHS = [
  "/login",
  "/inscription",
  "/confirmer-email",
  "/activer-compte",
  "/setup",
];

const PUBLIC_PREFIXES = ["/api/auth", "/api/setup", "/api/signup"];

const GERANT_ONLY_PREFIXES = [
  "/finances",
  "/parametres",
  "/assistant-ia",
  "/api/export",
  "/api/audit",
  "/api/settings",
  "/api/ai",
  "/api/employees",
  "/api/cash-flow",
];

const MANAGER_ALLOWED_FINANCE = "/finances/food-cost";

const EMPLOYE_ALLOWED_PREFIXES = [
  "/dashboard",
  "/personnel/planning",
  "/personnel/disponibilites",
  "/personnel/pointage",
  "/personnel/remplacements",
  "/mon-espace",
  "/api/availabilities",
  "/api/unavailability",
  "/api/replacements",
  "/api/timeclock",
  "/api/timeclock/qr-token",
  "/api/shifts",
  "/api/gdpr",
  "/api/notifications",
  "/api/auth/password",
  "/mon-espace/mot-de-passe",
];

const MANAGER_BLOCKED_PREFIXES = [
  "/personnel/employes",
  "/parametres",
];

const MANAGER_BLOCKED_FINANCE = [
  "/finances/tresorerie",
  "/finances/simulateur",
];

function matchesPrefix(path: string, prefixes: string[]) {
  return prefixes.some((p) => path === p || path.startsWith(p + "/"));
}

function isPublic(path: string) {
  if (PUBLIC_PATHS.includes(path)) return true;
  return matchesPrefix(path, PUBLIC_PREFIXES);
}

export function middleware(request: NextRequest) {
  const sessionRaw = request.cookies.get("bistrot_session")?.value;
  const path = request.nextUrl.pathname;

  if (path === "/setup") {
    return NextResponse.redirect(new URL("/inscription", request.url));
  }

  if (isPublic(path)) {
    return NextResponse.next();
  }

  if (!sessionRaw) {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  let session: { role: Role; mustChangePassword?: boolean };
  try {
    session = JSON.parse(sessionRaw);
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (session.mustChangePassword) {
    const passwordChangeAllowed =
      path === "/mon-espace/mot-de-passe" ||
      path.startsWith("/api/auth/password") ||
      path.startsWith("/api/auth/logout");
    if (!passwordChangeAllowed) {
      if (path.startsWith("/api/")) {
        return NextResponse.json({ error: "Mot de passe à changer" }, { status: 403 });
      }
      const url = new URL("/mon-espace/mot-de-passe", request.url);
      url.searchParams.set("required", "1");
      return NextResponse.redirect(url);
    }
  }

  const { role } = session;

  if (role === "superadmin") {
    const allowed =
      path === "/" ||
      path.startsWith("/admin") ||
      path.startsWith("/api/admin") ||
      path.startsWith("/api/auth");
    if (!allowed) {
      if (path.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  if (path.startsWith("/admin") || path.startsWith("/api/admin")) {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (role === "employe") {
    const allowed =
      matchesPrefix(path, EMPLOYE_ALLOWED_PREFIXES) || path === "/personnel";
    if (!allowed) {
      if (path.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  if (role === "manager") {
    if (matchesPrefix(path, MANAGER_BLOCKED_PREFIXES)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (path.startsWith("/finances")) {
      if (path.startsWith(MANAGER_ALLOWED_FINANCE)) {
        return NextResponse.next();
      }
      if (path === "/finances" || matchesPrefix(path, MANAGER_BLOCKED_FINANCE)) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
    if (matchesPrefix(path, ["/parametres", "/api/export", "/api/audit", "/api/settings"])) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  if (role !== "gerant" && matchesPrefix(path, GERANT_ONLY_PREFIXES)) {
    if (role === "manager" && path.startsWith(MANAGER_ALLOWED_FINANCE)) {
      return NextResponse.next();
    }
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg|sw.js|manifest.json).*)"],
};
