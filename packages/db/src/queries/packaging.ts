import { eq, sql } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { db, type DbTransaction } from "../client";
import {
  packagingRuns,
  finishedGoodsStock,
  brewBatches,
  recipes,
} from "../schema/index";

// ── Packaging Runs ──────────────────────────────────

export function listByBatch(batchId: string, tx?: DbTransaction) {
  const d = tx ?? db;
  return d
    .select()
    .from(packagingRuns)
    .where(eq(packagingRuns.brewBatchId, batchId))
    .orderBy(packagingRuns.createdAt)
    .all();
}

export function get(id: string) {
  return (
    db.select().from(packagingRuns).where(eq(packagingRuns.id, id)).get() ??
    null
  );
}

export function create(data: {
  brewBatchId: string;
  packagingDate: string;
  format: string;
  formatCustom?: string | null;
  quantityUnits: number;
  volumeLitres: number;
  bestBeforeDate?: string | null;
  notes?: string | null;
}) {
  const now = new Date().toISOString();
  const id = uuid();

  db.insert(packagingRuns)
    .values({
      id,
      brewBatchId: data.brewBatchId,
      packagingDate: data.packagingDate,
      format: data.format as
        | "keg_50l"
        | "keg_30l"
        | "keg_20l"
        | "can_375ml"
        | "can_355ml"
        | "bottle_330ml"
        | "bottle_500ml"
        | "other",
      formatCustom: data.formatCustom ?? null,
      quantityUnits: data.quantityUnits,
      volumeLitres: data.volumeLitres,
      bestBeforeDate: data.bestBeforeDate ?? null,
      notes: data.notes ?? null,
      createdAt: now,
    })
    .run();

  return get(id)!;
}

// ── Finished Goods Stock ────────────────────────────

export function listFinishedGoods(filters?: {
  recipeId?: string;
  format?: string;
}) {
  let query = db
    .select({
      id: finishedGoodsStock.id,
      packagingRunId: finishedGoodsStock.packagingRunId,
      brewBatchId: finishedGoodsStock.brewBatchId,
      recipeId: finishedGoodsStock.recipeId,
      productName: finishedGoodsStock.productName,
      format: finishedGoodsStock.format,
      quantityOnHand: finishedGoodsStock.quantityOnHand,
      quantityReserved: finishedGoodsStock.quantityReserved,
      quantityAvailable:
        sql<number>`${finishedGoodsStock.quantityOnHand} - ${finishedGoodsStock.quantityReserved}`,
      unitPrice: finishedGoodsStock.unitPrice,
      bestBeforeDate: finishedGoodsStock.bestBeforeDate,
      location: finishedGoodsStock.location,
      createdAt: finishedGoodsStock.createdAt,
      updatedAt: finishedGoodsStock.updatedAt,
      recipeName: recipes.name,
      batchNumber: brewBatches.batchNumber,
    })
    .from(finishedGoodsStock)
    .innerJoin(recipes, eq(finishedGoodsStock.recipeId, recipes.id))
    .innerJoin(
      brewBatches,
      eq(finishedGoodsStock.brewBatchId, brewBatches.id)
    );

  if (filters?.recipeId) {
    return query
      .where(eq(finishedGoodsStock.recipeId, filters.recipeId))
      .orderBy(finishedGoodsStock.createdAt)
      .all();
  }

  return query.orderBy(finishedGoodsStock.createdAt).all();
}

export function getFinishedGoods(id: string) {
  const result = db
    .select({
      id: finishedGoodsStock.id,
      packagingRunId: finishedGoodsStock.packagingRunId,
      brewBatchId: finishedGoodsStock.brewBatchId,
      recipeId: finishedGoodsStock.recipeId,
      productName: finishedGoodsStock.productName,
      format: finishedGoodsStock.format,
      quantityOnHand: finishedGoodsStock.quantityOnHand,
      quantityReserved: finishedGoodsStock.quantityReserved,
      quantityAvailable:
        sql<number>`${finishedGoodsStock.quantityOnHand} - ${finishedGoodsStock.quantityReserved}`,
      unitPrice: finishedGoodsStock.unitPrice,
      bestBeforeDate: finishedGoodsStock.bestBeforeDate,
      location: finishedGoodsStock.location,
      createdAt: finishedGoodsStock.createdAt,
      updatedAt: finishedGoodsStock.updatedAt,
      recipeName: recipes.name,
      batchNumber: brewBatches.batchNumber,
    })
    .from(finishedGoodsStock)
    .innerJoin(recipes, eq(finishedGoodsStock.recipeId, recipes.id))
    .innerJoin(
      brewBatches,
      eq(finishedGoodsStock.brewBatchId, brewBatches.id)
    )
    .where(eq(finishedGoodsStock.id, id))
    .get();

  return result ?? null;
}

export function createFinishedGoods(
  data: {
    packagingRunId: string;
    brewBatchId: string;
    recipeId: string;
    productName: string;
    format: string;
    quantityOnHand: number;
    bestBeforeDate?: string | null;
  },
  tx?: DbTransaction
) {
  const d = tx ?? db;
  const now = new Date().toISOString();
  const id = uuid();

  d.insert(finishedGoodsStock)
    .values({
      id,
      packagingRunId: data.packagingRunId,
      brewBatchId: data.brewBatchId,
      recipeId: data.recipeId,
      productName: data.productName,
      format: data.format as
        | "keg_50l"
        | "keg_30l"
        | "keg_20l"
        | "can_375ml"
        | "can_355ml"
        | "bottle_330ml"
        | "bottle_500ml"
        | "other",
      quantityOnHand: data.quantityOnHand,
      quantityReserved: 0,
      unitPrice: null,
      bestBeforeDate: data.bestBeforeDate ?? null,
      location: null,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return getFinishedGoods(id)!;
}

export function updateFinishedGoods(
  id: string,
  data: Partial<{
    unitPrice: number | null;
    location: string | null;
  }>
) {
  const existing = getFinishedGoods(id);
  if (!existing) throw new Error(`Finished goods ${id} not found`);

  db.update(finishedGoodsStock)
    .set({
      ...(data as Record<string, unknown>),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(finishedGoodsStock.id, id))
    .run();

  return getFinishedGoods(id)!;
}

// ── Format Labels ───────────────────────────────────

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

export function getFormatLabel(format: string): string {
  return FORMAT_LABELS[format] ?? format;
}
