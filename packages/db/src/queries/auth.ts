import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { db } from "../client";
import { users } from "../schema/index";

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
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return getUserById(id)!;
}
