import { cookies } from "next/headers";
import type { Role, User } from "@/types";
import { getDb } from "./db/store";

const SESSION_COOKIE = "bistrot_session";

export type Session = {
  userId: string;
  email: string;
  name: string;
  role: Role;
  employeeId?: string;
  mustChangePassword?: boolean;
};

export async function login(email: string, password: string): Promise<Session | null> {
  const db = await getDb();
  const user = db.users.find((u) => u.email === email && u.password === password);
  if (!user) return null;

  const session: Session = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    employeeId: user.employeeId,
    mustChangePassword: user.mustChangePassword === true,
  };

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

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
  const db = await getDb();
  const user = db.users.find((u) => u.id === session.userId);
  if (!user) return;

  const updated: Session = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    employeeId: user.employeeId,
    mustChangePassword: user.mustChangePassword === true,
  };

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, JSON.stringify(updated), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  if (!session) return null;
  const db = await getDb();
  return db.users.find((u) => u.id === session.userId) ?? null;
}
