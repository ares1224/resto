import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import type { Role, User } from "@/types";
import {
  findUserByEmail,
  findUserInPlatform,
  getPlatformDb,
} from "./db/store";

export const SESSION_COOKIE = "bistrot_session";

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};

export type Session = {
  userId: string;
  email: string;
  name: string;
  role: Role;
  restaurantId?: string;
  employeeId?: string;
  mustChangePassword?: boolean;
};

export class LoginBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LoginBlockedError";
  }
}

export function sessionFromUser(user: User): Session {
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    restaurantId: user.restaurantId,
    employeeId: user.employeeId,
    mustChangePassword: user.mustChangePassword === true,
  };
}

export async function writeSessionCookie(session: Session): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, JSON.stringify(session), SESSION_COOKIE_OPTIONS);
}

export function attachSessionCookie(response: NextResponse, session: Session): NextResponse {
  response.cookies.set(SESSION_COOKIE, JSON.stringify(session), SESSION_COOKIE_OPTIONS);
  return response;
}

export async function login(email: string, password: string): Promise<Session | null> {
  const platform = await getPlatformDb();
  const found = findUserByEmail(platform, email);
  if (!found || found.user.password !== password) return null;

  const { user } = found;

  if (user.role === "superadmin") {
    if (user.emailConfirmed === false) {
      throw new LoginBlockedError("Confirmez votre adresse email avant de vous connecter.");
    }
    const session = sessionFromUser(user);
    await writeSessionCookie(session);
    return session;
  }

  const restaurantId = user.restaurantId || found.restaurantId;
  const restaurant = platform.restaurants.find((r) => r.id === restaurantId);
  if (!restaurant) return null;

  if (user.emailConfirmed === false) {
    throw new LoginBlockedError(
      "Confirmez votre adresse email pour activer l’espace de votre restaurant."
    );
  }
  if (restaurant.status === "pending") {
    throw new LoginBlockedError(
      "Votre espace n’est pas encore activé. Confirmez d’abord votre email."
    );
  }
  if (restaurant.status === "inactive") {
    throw new LoginBlockedError(
      "Ce restaurant est désactivé. Contactez le support de la plateforme."
    );
  }

  const session = sessionFromUser({ ...user, restaurantId });
  await writeSessionCookie(session);
  return session;
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}

export async function refreshSessionCookie(): Promise<void> {
  const session = await getSession();
  if (!session) return;
  const platform = await getPlatformDb();
  const user = findUserInPlatform(platform, session.userId);
  if (!user) return;

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, JSON.stringify(sessionFromUser(user)), SESSION_COOKIE_OPTIONS);
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  if (!session) return null;
  const platform = await getPlatformDb();
  return findUserInPlatform(platform, session.userId) ?? null;
}

export function homePathForRole(role: Role): string {
  if (role === "superadmin") return "/admin";
  if (role === "employe") return "/dashboard";
  return "/dashboard";
}
