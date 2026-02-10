import { eq, and, sql } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { db } from "../client";
import { suppliers, inventoryItems } from "../schema/index";

// ── List ─────────────────────────────────────────────

export function list(filters?: { archived?: boolean }) {
  const baseQuery = db
    .select({
      id: suppliers.id,
      name: suppliers.name,
      contactName: suppliers.contactName,
      email: suppliers.email,
      phone: suppliers.phone,
      address: suppliers.address,
      website: suppliers.website,
      paymentTerms: suppliers.paymentTerms,
      leadTimeDays: suppliers.leadTimeDays,
      minimumOrderValue: suppliers.minimumOrderValue,
      notes: suppliers.notes,
      archived: suppliers.archived,
      createdAt: suppliers.createdAt,
      updatedAt: suppliers.updatedAt,
      itemCount: sql<number>`count(${inventoryItems.id})`,
    })
    .from(suppliers)
    .leftJoin(inventoryItems, eq(inventoryItems.supplierId, suppliers.id))
    .groupBy(suppliers.id);

  if (filters?.archived !== undefined) {
    return baseQuery
      .where(eq(suppliers.archived, filters.archived))
      .orderBy(suppliers.name)
      .all();
  }
  return baseQuery.orderBy(suppliers.name).all();
}

// ── Get ──────────────────────────────────────────────

export function get(id: string) {
  return (
    db.select().from(suppliers).where(eq(suppliers.id, id)).get() ?? null
  );
}

// ── Get with linked items ────────────────────────────

export function getWithItems(id: string) {
  const supplier = get(id);
  if (!supplier) return null;

  const items = db
    .select()
    .from(inventoryItems)
    .where(eq(inventoryItems.supplierId, id))
    .orderBy(inventoryItems.name)
    .all();

  return { ...supplier, items };
}

// ── Create ───────────────────────────────────────────

export function create(data: {
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
  paymentTerms?: string | null;
  leadTimeDays?: number | null;
  minimumOrderValue?: number | null;
  notes?: string | null;
}) {
  const now = new Date().toISOString();
  const id = uuid();

  db.insert(suppliers)
    .values({
      id,
      name: data.name,
      contactName: data.contactName ?? null,
      email: data.email || null,
      phone: data.phone ?? null,
      address: data.address ?? null,
      website: data.website ?? null,
      paymentTerms: data.paymentTerms ?? null,
      leadTimeDays: data.leadTimeDays ?? null,
      minimumOrderValue: data.minimumOrderValue ?? null,
      notes: data.notes ?? null,
      archived: false,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return get(id)!;
}

// ── Update ───────────────────────────────────────────

export function update(
  id: string,
  data: Partial<{
    name: string;
    contactName: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    website: string | null;
    paymentTerms: string | null;
    leadTimeDays: number | null;
    minimumOrderValue: number | null;
    notes: string | null;
    archived: boolean;
  }>
) {
  const existing = get(id);
  if (!existing) throw new Error(`Supplier ${id} not found`);

  // Normalize empty email to null
  const normalized = { ...data };
  if (normalized.email === "") normalized.email = null;

  db.update(suppliers)
    .set({
      ...(normalized as Record<string, unknown>),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(suppliers.id, id))
    .run();

  return get(id)!;
}
