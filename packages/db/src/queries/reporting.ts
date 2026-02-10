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

// ── Aggregate Queries ───────────────────────────────

export function getTopProducts(limit = 10) {
  return db
    .select({
      recipeId: orderLines.recipeId,
      recipeName: recipes.name,
      format: orderLines.format,
      totalQuantity: sql<number>`sum(${orderLines.quantity})`,
      totalRevenue: sql<number>`sum(${orderLines.lineTotal})`,
    })
    .from(orderLines)
    .innerJoin(recipes, eq(orderLines.recipeId, recipes.id))
    .innerJoin(orders, eq(orderLines.orderId, orders.id))
    .where(
      inArray(orders.status, [
        "confirmed",
        "picking",
        "dispatched",
        "delivered",
        "invoiced",
        "paid",
      ])
    )
    .groupBy(orderLines.recipeId, orderLines.format)
    .orderBy(sql`sum(${orderLines.lineTotal}) desc`)
    .limit(limit)
    .all();
}

export function getTopCustomers(limit = 10) {
  return db
    .select({
      customerId: orders.customerId,
      customerName: customers.name,
      totalRevenue: sql<number>`sum(${orders.total})`,
      orderCount: sql<number>`count(*)`,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .where(
      inArray(orders.status, [
        "confirmed",
        "picking",
        "dispatched",
        "delivered",
        "invoiced",
        "paid",
      ])
    )
    .groupBy(orders.customerId)
    .orderBy(sql`sum(${orders.total}) desc`)
    .limit(limit)
    .all();
}

export function getOrdersPendingDelivery() {
  return db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      customerName: customers.name,
      deliveryDate: orders.deliveryDate,
      total: orders.total,
      status: orders.status,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .where(
      inArray(orders.status, ["confirmed", "picking", "dispatched"])
    )
    .orderBy(orders.deliveryDate)
    .all();
}

export function getRevenueByPeriod(
  startDate: string,
  endDate: string,
  groupBy: "day" | "week" | "month" = "month"
) {
  const dateExpr =
    groupBy === "day"
      ? sql<string>`date(${orders.orderDate})`
      : groupBy === "week"
      ? sql<string>`date(${orders.orderDate}, 'weekday 0', '-6 days')`
      : sql<string>`substr(${orders.orderDate}, 1, 7)`;

  return db
    .select({
      period: dateExpr.as("period"),
      totalRevenue: sql<number>`sum(${orders.total})`,
      orderCount: sql<number>`count(*)`,
    })
    .from(orders)
    .where(
      and(
        inArray(orders.status, [
          "confirmed",
          "picking",
          "dispatched",
          "delivered",
          "invoiced",
          "paid",
        ]),
        gte(orders.orderDate, startDate),
        lte(orders.orderDate, endDate)
      )
    )
    .groupBy(sql`period`)
    .orderBy(sql`period`)
    .all();
}
