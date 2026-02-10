import { eq, and, sql, inArray } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { db, type DbTransaction } from "../client";
import {
  inventoryItems,
  inventoryLots,
  stockMovements,
  brewBatches,
  recipes,
  recipeIngredients,
  purchaseOrderLines,
  purchaseOrders,
} from "../schema/index";
import type { InventoryCategory } from "@brewplan/shared";

// ── List ─────────────────────────────────────────────

export function list(filters?: {
  category?: InventoryCategory;
  archived?: boolean;
}) {
  // Build a subquery to sum lot quantities per item
  const lotSums = db
    .select({
      inventoryItemId: inventoryLots.inventoryItemId,
      totalOnHand: sql<number>`coalesce(sum(${inventoryLots.quantityOnHand}), 0)`.as(
        "total_on_hand"
      ),
    })
    .from(inventoryLots)
    .groupBy(inventoryLots.inventoryItemId)
    .as("lot_sums");

  let query = db
    .select({
      id: inventoryItems.id,
      name: inventoryItems.name,
      sku: inventoryItems.sku,
      category: inventoryItems.category,
      subcategory: inventoryItems.subcategory,
      unit: inventoryItems.unit,
      unitCost: inventoryItems.unitCost,
      reorderPoint: inventoryItems.reorderPoint,
      reorderQty: inventoryItems.reorderQty,
      minimumOrderQty: inventoryItems.minimumOrderQty,
      allergens: inventoryItems.allergens,
      isGlutenFree: inventoryItems.isGlutenFree,
      countryOfOrigin: inventoryItems.countryOfOrigin,
      notes: inventoryItems.notes,
      archived: inventoryItems.archived,
      createdAt: inventoryItems.createdAt,
      updatedAt: inventoryItems.updatedAt,
      quantityOnHand: sql<number>`coalesce(${lotSums.totalOnHand}, 0)`,
    })
    .from(inventoryItems)
    .leftJoin(lotSums, eq(inventoryItems.id, lotSums.inventoryItemId));

  const conditions = [];
  if (filters?.category) {
    conditions.push(eq(inventoryItems.category, filters.category));
  }
  if (filters?.archived !== undefined) {
    conditions.push(eq(inventoryItems.archived, filters.archived));
  }

  if (conditions.length > 0) {
    return query
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(inventoryItems.name)
      .all();
  }

  return query.orderBy(inventoryItems.name).all();
}

// ── Get ──────────────────────────────────────────────

export function get(id: string) {
  return (
    db.select().from(inventoryItems).where(eq(inventoryItems.id, id)).get() ??
    null
  );
}

// ── Get position for a single item ───────────────────

export function getPosition(id: string) {
  // on_hand: sum of all lot quantities for this item
  const onHandResult = db
    .select({
      total: sql<number>`coalesce(sum(${inventoryLots.quantityOnHand}), 0)`,
    })
    .from(inventoryLots)
    .where(eq(inventoryLots.inventoryItemId, id))
    .get();

  const quantityOnHand = onHandResult?.total ?? 0;

  // allocated: sum of recipe ingredient quantities across planned/brewing batches,
  // scaled by batch_size_litres / recipe.batch_size_litres
  const allocatedResult = db
    .select({
      total:
        sql<number>`coalesce(sum(${recipeIngredients.quantity} * (${brewBatches.batchSizeLitres} / ${recipes.batchSizeLitres})), 0)`,
    })
    .from(brewBatches)
    .innerJoin(recipes, eq(brewBatches.recipeId, recipes.id))
    .innerJoin(recipeIngredients, eq(recipeIngredients.recipeId, recipes.id))
    .where(
      and(
        eq(recipeIngredients.inventoryItemId, id),
        inArray(brewBatches.status, ["planned", "brewing"])
      )
    )
    .get();

  const quantityAllocated = allocatedResult?.total ?? 0;
  const quantityAvailable = quantityOnHand - quantityAllocated;

  // Real quantity on order from active purchase orders
  const onOrderResult = db
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
        eq(purchaseOrderLines.inventoryItemId, id),
        inArray(purchaseOrders.status, [
          "sent",
          "acknowledged",
          "partially_received",
        ])
      )
    )
    .get();

  const quantityOnOrder = onOrderResult?.total ?? 0;
  const quantityProjected = quantityAvailable + quantityOnOrder;

  return {
    quantityOnHand,
    quantityAllocated,
    quantityAvailable,
    quantityOnOrder,
    quantityProjected,
  };
}

// ── Get position for all items ───────────────────────

export function getPositionAll() {
  const items = db
    .select()
    .from(inventoryItems)
    .where(eq(inventoryItems.archived, false))
    .orderBy(inventoryItems.name)
    .all();

  return items.map((item) => ({
    ...item,
    ...getPosition(item.id),
  }));
}

// ── Create ───────────────────────────────────────────

export function create(data: {
  name: string;
  sku?: string | null;
  category: string;
  subcategory?: string | null;
  unit: string;
  unitCost?: number;
  reorderPoint?: number | null;
  reorderQty?: number | null;
  minimumOrderQty?: number | null;
  isGlutenFree?: boolean;
  countryOfOrigin?: string | null;
  notes?: string | null;
}) {
  const now = new Date().toISOString();
  const id = uuid();

  db.insert(inventoryItems)
    .values({
      id,
      name: data.name,
      sku: data.sku ?? null,
      category: data.category as
        | "grain"
        | "hop"
        | "yeast"
        | "adjunct"
        | "water_chemistry"
        | "packaging"
        | "cleaning"
        | "other",
      subcategory: data.subcategory ?? null,
      unit: data.unit as "kg" | "g" | "ml" | "l" | "each",
      unitCost: data.unitCost ?? 0,
      reorderPoint: data.reorderPoint ?? null,
      reorderQty: data.reorderQty ?? null,
      minimumOrderQty: data.minimumOrderQty ?? null,
      isGlutenFree: data.isGlutenFree ?? true,
      countryOfOrigin: data.countryOfOrigin ?? null,
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
    sku: string | null;
    category: string;
    subcategory: string | null;
    unit: string;
    unitCost: number;
    reorderPoint: number | null;
    reorderQty: number | null;
    minimumOrderQty: number | null;
    isGlutenFree: boolean;
    countryOfOrigin: string | null;
    notes: string | null;
    archived: boolean;
  }>
) {
  const existing = get(id);
  if (!existing) throw new Error(`Inventory item ${id} not found`);

  db.update(inventoryItems)
    .set({
      ...(data as Record<string, unknown>),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(inventoryItems.id, id))
    .run();

  return get(id)!;
}

// ── Lots ─────────────────────────────────────────────

export function getLots(itemId: string) {
  return db
    .select()
    .from(inventoryLots)
    .where(eq(inventoryLots.inventoryItemId, itemId))
    .orderBy(inventoryLots.receivedDate)
    .all();
}

export function createLot(data: {
  inventoryItemId: string;
  lotNumber: string;
  quantityOnHand: number;
  unit: string;
  unitCost: number;
  receivedDate: string;
  expiryDate?: string | null;
  location?: string | null;
  notes?: string | null;
  performedBy?: string | null;
}) {
  return db.transaction((tx) => {
    const now = new Date().toISOString();
    const lotId = uuid();

    tx.insert(inventoryLots)
      .values({
        id: lotId,
        inventoryItemId: data.inventoryItemId,
        lotNumber: data.lotNumber,
        quantityOnHand: data.quantityOnHand,
        unit: data.unit as "kg" | "g" | "ml" | "l" | "each",
        unitCost: data.unitCost,
        receivedDate: data.receivedDate,
        expiryDate: data.expiryDate ?? null,
        location: data.location ?? null,
        notes: data.notes ?? null,
        createdAt: now,
      })
      .run();

    // Create a "received" stock movement
    const movementId = uuid();
    tx.insert(stockMovements)
      .values({
        id: movementId,
        inventoryLotId: lotId,
        movementType: "received",
        quantity: data.quantityOnHand,
        referenceType: null,
        referenceId: null,
        reason: "Initial lot receipt",
        performedBy: data.performedBy ?? null,
        createdAt: now,
      })
      .run();

    return tx
      .select()
      .from(inventoryLots)
      .where(eq(inventoryLots.id, lotId))
      .get()!;
  });
}

// ── Movements ────────────────────────────────────────

export function recordMovement(
  data: {
    inventoryLotId: string;
    movementType: string;
    quantity: number;
    referenceType?: string | null;
    referenceId?: string | null;
    reason?: string | null;
    performedBy?: string | null;
  },
  tx?: DbTransaction
) {
  function execute(d: DbTransaction) {
    const now = new Date().toISOString();
    const id = uuid();

    d.insert(stockMovements)
      .values({
        id,
        inventoryLotId: data.inventoryLotId,
        movementType: data.movementType as
          | "received"
          | "consumed"
          | "adjusted"
          | "transferred"
          | "returned"
          | "written_off",
        quantity: data.quantity,
        referenceType: data.referenceType ?? null,
        referenceId: data.referenceId ?? null,
        reason: data.reason ?? null,
        performedBy: data.performedBy ?? null,
        createdAt: now,
      })
      .run();

    // Update lot quantity: positive quantity = stock in, negative = stock out
    const lot = d
      .select()
      .from(inventoryLots)
      .where(eq(inventoryLots.id, data.inventoryLotId))
      .get();

    if (lot) {
      const newQty = lot.quantityOnHand + data.quantity;
      if (newQty < 0) {
        throw new Error(
          `Insufficient stock: lot has ${lot.quantityOnHand} on hand, cannot reduce by ${Math.abs(data.quantity)}`
        );
      }
      d.update(inventoryLots)
        .set({
          quantityOnHand: newQty,
        })
        .where(eq(inventoryLots.id, data.inventoryLotId))
        .run();
    }

    return d
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.id, id))
      .get()!;
  }

  if (tx) return execute(tx);
  return db.transaction((t) => execute(t));
}

export function getMovements(itemId?: string) {
  if (itemId) {
    return db
      .select({
        id: stockMovements.id,
        inventoryLotId: stockMovements.inventoryLotId,
        movementType: stockMovements.movementType,
        quantity: stockMovements.quantity,
        referenceType: stockMovements.referenceType,
        referenceId: stockMovements.referenceId,
        reason: stockMovements.reason,
        performedBy: stockMovements.performedBy,
        createdAt: stockMovements.createdAt,
      })
      .from(stockMovements)
      .innerJoin(
        inventoryLots,
        eq(stockMovements.inventoryLotId, inventoryLots.id)
      )
      .where(eq(inventoryLots.inventoryItemId, itemId))
      .orderBy(sql`${stockMovements.createdAt} desc`)
      .all();
  }

  return db
    .select()
    .from(stockMovements)
    .orderBy(sql`${stockMovements.createdAt} desc`)
    .all();
}
