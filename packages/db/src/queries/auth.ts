import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { db } from "../client";
import { users } from "../schema/index";
import type { UserRole } from "@brewplan/shared";

export function getUserById(id: string) {
  return db.select().from(users).where(eq(users.id, id)).get() ?? null;
}

export function getUserByEmail(email: string) {
  return db.select().from(users).where(eq(users.email, email)).get() ?? null;
}

export function verifyLogin(email: string, password: string) {
  const user = getUserByEmail(email);
  if (!user) return null;

  const valid = bcrypt.compareSync(password, user.passwordHash);
  if (!valid) return null;

  return user;
}

export function createUser(data: {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}) {
  const now = new Date().toISOString();
  const id = uuid();
  const passwordHash = bcrypt.hashSync(data.password, 10);

  db.insert(users)
    .values({
      id,
      email: data.email,
      passwordHash,
      name: data.name,
      role: data.role ?? "brewer",
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return getUserById(id)!;
}

export function listUsers() {
  return db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .all();
}

export function updateUser(
  id: string,
  data: { name?: string; email?: string; role?: UserRole }
) {
  const existing = getUserById(id);
  if (!existing) throw new Error(`User ${id} not found`);

  db.update(users)
    .set({
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
      ...(data.role !== undefined ? { role: data.role } : {}),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, id))
    .run();

  return getUserById(id)!;
}

export function changePassword(
  id: string,
  currentPassword: string,
  newPassword: string
) {
  const user = getUserById(id);
  if (!user) throw new Error(`User ${id} not found`);

  const valid = bcrypt.compareSync(currentPassword, user.passwordHash);
  if (!valid) throw new Error("Current password is incorrect");

  const passwordHash = bcrypt.hashSync(newPassword, 10);
  db.update(users)
    .set({
      passwordHash,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, id))
    .run();
}

export function adminResetPassword(id: string, newPassword: string) {
  const user = getUserById(id);
  if (!user) throw new Error(`User ${id} not found`);

  const passwordHash = bcrypt.hashSync(newPassword, 10);
  db.update(users)
    .set({
      passwordHash,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, id))
    .run();
}
