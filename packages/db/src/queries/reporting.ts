import { sql, eq, and, gte, lte, inArray, desc } from "drizzle-orm";
import { db } from "../client";
import {
  brewBatches,
  recipes,
  vessels,
  inventoryItems,
  inventoryLots,
  orders,
  orderLines,
  customers,
} from "../schema/index";

// ── Production Summary ──────────────────────────────

export function getProductionSummary(startDate: string, endDate: string) {
  const completedBatches = db
    .select({
      id: brewBatches.id,
      batchSizeLitres: brewBatches.batchSizeLitres,
      actualVolumeLitres: brewBatches.actualVolumeLitres,
      vesselId: brewBatches.vesselId,
    })
    .from(brewBatches)
    .where(
      and(
        inArray(brewBatches.status, ["completed", "packaged"]),
        gte(brewBatches.completedAt, startDate),
        lte(brewBatches.completedAt, endDate)
      )
    )
    .all();

  const inProgressResult = db
    .select({ count: sql<number>`count(*)` })
    .from(brewBatches)
    .where(
      inArray(brewBatches.status, [
        "planned",
        "brewing",
        "fermenting",
        "conditioning",
        "ready_to_package",
      ])
    )
    .get();

  const totalVolume = completedBatches.reduce(
    (sum, b) => sum + (b.actualVolumeLitres ?? b.batchSizeLitres),
    0
  );

  const avgBatchSize =
    completedBatches.length > 0
      ? totalVolume / completedBatches.length
      : 0;

  // Vessel utilisation
  const vesselCounts = new Map<string, number>();
  for (const b of completedBatches) {
    if (b.vesselId) {
      vesselCounts.set(b.vesselId, (vesselCounts.get(b.vesselId) ?? 0) + 1);
    }
  }

  const allVessels = db.select().from(vessels).all();
  const vesselUtilisation = allVessels.map((v) => ({
    vesselId: v.id,
    vesselName: v.name,
    batchCount: vesselCounts.get(v.id) ?? 0,
  }));

  return {
    batchesCompleted: completedBatches.length,
    totalVolumeLitres: Math.round(totalVolume * 100) / 100,
    batchesInProgress: inProgressResult?.count ?? 0,
    avgBatchSizeLitres: Math.round(avgBatchSize * 100) / 100,
    vesselUtilisation,
  };
}

// ── CSV Exports ─────────────────────────────────────

export function getBatchesForCsvExport() {
  return db
    .select({
      batchNumber: brewBatches.batchNumber,
      recipeName: recipes.name,
      style: recipes.style,
      status: brewBatches.status,
      plannedDate: brewBatches.plannedDate,
      brewDate: brewBatches.brewDate,
      estimatedReadyDate: brewBatches.estimatedReadyDate,
      batchSizeLitres: brewBatches.batchSizeLitres,
      actualVolumeLitres: brewBatches.actualVolumeLitres,
      actualOg: brewBatches.actualOg,
      actualFg: brewBatches.actualFg,
      actualAbv: brewBatches.actualAbv,
      brewer: brewBatches.brewer,
      completedAt: brewBatches.completedAt,
    })
    .from(brewBatches)
    .innerJoin(recipes, eq(brewBatches.recipeId, recipes.id))
    .orderBy(desc(brewBatches.createdAt))
    .all();
}

export function getInventoryForCsvExport() {
  const items = db
    .select({
      name: inventoryItems.name,
      sku: inventoryItems.sku,
      category: inventoryItems.category,
      unit: inventoryItems.unit,
      unitCost: inventoryItems.unitCost,
      isGlutenFree: inventoryItems.isGlutenFree,
      reorderPoint: inventoryItems.reorderPoint,
      id: inventoryItems.id,
    })
    .from(inventoryItems)
    .where(eq(inventoryItems.archived, false))
    .all();

  return items.map((item) => {
    const lots = db
      .select({
        quantityOnHand: inventoryLots.quantityOnHand,
      })
      .from(inventoryLots)
      .where(eq(inventoryLots.inventoryItemId, item.id))
      .all();

    const totalOnHand = lots.reduce((sum, l) => sum + l.quantityOnHand, 0);

    return {
      name: item.name,
      sku: item.sku ?? "",
      category: item.category,
      unit: item.unit,
      unitCost: item.unitCost,
      isGlutenFree: item.isGlutenFree ? "Yes" : "No",
      reorderPoint: item.reorderPoint ?? "",
      totalOnHand: Math.round(totalOnHand * 100) / 100,
    };
  });
}

export function getOrdersForCsvExport() {
  return db
    .select({
      orderNumber: orders.orderNumber,
      customerName: customers.name,
      status: orders.status,
      orderDate: orders.orderDate,
      deliveryDate: orders.deliveryDate,
      channel: orders.channel,
      subtotal: orders.subtotal,
      tax: orders.tax,
      total: orders.total,
      invoiceNumber: orders.invoiceNumber,
      paidAt: orders.paidAt,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .orderBy(desc(orders.createdAt))
    .all();
}
