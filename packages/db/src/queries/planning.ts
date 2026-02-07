import { eq, and, sql, inArray, desc } from "drizzle-orm";
import { db } from "../client";
import {
  brewBatches,
  recipes,
  recipeIngredients,
  inventoryItems,
  inventoryLots,
  vessels,
} from "../schema/index";
import type { MaterialRequirement } from "@brewplan/shared";

// ── Materials Requirements ───────────────────────────
// For all planned batches, calculate ingredient needs vs stock position

export function getMaterialsRequirements(): MaterialRequirement[] {
  // Get all ingredients needed by planned batches, scaled by batch size ratio
  const needed = db
    .select({
      inventoryItemId: recipeIngredients.inventoryItemId,
      inventoryItemName: inventoryItems.name,
      unit: recipeIngredients.unit,
      quantityNeeded:
        sql<number>`sum(${recipeIngredients.quantity} * (${brewBatches.batchSizeLitres} / ${recipes.batchSizeLitres}))`,
    })
    .from(brewBatches)
    .innerJoin(recipes, eq(brewBatches.recipeId, recipes.id))
    .innerJoin(recipeIngredients, eq(recipeIngredients.recipeId, recipes.id))
    .innerJoin(
      inventoryItems,
      eq(recipeIngredients.inventoryItemId, inventoryItems.id)
    )
    .where(eq(brewBatches.status, "planned"))
    .groupBy(recipeIngredients.inventoryItemId)
    .all();

  return needed.map((row) => {
    // Calculate on-hand from lots
    const onHandResult = db
      .select({
        total: sql<number>`coalesce(sum(${inventoryLots.quantityOnHand}), 0)`,
      })
      .from(inventoryLots)
      .where(eq(inventoryLots.inventoryItemId, row.inventoryItemId))
      .get();

    const quantityOnHand = onHandResult?.total ?? 0;

    // Allocated includes both planned AND brewing batches
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
          eq(recipeIngredients.inventoryItemId, row.inventoryItemId),
          inArray(brewBatches.status, ["planned", "brewing"])
        )
      )
      .get();

    const quantityAllocated = allocatedResult?.total ?? 0;
    const quantityAvailable = quantityOnHand - quantityAllocated;
    const quantityOnOrder = 0; // Phase 1: no purchase orders
    const shortfall = Math.max(0, row.quantityNeeded - quantityAvailable - quantityOnOrder);

    return {
      inventoryItemId: row.inventoryItemId,
      inventoryItemName: row.inventoryItemName,
      unit: row.unit as "kg" | "g" | "ml" | "l" | "each",
      quantityNeeded: row.quantityNeeded,
      quantityOnHand,
      quantityAllocated,
      quantityAvailable,
      quantityOnOrder,
      shortfall,
    };
  });
}

// ── Brew Schedule ────────────────────────────────────
// Planned and in-progress batches with estimated dates and vessel info

export function getBrewSchedule() {
  return db
    .select({
      id: brewBatches.id,
      batchNumber: brewBatches.batchNumber,
      recipeId: brewBatches.recipeId,
      recipeName: recipes.name,
      recipeStyle: recipes.style,
      status: brewBatches.status,
      plannedDate: brewBatches.plannedDate,
      brewDate: brewBatches.brewDate,
      estimatedReadyDate: brewBatches.estimatedReadyDate,
      batchSizeLitres: brewBatches.batchSizeLitres,
      brewer: brewBatches.brewer,
      vesselId: brewBatches.vesselId,
      vesselName: vessels.name,
      vesselType: vessels.vesselType,
      vesselCapacityLitres: vessels.capacityLitres,
    })
    .from(brewBatches)
    .innerJoin(recipes, eq(brewBatches.recipeId, recipes.id))
    .leftJoin(vessels, eq(brewBatches.vesselId, vessels.id))
    .where(
      inArray(brewBatches.status, [
        "planned",
        "brewing",
        "fermenting",
        "conditioning",
        "ready_to_package",
      ])
    )
    .orderBy(brewBatches.plannedDate, brewBatches.createdAt)
    .all();
}
