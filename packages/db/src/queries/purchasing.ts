import { eq, and, sql, inArray } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { db, type DbTransaction } from "../client";
import {
  purchaseOrders,
  purchaseOrderLines,
  suppliers,
  inventoryItems,
  inventoryLots,
  stockMovements,
} from "../schema/index";
import {
  PO_TRANSITIONS,
  type PurchaseOrderStatus,
  DEFAULT_TAX_RATE,
} from "@brewplan/shared";

// ── List ─────────────────────────────────────────────

export function list(filters?: { status?: PurchaseOrderStatus }) {
  const baseQuery = db
    .select({
      id: purchaseOrders.id,
      poNumber: purchaseOrders.poNumber,
      supplierId: purchaseOrders.supplierId,
      status: purchaseOrders.status,
      orderDate: purchaseOrders.orderDate,
      expectedDeliveryDate: purchaseOrders.expectedDeliveryDate,
      subtotal: purchaseOrders.subtotal,
      tax: purchaseOrders.tax,
      total: purchaseOrders.total,
      notes: purchaseOrders.notes,
      createdAt: purchaseOrders.createdAt,
      updatedAt: purchaseOrders.updatedAt,
      supplierName: suppliers.name,
    })
    .from(purchaseOrders)
    .innerJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id));

  if (filters?.status) {
    return baseQuery
      .where(eq(purchaseOrders.status, filters.status))
      .orderBy(sql`${purchaseOrders.createdAt} desc`)
      .all();
  }

  return baseQuery.orderBy(sql`${purchaseOrders.createdAt} desc`).all();
}

// ── Get ──────────────────────────────────────────────

export function get(id: string) {
  return (
    db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, id))
      .get() ?? null
  );
}

// ── Get with lines ───────────────────────────────────

export function getWithLines(id: string) {
  const po = get(id);
  if (!po) return null;

  const supplier = db
    .select()
    .from(suppliers)
    .where(eq(suppliers.id, po.supplierId))
    .get();

  const lines = db
    .select({
      id: purchaseOrderLines.id,
      purchaseOrderId: purchaseOrderLines.purchaseOrderId,
      inventoryItemId: purchaseOrderLines.inventoryItemId,
      quantityOrdered: purchaseOrderLines.quantityOrdered,
      quantityReceived: purchaseOrderLines.quantityReceived,
      unit: purchaseOrderLines.unit,
      unitCost: purchaseOrderLines.unitCost,
      lineTotal: purchaseOrderLines.lineTotal,
      notes: purchaseOrderLines.notes,
      inventoryItemName: inventoryItems.name,
    })
    .from(purchaseOrderLines)
    .innerJoin(
      inventoryItems,
      eq(purchaseOrderLines.inventoryItemId, inventoryItems.id)
    )
    .where(eq(purchaseOrderLines.purchaseOrderId, id))
    .all();

  return { ...po, supplier: supplier ?? null, lines };
}

// ── Create ───────────────────────────────────────────

function generatePoNumber(tx: DbTransaction): string {
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;

  const countResult = tx
    .select({
      count: sql<number>`count(*)`,
    })
    .from(purchaseOrders)
    .where(sql`${purchaseOrders.poNumber} like ${prefix + "%"}`)
    .get();

  const sequence = (countResult?.count ?? 0) + 1;
  return `${prefix}${String(sequence).padStart(3, "0")}`;
}

export function create(data: {
  supplierId: string;
  orderDate?: string | null;
  expectedDeliveryDate?: string | null;
  notes?: string | null;
}) {
  return db.transaction((tx) => {
    const now = new Date().toISOString();
    const id = uuid();
    const poNumber = generatePoNumber(tx);

    tx.insert(purchaseOrders)
      .values({
        id,
        poNumber,
        supplierId: data.supplierId,
        status: "draft",
        orderDate: data.orderDate ?? null,
        expectedDeliveryDate: data.expectedDeliveryDate ?? null,
        subtotal: 0,
        tax: 0,
        total: 0,
        notes: data.notes ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return tx.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)).get()!;
  });
}

// ── Update ───────────────────────────────────────────

export function update(
  id: string,
  data: Partial<{
    expectedDeliveryDate: string | null;
    notes: string | null;
  }>
) {
  const existing = get(id);
  if (!existing) throw new Error(`Purchase order ${id} not found`);

  db.update(purchaseOrders)
    .set({
      ...(data as Record<string, unknown>),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(purchaseOrders.id, id))
    .run();

  return get(id)!;
}

// ── Lines ────────────────────────────────────────────

export function addLine(
  poId: string,
  data: {
    inventoryItemId: string;
    quantityOrdered: number;
    unit: string;
    unitCost: number;
    notes?: string | null;
  }
) {
  return db.transaction((tx) => {
    const id = uuid();
    const lineTotal = data.quantityOrdered * data.unitCost;

    tx.insert(purchaseOrderLines)
      .values({
        id,
        purchaseOrderId: poId,
        inventoryItemId: data.inventoryItemId,
        quantityOrdered: data.quantityOrdered,
        quantityReceived: 0,
        unit: data.unit as "kg" | "g" | "ml" | "l" | "each",
        unitCost: data.unitCost,
        lineTotal,
        notes: data.notes ?? null,
      })
      .run();

    recalculateTotals(poId, tx);
    return tx
      .select()
      .from(purchaseOrderLines)
      .where(eq(purchaseOrderLines.id, id))
      .get()!;
  });
}

export function updateLine(
  lineId: string,
  data: {
    quantityOrdered?: number;
    unitCost?: number;
    notes?: string | null;
  }
) {
  db.transaction((tx) => {
    const existing = tx
      .select()
      .from(purchaseOrderLines)
      .where(eq(purchaseOrderLines.id, lineId))
      .get();
    if (!existing) throw new Error(`PO line ${lineId} not found`);

    const qty = data.quantityOrdered ?? existing.quantityOrdered;
    const cost = data.unitCost ?? existing.unitCost;

    // Guard: cannot lower quantityOrdered below what has already been received
    if (qty < existing.quantityReceived) {
      throw new Error(
        `Cannot set quantity ordered to ${qty}: ${existing.quantityReceived} already received`
      );
    }

    tx.update(purchaseOrderLines)
      .set({
        quantityOrdered: qty,
        unitCost: cost,
        lineTotal: qty * cost,
        notes: data.notes !== undefined ? data.notes ?? null : existing.notes,
      })
      .where(eq(purchaseOrderLines.id, lineId))
      .run();

    recalculateTotals(existing.purchaseOrderId, tx);
  });
}

export function removeLine(lineId: string) {
  db.transaction((tx) => {
    const existing = tx
      .select()
      .from(purchaseOrderLines)
      .where(eq(purchaseOrderLines.id, lineId))
      .get();
    if (!existing) throw new Error(`PO line ${lineId} not found`);

    tx.delete(purchaseOrderLines)
      .where(eq(purchaseOrderLines.id, lineId))
      .run();

    recalculateTotals(existing.purchaseOrderId, tx);
  });
}

// ── Totals ───────────────────────────────────────────

export function recalculateTotals(poId: string, tx?: DbTransaction) {
  function execute(d: DbTransaction) {
    const result = d
      .select({
        subtotal: sql<number>`coalesce(sum(${purchaseOrderLines.lineTotal}), 0)`,
      })
      .from(purchaseOrderLines)
      .where(eq(purchaseOrderLines.purchaseOrderId, poId))
      .get();

    const subtotal = result?.subtotal ?? 0;
    const tax = Math.round(subtotal * DEFAULT_TAX_RATE * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    d.update(purchaseOrders)
      .set({
        subtotal,
        tax,
        total,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(purchaseOrders.id, poId))
      .run();
  }

  if (tx) { execute(tx); return; }
  db.transaction((t) => execute(t));
}

// ── Transition ───────────────────────────────────────

export function transition(id: string, toStatus: PurchaseOrderStatus) {
  return db.transaction((tx) => {
    const po = tx
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, id))
      .get();
    if (!po) throw new Error(`Purchase order ${id} not found`);

    const currentStatus = po.status as PurchaseOrderStatus;
    const allowedTransitions = PO_TRANSITIONS[currentStatus];

    if (!allowedTransitions || !allowedTransitions.includes(toStatus)) {
      throw new Error(
        `Invalid transition from "${currentStatus}" to "${toStatus}"`
      );
    }

    // Guards
    if (currentStatus === "draft" && toStatus === "sent") {
      const lines = tx
        .select()
        .from(purchaseOrderLines)
        .where(eq(purchaseOrderLines.purchaseOrderId, id))
        .all();
      if (lines.length === 0) {
        throw new Error(
          "At least one line item is required before sending a PO"
        );
      }
    }

    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {
      status: toStatus,
      updatedAt: now,
    };

    // Side effects
    if (currentStatus === "draft" && toStatus === "sent") {
      if (!po.orderDate) {
        updates.orderDate = new Date().toISOString().split("T")[0];
      }
    }

    tx.update(purchaseOrders).set(updates).where(eq(purchaseOrders.id, id)).run();

    return tx.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)).get()!;
  });
}

// ── Receive Line ─────────────────────────────────────

export function receiveLine(data: {
  purchaseOrderLineId: string;
  quantityReceived: number;
  lotNumber: string;
  location?: string | null;
  notes?: string | null;
}) {
  return db.transaction((tx) => {
    const line = tx
      .select()
      .from(purchaseOrderLines)
      .where(eq(purchaseOrderLines.id, data.purchaseOrderLineId))
      .get();
    if (!line) throw new Error(`PO line ${data.purchaseOrderLineId} not found`);

    const po = tx
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, line.purchaseOrderId))
      .get();
    if (!po) throw new Error(`Purchase order not found`);

    // Validate PO status
    const validStatuses = ["sent", "acknowledged", "partially_received"];
    if (!validStatuses.includes(po.status)) {
      throw new Error(
        `Cannot receive goods for a PO with status "${po.status}"`
      );
    }

    // Enforce over-receipt guard
    const newQtyReceived = line.quantityReceived + data.quantityReceived;
    if (newQtyReceived > line.quantityOrdered) {
      const remaining = line.quantityOrdered - line.quantityReceived;
      throw new Error(
        `Cannot receive ${data.quantityReceived}: only ${remaining} remaining on this line`
      );
    }

    const now = new Date().toISOString();

    // 1. Update quantity_received on the PO line
    tx.update(purchaseOrderLines)
      .set({ quantityReceived: newQtyReceived })
      .where(eq(purchaseOrderLines.id, data.purchaseOrderLineId))
      .run();

    // 2. Create InventoryLot
    const lotId = uuid();
    tx.insert(inventoryLots)
      .values({
        id: lotId,
        inventoryItemId: line.inventoryItemId,
        lotNumber: data.lotNumber,
        quantityOnHand: data.quantityReceived,
        unit: line.unit,
        unitCost: line.unitCost,
        receivedDate: new Date().toISOString().split("T")[0],
        purchaseOrderId: po.id,
        location: data.location ?? null,
        notes: data.notes ?? null,
        createdAt: now,
      })
      .run();

    // 3. Create StockMovement
    const movementId = uuid();
    tx.insert(stockMovements)
      .values({
        id: movementId,
        inventoryLotId: lotId,
        movementType: "received",
        quantity: data.quantityReceived,
        referenceType: "purchase_order",
        referenceId: po.id,
        reason: `Received against ${po.poNumber}`,
        performedBy: null,
        createdAt: now,
      })
      .run();

    // 4. Evaluate PO status
    const allLines = tx
      .select()
      .from(purchaseOrderLines)
      .where(eq(purchaseOrderLines.purchaseOrderId, po.id))
      .all();

    const allFullyReceived = allLines.every(
      (l) => l.quantityReceived >= l.quantityOrdered
    );
    const anyReceived = allLines.some((l) => l.quantityReceived > 0);

    let newStatus = po.status;
    if (allFullyReceived) {
      newStatus = "received";
    } else if (anyReceived) {
      newStatus = "partially_received";
    }

    if (newStatus !== po.status) {
      tx.update(purchaseOrders)
        .set({
          status: newStatus,
          updatedAt: now,
        })
        .where(eq(purchaseOrders.id, po.id))
        .run();
    }

    return { lotId, newPoStatus: newStatus };
  });
}

// ── Get quantity on order for an inventory item ──────

export function getQuantityOnOrder(inventoryItemId: string): number {
  const result = db
    .select({
      total:
        sql<number>`coalesce(sum(${purchaseOrderLines.quantityOrdered} - ${purchaseOrderLines.quantityReceived}), 0)`,
    })
    .from(purchaseOrderLines)
    .innerJoin(
      purchaseOrders,
      eq(purchaseOrderLines.purchaseOrderId, purchaseOrders.id)
    )
    .where(
      and(
        eq(purchaseOrderLines.inventoryItemId, inventoryItemId),
        inArray(purchaseOrders.status, [
          "sent",
          "acknowledged",
          "partially_received",
        ])
      )
    )
    .get();

  return result?.total ?? 0;
}
