import { createCookieSessionStorage, redirect } from "react-router";
import { queries } from "./db.server";
import type { UserRole } from "@brewplan/shared";

const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__brewplan_session",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
    sameSite: "lax",
    secrets: [SESSION_SECRET],
    secure: process.env.NODE_ENV === "production",
  },
});

export async function getSession(request: Request) {
  return sessionStorage.getSession(request.headers.get("Cookie"));
}

export async function getUserId(request: Request): Promise<string | null> {
  const session = await getSession(request);
  const userId = session.get("userId");
  return typeof userId === "string" ? userId : null;
}

export interface SessionUser {
  id: string;
  name: string;
  role: UserRole;
}

export async function requireUser(request: Request): Promise<SessionUser> {
  const userId = await getUserId(request);
  if (!userId) {
    throw redirect("/login");
  }

  const user = queries.auth.getUserById(userId);
  if (!user) {
    throw redirect("/login");
  }

  return { id: user.id, name: user.name, role: user.role as UserRole };
}

export async function requireRole(
  request: Request,
  ...allowedRoles: UserRole[]
): Promise<SessionUser> {
  const user = await requireUser(request);
  if (!allowedRoles.includes(user.role)) {
    throw new Response("Forbidden", { status: 403 });
  }
  return user;
}

export async function requireMutationAccess(
  request: Request
): Promise<SessionUser> {
  return requireRole(request, "admin", "brewer");
}

export async function requireAdminAccess(
  request: Request
): Promise<SessionUser> {
  return requireRole(request, "admin");
}

export async function createUserSession(userId: string, redirectTo: string) {
  const session = await sessionStorage.getSession();
  session.set("userId", userId);
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session),
    },
  });
}

export async function destroySession(request: Request) {
  const session = await getSession(request);
  return redirect("/login", {
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session),
    },
  });
}
