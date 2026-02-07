import { eq, and, sql, inArray, desc } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { db } from "../client";
import {
  brewBatches,
  brewIngredientConsumptions,
  fermentationLogEntries,
  recipes,
  inventoryLots,
  inventoryItems,
  vessels,
} from "../schema/index";
import { BATCH_TRANSITIONS, type BatchStatus } from "@brewplan/shared";

// ── List ─────────────────────────────────────────────

export function list(filters?: { status?: BatchStatus }) {
  const baseQuery = db
    .select({
      id: brewBatches.id,
      batchNumber: brewBatches.batchNumber,
      recipeId: brewBatches.recipeId,
      status: brewBatches.status,
      plannedDate: brewBatches.plannedDate,
      brewDate: brewBatches.brewDate,
      estimatedReadyDate: brewBatches.estimatedReadyDate,
      brewer: brewBatches.brewer,
      batchSizeLitres: brewBatches.batchSizeLitres,
      actualVolumeLitres: brewBatches.actualVolumeLitres,
      actualOg: brewBatches.actualOg,
      actualFg: brewBatches.actualFg,
      actualAbv: brewBatches.actualAbv,
      actualIbu: brewBatches.actualIbu,
      vesselId: brewBatches.vesselId,
      notes: brewBatches.notes,
      completedAt: brewBatches.completedAt,
      createdAt: brewBatches.createdAt,
      updatedAt: brewBatches.updatedAt,
      recipeName: recipes.name,
    })
    .from(brewBatches)
    .innerJoin(recipes, eq(brewBatches.recipeId, recipes.id));

  if (filters?.status) {
    return baseQuery
      .where(eq(brewBatches.status, filters.status))
      .orderBy(desc(brewBatches.createdAt))
      .all();
  }

  return baseQuery.orderBy(desc(brewBatches.createdAt)).all();
}

// ── Get ──────────────────────────────────────────────

export function get(id: string) {
  return (
    db.select().from(brewBatches).where(eq(brewBatches.id, id)).get() ?? null
  );
}

// ── Get with details ─────────────────────────────────

export function getWithDetails(id: string) {
  const batch = get(id);
  if (!batch) return null;

  const recipe = db
    .select()
    .from(recipes)
    .where(eq(recipes.id, batch.recipeId))
    .get();

  const consumptions = db
    .select({
      id: brewIngredientConsumptions.id,
      brewBatchId: brewIngredientConsumptions.brewBatchId,
      recipeIngredientId: brewIngredientConsumptions.recipeIngredientId,
      inventoryLotId: brewIngredientConsumptions.inventoryLotId,
      plannedQuantity: brewIngredientConsumptions.plannedQuantity,
      actualQuantity: brewIngredientConsumptions.actualQuantity,
      unit: brewIngredientConsumptions.unit,
      usageStage: brewIngredientConsumptions.usageStage,
      notes: brewIngredientConsumptions.notes,
      createdAt: brewIngredientConsumptions.createdAt,
      lotNumber: inventoryLots.lotNumber,
      inventoryItemName: inventoryItems.name,
    })
    .from(brewIngredientConsumptions)
    .innerJoin(
      inventoryLots,
      eq(brewIngredientConsumptions.inventoryLotId, inventoryLots.id)
    )
    .innerJoin(
      inventoryItems,
      eq(inventoryLots.inventoryItemId, inventoryItems.id)
    )
    .where(eq(brewIngredientConsumptions.brewBatchId, id))
    .all();

  const fermentationLog = db
    .select()
    .from(fermentationLogEntries)
    .where(eq(fermentationLogEntries.brewBatchId, id))
    .orderBy(fermentationLogEntries.loggedAt)
    .all();

  let vessel = null;
  if (batch.vesselId) {
    vessel =
      db
        .select()
        .from(vessels)
        .where(eq(vessels.id, batch.vesselId))
        .get() ?? null;
  }

  return {
    ...batch,
    recipe: recipe ?? null,
    consumptions,
    fermentationLog,
    vessel,
  };
}

// ── Create ───────────────────────────────────────────

function generateBatchNumber(): string {
  const year = new Date().getFullYear();
  const prefix = `BP-${year}-`;

  const countResult = db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(brewBatches)
    .where(sql`${brewBatches.batchNumber} like ${prefix + "%"}`)
    .get();

  const sequence = (countResult?.count ?? 0) + 1;
  return `${prefix}${String(sequence).padStart(3, "0")}`;
}

export function create(data: {
  recipeId: string;
  plannedDate?: string | null;
  brewer?: string | null;
  batchSizeLitres: number;
  vesselId?: string | null;
  notes?: string | null;
}) {
  const now = new Date().toISOString();
  const id = uuid();
  const batchNumber = generateBatchNumber();

  // Get recipe to calculate estimated ready date
  const recipe = db
    .select()
    .from(recipes)
    .where(eq(recipes.id, data.recipeId))
    .get();

  let estimatedReadyDate: string | null = null;
  if (recipe) {
    const baseDate = data.plannedDate
      ? new Date(data.plannedDate)
      : new Date();
    baseDate.setDate(baseDate.getDate() + recipe.estimatedTotalDays);
    estimatedReadyDate = baseDate.toISOString().split("T")[0];
  }

  db.insert(brewBatches)
    .values({
      id,
      batchNumber,
      recipeId: data.recipeId,
      status: "planned",
      plannedDate: data.plannedDate ?? null,
      brewDate: null,
      estimatedReadyDate,
      brewer: data.brewer ?? null,
      batchSizeLitres: data.batchSizeLitres,
      actualVolumeLitres: null,
      actualOg: null,
      actualFg: null,
      actualAbv: null,
      actualIbu: null,
      vesselId: data.vesselId ?? null,
      notes: data.notes ?? null,
      completedAt: null,
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
    plannedDate: string | null;
    brewer: string | null;
    batchSizeLitres: number;
    actualVolumeLitres: number | null;
    actualOg: number | null;
    actualFg: number | null;
    actualAbv: number | null;
    actualIbu: number | null;
    vesselId: string | null;
    notes: string | null;
  }>
) {
  const existing = get(id);
  if (!existing) throw new Error(`Brew batch ${id} not found`);

  db.update(brewBatches)
    .set({
      ...(data as Record<string, unknown>),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(brewBatches.id, id))
    .run();

  return get(id)!;
}

// ── Transition ───────────────────────────────────────

export function transition(id: string, toStatus: BatchStatus) {
  const batch = get(id);
  if (!batch) throw new Error(`Brew batch ${id} not found`);

  const currentStatus = batch.status as BatchStatus;
  const allowedTransitions = BATCH_TRANSITIONS[currentStatus];

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

  // Side effects based on transition
  if (currentStatus === "planned" && toStatus === "brewing") {
    // Set brew_date to today, vessel to in_use
    updates.brewDate = new Date().toISOString().split("T")[0];

    if (batch.vesselId) {
      db.update(vessels)
        .set({
          status: "in_use",
          currentBatchId: id,
          updatedAt: now,
        })
        .where(eq(vessels.id, batch.vesselId))
        .run();
    }
  }

  if (toStatus === "ready_to_package") {
    // Calculate ABV from OG and FG if both are present
    if (batch.actualOg && batch.actualFg) {
      updates.actualAbv =
        (batch.actualOg - batch.actualFg) * 131.25;
    }
  }

  if (toStatus === "completed") {
    updates.completedAt = now;
  }

  // Release vessel on dump or completion-related transitions
  if (toStatus === "dumped" || toStatus === "cancelled") {
    if (batch.vesselId) {
      db.update(vessels)
        .set({
          status: "available",
          currentBatchId: null,
          updatedAt: now,
        })
        .where(eq(vessels.id, batch.vesselId))
        .run();
    }
  }

  db.update(brewBatches).set(updates).where(eq(brewBatches.id, id)).run();

  return get(id)!;
}

// ── Consumption ──────────────────────────────────────

export function recordConsumption(
  batchId: string,
  data: {
    recipeIngredientId?: string | null;
    inventoryLotId: string;
    plannedQuantity: number;
    actualQuantity: number;
    unit: string;
    usageStage: string;
    notes?: string | null;
  }
) {
  const now = new Date().toISOString();
  const id = uuid();

  db.insert(brewIngredientConsumptions)
    .values({
      id,
      brewBatchId: batchId,
      recipeIngredientId: data.recipeIngredientId ?? null,
      inventoryLotId: data.inventoryLotId,
      plannedQuantity: data.plannedQuantity,
      actualQuantity: data.actualQuantity,
      unit: data.unit as "kg" | "g" | "ml" | "l" | "each",
      usageStage: data.usageStage as
        | "mash"
        | "boil"
        | "whirlpool"
        | "ferment"
        | "dry_hop"
        | "package"
        | "other",
      notes: data.notes ?? null,
      createdAt: now,
    })
    .run();

  return db
    .select()
    .from(brewIngredientConsumptions)
    .where(eq(brewIngredientConsumptions.id, id))
    .get()!;
}

export function getConsumptions(batchId: string) {
  return db
    .select()
    .from(brewIngredientConsumptions)
    .where(eq(brewIngredientConsumptions.brewBatchId, batchId))
    .all();
}

// ── Fermentation log ─────────────────────────────────

export function addFermentationEntry(
  batchId: string,
  data: {
    gravity?: number | null;
    temperatureCelsius?: number | null;
    ph?: number | null;
    notes?: string | null;
    loggedBy?: string | null;
  }
) {
  const now = new Date().toISOString();
  const id = uuid();

  db.insert(fermentationLogEntries)
    .values({
      id,
      brewBatchId: batchId,
      loggedAt: now,
      gravity: data.gravity ?? null,
      temperatureCelsius: data.temperatureCelsius ?? null,
      ph: data.ph ?? null,
      notes: data.notes ?? null,
      loggedBy: data.loggedBy ?? null,
    })
    .run();

  // Sync gravity readings to batch: first reading → OG, latest → FG
  if (data.gravity != null) {
    const batch = get(batchId);
    if (batch) {
      const updates: Record<string, unknown> = {
        actualFg: data.gravity,
        updatedAt: now,
      };
      if (batch.actualOg == null) {
        updates.actualOg = data.gravity;
      }
      db.update(brewBatches)
        .set(updates)
        .where(eq(brewBatches.id, batchId))
        .run();
    }
  }

  return db
    .select()
    .from(fermentationLogEntries)
    .where(eq(fermentationLogEntries.id, id))
    .get()!;
}

export function getFermentationLog(batchId: string) {
  return db
    .select()
    .from(fermentationLogEntries)
    .where(eq(fermentationLogEntries.brewBatchId, batchId))
    .orderBy(fermentationLogEntries.loggedAt)
    .all();
}

