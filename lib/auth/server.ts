import "server-only";
import { cookies } from "next/headers";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { createSessionCookieValue, getSessionCookieOptions, SESSION_COOKIE_NAME, verifySessionCookieValue } from "@/lib/auth/session";
import { getUserById } from "@/lib/auth/service";
import type { SafeUser, UserRole } from "@/lib/types";

export async function createUserSession(user: SafeUser) {
  const cookieStore = await cookies();
  const value = await createSessionCookieValue(user);
  cookieStore.set(SESSION_COOKIE_NAME, value, getSessionCookieOptions());
}

export async function clearUserSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionCookieValue(sessionValue);

  if (!session) {
    return null;
  }

  const user = await getUserById(session.userId);

  if (!user || user.role !== session.role) {
    return null;
  }

  return user;
}

export async function requireUserRole(role: UserRole, redirectTo: Route) {
  const user = await getCurrentUser();

  if (!user || user.role !== role) {
    redirect(redirectTo);
  }

  return user;
}
