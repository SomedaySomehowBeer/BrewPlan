import { eq, sql } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { db } from "../client";
import { customers, orders } from "../schema/index";

// ── List ─────────────────────────────────────────────

export function list(filters?: { archived?: boolean }) {
  const orderCounts = db
    .select({
      customerId: orders.customerId,
      orderCount: sql<number>`count(*)`.as("order_count"),
    })
    .from(orders)
    .groupBy(orders.customerId)
    .as("order_counts");

  let query = db
    .select({
      id: customers.id,
      name: customers.name,
      customerType: customers.customerType,
      contactName: customers.contactName,
      email: customers.email,
      phone: customers.phone,
      addressLine1: customers.addressLine1,
      addressLine2: customers.addressLine2,
      city: customers.city,
      state: customers.state,
      postcode: customers.postcode,
      country: customers.country,
      deliveryInstructions: customers.deliveryInstructions,
      paymentTerms: customers.paymentTerms,
      notes: customers.notes,
      archived: customers.archived,
      createdAt: customers.createdAt,
      updatedAt: customers.updatedAt,
      orderCount: sql<number>`coalesce(${orderCounts.orderCount}, 0)`,
    })
    .from(customers)
    .leftJoin(orderCounts, eq(customers.id, orderCounts.customerId));

  if (filters?.archived !== undefined) {
    return query
      .where(eq(customers.archived, filters.archived))
      .orderBy(customers.name)
      .all();
  }

  return query.orderBy(customers.name).all();
}

// ── Get ──────────────────────────────────────────────

export function get(id: string) {
  return (
    db.select().from(customers).where(eq(customers.id, id)).get() ?? null
  );
}

// ── Create ───────────────────────────────────────────

export function create(data: {
  name: string;
  customerType: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postcode?: string | null;
  country?: string;
  deliveryInstructions?: string | null;
  paymentTerms?: string | null;
  notes?: string | null;
}) {
  const now = new Date().toISOString();
  const id = uuid();

  db.insert(customers)
    .values({
      id,
      name: data.name,
      customerType: data.customerType as
        | "venue"
        | "bottle_shop"
        | "distributor"
        | "taproom"
        | "market"
        | "other",
      contactName: data.contactName ?? null,
      email: data.email || null,
      phone: data.phone ?? null,
      addressLine1: data.addressLine1 ?? null,
      addressLine2: data.addressLine2 ?? null,
      city: data.city ?? null,
      state: data.state ?? null,
      postcode: data.postcode ?? null,
      country: data.country ?? "Australia",
      deliveryInstructions: data.deliveryInstructions ?? null,
      paymentTerms: data.paymentTerms ?? null,
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
    customerType: string;
    contactName: string | null;
    email: string | null;
    phone: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    state: string | null;
    postcode: string | null;
    country: string;
    deliveryInstructions: string | null;
    paymentTerms: string | null;
    notes: string | null;
    archived: boolean;
  }>
) {
  const existing = get(id);
  if (!existing) throw new Error(`Customer ${id} not found`);

  const normalized = { ...data };
  if (normalized.email === "") normalized.email = null;

  db.update(customers)
    .set({
      ...(normalized as Record<string, unknown>),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(customers.id, id))
    .run();

  return get(id)!;
}
