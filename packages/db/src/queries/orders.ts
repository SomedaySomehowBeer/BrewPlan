import { eq, and, sql, inArray, desc } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { db } from "../client";
import {
  orders,
  orderLines,
  customers,
  recipes,
  finishedGoodsStock,
  breweryProfile,
} from "../schema/index";
import {
  ORDER_TRANSITIONS,
  type OrderStatus,
  DEFAULT_TAX_RATE,
  INVOICE_NUMBER_PREFIX,
} from "@brewplan/shared";

// ── List ─────────────────────────────────────────────

export function list(filters?: { status?: OrderStatus; customerId?: string }) {
  const baseQuery = db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      customerId: orders.customerId,
      status: orders.status,
      orderDate: orders.orderDate,
      deliveryDate: orders.deliveryDate,
      deliveryAddress: orders.deliveryAddress,
      channel: orders.channel,
      subtotal: orders.subtotal,
      tax: orders.tax,
      total: orders.total,
      notes: orders.notes,
      invoiceNumber: orders.invoiceNumber,
      paidAt: orders.paidAt,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
      customerName: customers.name,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id));

  const conditions = [];
  if (filters?.status) {
    conditions.push(eq(orders.status, filters.status));
  }
  if (filters?.customerId) {
    conditions.push(eq(orders.customerId, filters.customerId));
  }

  if (conditions.length > 0) {
    return baseQuery
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(desc(orders.createdAt))
      .all();
  }

  return baseQuery.orderBy(desc(orders.createdAt)).all();
}

// ── Get ──────────────────────────────────────────────

export function get(id: string) {
  return (
    db.select().from(orders).where(eq(orders.id, id)).get() ?? null
  );
}

// ── Get with lines ───────────────────────────────────

export function getWithLines(id: string) {
  const order = get(id);
  if (!order) return null;

  const customer = db
    .select()
    .from(customers)
    .where(eq(customers.id, order.customerId))
    .get();

  const lines = db
    .select({
      id: orderLines.id,
      orderId: orderLines.orderId,
      recipeId: orderLines.recipeId,
      format: orderLines.format,
      finishedGoodsId: orderLines.finishedGoodsId,
      description: orderLines.description,
      quantity: orderLines.quantity,
      unitPrice: orderLines.unitPrice,
      lineTotal: orderLines.lineTotal,
      notes: orderLines.notes,
      recipeName: recipes.name,
    })
    .from(orderLines)
    .innerJoin(recipes, eq(orderLines.recipeId, recipes.id))
    .where(eq(orderLines.orderId, id))
    .all();

  return { ...order, customer: customer ?? null, lines };
}

// ── Create ───────────────────────────────────────────

function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const prefix = `ORD-${year}-`;

  const countResult = db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(orders)
    .where(sql`${orders.orderNumber} like ${prefix + "%"}`)
    .get();

  const sequence = (countResult?.count ?? 0) + 1;
  return `${prefix}${String(sequence).padStart(3, "0")}`;
}

export function create(data: {
  customerId: string;
  deliveryDate?: string | null;
  deliveryAddress?: string | null;
  channel?: string;
  notes?: string | null;
}) {
  const now = new Date().toISOString();
  const id = uuid();
  const orderNumber = generateOrderNumber();

  db.insert(orders)
    .values({
      id,
      orderNumber,
      customerId: data.customerId,
      status: "draft",
      orderDate: new Date().toISOString().split("T")[0],
      deliveryDate: data.deliveryDate ?? null,
      deliveryAddress: data.deliveryAddress ?? null,
      channel: (data.channel ?? "wholesale") as
        | "wholesale"
        | "taproom"
        | "online"
        | "market"
        | "other",
      subtotal: 0,
      tax: 0,
      total: 0,
      notes: data.notes ?? null,
      invoiceNumber: null,
      paidAt: null,
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
    deliveryDate: string | null;
    deliveryAddress: string | null;
    channel: string;
    notes: string | null;
  }>
) {
  const existing = get(id);
  if (!existing) throw new Error(`Order ${id} not found`);

  db.update(orders)
    .set({
      ...(data as Record<string, unknown>),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(orders.id, id))
    .run();

  return get(id)!;
}

// ── Lines ────────────────────────────────────────────

export function addLine(
  orderId: string,
  data: {
    recipeId: string;
    format: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    notes?: string | null;
  }
) {
  const id = uuid();
  const lineTotal = data.quantity * data.unitPrice;

  // Auto-generate description if not provided
  const recipe = db
    .select()
    .from(recipes)
    .where(eq(recipes.id, data.recipeId))
    .get();

  const FORMAT_LABELS: Record<string, string> = {
    keg_50l: "50L Keg",
    keg_30l: "30L Keg",
    keg_20l: "20L Keg",
    can_375ml: "375ml Can",
    can_355ml: "355ml Can",
    bottle_330ml: "330ml Bottle",
    bottle_500ml: "500ml Bottle",
    other: "Other",
  };

  const description =
    data.description ||
    `${recipe?.name ?? "Unknown"} — ${FORMAT_LABELS[data.format] ?? data.format}`;

  db.insert(orderLines)
    .values({
      id,
      orderId,
      recipeId: data.recipeId,
      format: data.format as
        | "keg_50l"
        | "keg_30l"
        | "keg_20l"
        | "can_375ml"
        | "can_355ml"
        | "bottle_330ml"
        | "bottle_500ml"
        | "other",
      finishedGoodsId: null,
      description,
      quantity: data.quantity,
      unitPrice: data.unitPrice,
      lineTotal,
      notes: data.notes ?? null,
    })
    .run();

  recalculateTotals(orderId);
  return db
    .select()
    .from(orderLines)
    .where(eq(orderLines.id, id))
    .get()!;
}

export function updateLine(
  lineId: string,
  data: {
    quantity?: number;
    unitPrice?: number;
    notes?: string | null;
    finishedGoodsId?: string | null;
  }
) {
  const existing = db
    .select()
    .from(orderLines)
    .where(eq(orderLines.id, lineId))
    .get();
  if (!existing) throw new Error(`Order line ${lineId} not found`);

  const qty = data.quantity ?? existing.quantity;
  const price = data.unitPrice ?? existing.unitPrice;

  const updates: Record<string, unknown> = {
    quantity: qty,
    unitPrice: price,
    lineTotal: qty * price,
  };

  if (data.notes !== undefined) updates.notes = data.notes ?? null;
  if (data.finishedGoodsId !== undefined)
    updates.finishedGoodsId = data.finishedGoodsId ?? null;

  db.update(orderLines)
    .set(updates)
    .where(eq(orderLines.id, lineId))
    .run();

  recalculateTotals(existing.orderId);
}

export function removeLine(lineId: string) {
  const existing = db
    .select()
    .from(orderLines)
    .where(eq(orderLines.id, lineId))
    .get();
  if (!existing) throw new Error(`Order line ${lineId} not found`);

  db.delete(orderLines).where(eq(orderLines.id, lineId)).run();
  recalculateTotals(existing.orderId);
}

// ── Totals ───────────────────────────────────────────

export function recalculateTotals(orderId: string) {
  const result = db
    .select({
      subtotal: sql<number>`coalesce(sum(${orderLines.lineTotal}), 0)`,
    })
    .from(orderLines)
    .where(eq(orderLines.orderId, orderId))
    .get();

  const subtotal = result?.subtotal ?? 0;
  const tax = Math.round(subtotal * DEFAULT_TAX_RATE * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  db.update(orders)
    .set({
      subtotal,
      tax,
      total,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(orders.id, orderId))
    .run();
}

// ── Generate invoice number ──────────────────────────

function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  const countResult = db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(orders)
    .where(sql`${orders.invoiceNumber} like ${prefix + "%"}`)
    .get();

  const sequence = (countResult?.count ?? 0) + 1;
  return `${prefix}${String(sequence).padStart(3, "0")}`;
}

// ── Transition ───────────────────────────────────────

export function transition(id: string, toStatus: OrderStatus) {
  const order = get(id);
  if (!order) throw new Error(`Order ${id} not found`);

  const currentStatus = order.status as OrderStatus;
  const allowedTransitions = ORDER_TRANSITIONS[currentStatus];

  if (!allowedTransitions || !allowedTransitions.includes(toStatus)) {
    throw new Error(
      `Invalid transition from "${currentStatus}" to "${toStatus}"`
    );
  }

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    status: toStatus,
    updatedAt: now,
  };

  const lines = db
    .select()
    .from(orderLines)
    .where(eq(orderLines.orderId, id))
    .all();

  // ── Guards ──────────────────────────────────────────
  if (currentStatus === "draft" && toStatus === "confirmed") {
    if (lines.length === 0) {
      throw new Error("At least one order line is required");
    }
    for (const line of lines) {
      if (!line.recipeId || !line.format) {
        throw new Error("All order lines must have a recipe and format");
      }
    }
    if (!order.deliveryDate) {
      throw new Error("Delivery date must be set before confirming");
    }
  }

  if (currentStatus === "confirmed" && toStatus === "picking") {
    for (const line of lines) {
      if (!line.finishedGoodsId) {
        throw new Error(
          "All order lines must be linked to finished goods before picking"
        );
      }
      const fg = db
        .select()
        .from(finishedGoodsStock)
        .where(eq(finishedGoodsStock.id, line.finishedGoodsId))
        .get();
      if (!fg) {
        throw new Error(`Finished goods not found for line "${line.description}"`);
      }
      const available = fg.quantityOnHand - fg.quantityReserved;
      if (available < line.quantity) {
        throw new Error(
          `Insufficient stock for "${line.description}": need ${line.quantity}, available ${available}`
        );
      }
    }
  }

  // ── Side Effects ────────────────────────────────────

  // Reserve stock on picking
  if (toStatus === "picking") {
    for (const line of lines) {
      if (line.finishedGoodsId) {
        db.update(finishedGoodsStock)
          .set({
            quantityReserved: sql`${finishedGoodsStock.quantityReserved} + ${line.quantity}`,
            updatedAt: now,
          })
          .where(eq(finishedGoodsStock.id, line.finishedGoodsId))
          .run();
      }
    }
  }

  // Dispatch: decrement on_hand and reserved
  if (toStatus === "dispatched") {
    // If coming from confirmed (shortcut), also reserve first
    if (currentStatus === "confirmed") {
      for (const line of lines) {
        if (!line.finishedGoodsId) {
          throw new Error(
            "All order lines must be linked to finished goods before dispatch"
          );
        }
        const fg = db
          .select()
          .from(finishedGoodsStock)
          .where(eq(finishedGoodsStock.id, line.finishedGoodsId))
          .get();
        if (!fg) {
          throw new Error(`Finished goods not found for line "${line.description}"`);
        }
        const available = fg.quantityOnHand - fg.quantityReserved;
        if (available < line.quantity) {
          throw new Error(
            `Insufficient stock for "${line.description}": need ${line.quantity}, available ${available}`
          );
        }
      }
    }

    for (const line of lines) {
      if (line.finishedGoodsId) {
        if (currentStatus === "confirmed") {
          // Shortcut: just decrement on_hand (no reservation to clear)
          db.update(finishedGoodsStock)
            .set({
              quantityOnHand: sql`${finishedGoodsStock.quantityOnHand} - ${line.quantity}`,
              updatedAt: now,
            })
            .where(eq(finishedGoodsStock.id, line.finishedGoodsId))
            .run();
        } else {
          // Normal: decrement both on_hand and reserved
          db.update(finishedGoodsStock)
            .set({
              quantityOnHand: sql`${finishedGoodsStock.quantityOnHand} - ${line.quantity}`,
              quantityReserved: sql`${finishedGoodsStock.quantityReserved} - ${line.quantity}`,
              updatedAt: now,
            })
            .where(eq(finishedGoodsStock.id, line.finishedGoodsId))
            .run();
        }
      }
    }
  }

  // Generate invoice number
  if (toStatus === "invoiced") {
    updates.invoiceNumber = generateInvoiceNumber();
  }

  // Set paid_at
  if (toStatus === "paid") {
    updates.paidAt = now;
  }

  // Release reserved stock on cancellation
  if (toStatus === "cancelled") {
    for (const line of lines) {
      if (line.finishedGoodsId) {
        const fg = db
          .select()
          .from(finishedGoodsStock)
          .where(eq(finishedGoodsStock.id, line.finishedGoodsId))
          .get();
        if (fg && fg.quantityReserved > 0) {
          const releaseQty = Math.min(fg.quantityReserved, line.quantity);
          db.update(finishedGoodsStock)
            .set({
              quantityReserved: sql`${finishedGoodsStock.quantityReserved} - ${releaseQty}`,
              updatedAt: now,
            })
            .where(eq(finishedGoodsStock.id, line.finishedGoodsId))
            .run();
        }
      }
    }
  }

  db.update(orders).set(updates).where(eq(orders.id, id)).run();

  return get(id)!;
}

// ── Get for Invoice ─────────────────────────────────

export function getForInvoice(id: string) {
  const orderWithLines = getWithLines(id);
  if (!orderWithLines) return null;

  const profile = db.select().from(breweryProfile).get() ?? null;

  return { ...orderWithLines, breweryProfile: profile };
}
