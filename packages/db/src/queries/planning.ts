import { eq, and, sql, inArray, desc } from "drizzle-orm";
import { db } from "../client";
import {
  brewBatches,
  recipes,
  recipeIngredients,
  inventoryItems,
  inventoryLots,
  vessels,
  purchaseOrderLines,
  purchaseOrders,
  orders,
  orderLines,
  customers,
  finishedGoodsStock,
  suppliers,
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
          eq(purchaseOrderLines.inventoryItemId, row.inventoryItemId),
          inArray(purchaseOrders.status, [
            "sent",
            "acknowledged",
            "partially_received",
          ])
        )
      )
      .get();

    const quantityOnOrder = onOrderResult?.total ?? 0;
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

// ── Demand View ─────────────────────────────────────
// Orders due by week, demand by recipe+format, unfulfillable orders

export function getDemandView(weeksAhead = 8) {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() + weeksAhead * 7);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  // Orders due in range
  const upcomingOrders = db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      customerId: orders.customerId,
      status: orders.status,
      deliveryDate: orders.deliveryDate,
      total: orders.total,
      customerName: customers.name,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .where(
      and(
        inArray(orders.status, ["confirmed", "picking"]),
        sql`${orders.deliveryDate} <= ${cutoffStr}`
      )
    )
    .orderBy(orders.deliveryDate)
    .all();

  // Demand by recipe + format
  const demand = db
    .select({
      recipeId: orderLines.recipeId,
      recipeName: recipes.name,
      format: orderLines.format,
      totalQuantity: sql<number>`sum(${orderLines.quantity})`,
    })
    .from(orderLines)
    .innerJoin(orders, eq(orderLines.orderId, orders.id))
    .innerJoin(recipes, eq(orderLines.recipeId, recipes.id))
    .where(
      and(
        inArray(orders.status, ["confirmed", "picking"]),
        sql`${orders.deliveryDate} <= ${cutoffStr}`
      )
    )
    .groupBy(orderLines.recipeId, orderLines.format)
    .all();

  // Unfulfillable: demand exceeding available FG stock
  const unfulfillable = demand.filter((d) => {
    const fgResult = db
      .select({
        available:
          sql<number>`coalesce(sum(${finishedGoodsStock.quantityOnHand} - ${finishedGoodsStock.quantityReserved}), 0)`,
      })
      .from(finishedGoodsStock)
      .where(
        and(
          eq(finishedGoodsStock.recipeId, d.recipeId),
          eq(finishedGoodsStock.format, d.format)
        )
      )
      .get();

    const available = fgResult?.available ?? 0;
    return d.totalQuantity > available;
  });

  return { upcomingOrders, demand, unfulfillable };
}

// ── Packaging Priority ──────────────────────────────
// Batches in ready_to_package ranked by order urgency

export function getPackagingPriority() {
  const readyBatches = db
    .select({
      id: brewBatches.id,
      batchNumber: brewBatches.batchNumber,
      recipeId: brewBatches.recipeId,
      recipeName: recipes.name,
      batchSizeLitres: brewBatches.batchSizeLitres,
      actualVolumeLitres: brewBatches.actualVolumeLitres,
      estimatedReadyDate: brewBatches.estimatedReadyDate,
      vesselId: brewBatches.vesselId,
      vesselName: vessels.name,
      brewDate: brewBatches.brewDate,
    })
    .from(brewBatches)
    .innerJoin(recipes, eq(brewBatches.recipeId, recipes.id))
    .leftJoin(vessels, eq(brewBatches.vesselId, vessels.id))
    .where(eq(brewBatches.status, "ready_to_package"))
    .orderBy(brewBatches.brewDate)
    .all();

  // Enrich with order demand and days in tank
  const today = new Date();
  return readyBatches.map((batch) => {
    // Days in tank since brew date
    const brewDate = batch.brewDate ? new Date(batch.brewDate) : today;
    const daysInTank = Math.floor(
      (today.getTime() - brewDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Matching order demand for this recipe
    const demandResult = db
      .select({
        totalQuantity: sql<number>`sum(${orderLines.quantity})`,
        earliestDelivery: sql<string>`min(${orders.deliveryDate})`,
      })
      .from(orderLines)
      .innerJoin(orders, eq(orderLines.orderId, orders.id))
      .where(
        and(
          eq(orderLines.recipeId, batch.recipeId),
          inArray(orders.status, ["confirmed", "picking"])
        )
      )
      .get();

    return {
      ...batch,
      daysInTank,
      orderDemand: demandResult?.totalQuantity ?? 0,
      earliestDelivery: demandResult?.earliestDelivery ?? null,
    };
  });
}

// ── Suggested Brews ─────────────────────────────────
// Recipes with demand but no planned/in-progress batches to meet it

export function getSuggestedBrews() {
  // Get demand by recipe from confirmed/picking orders
  const demandByRecipe = db
    .select({
      recipeId: orderLines.recipeId,
      recipeName: recipes.name,
      recipeStyle: recipes.style,
      totalQuantity: sql<number>`sum(${orderLines.quantity})`,
      earliestDelivery: sql<string>`min(${orders.deliveryDate})`,
    })
    .from(orderLines)
    .innerJoin(orders, eq(orderLines.orderId, orders.id))
    .innerJoin(recipes, eq(orderLines.recipeId, recipes.id))
    .where(inArray(orders.status, ["confirmed", "picking"]))
    .groupBy(orderLines.recipeId)
    .all();

  return demandByRecipe
    .map((d) => {
      // Available FG stock for this recipe
      const fgResult = db
        .select({
          available:
            sql<number>`coalesce(sum(${finishedGoodsStock.quantityOnHand} - ${finishedGoodsStock.quantityReserved}), 0)`,
        })
        .from(finishedGoodsStock)
        .where(eq(finishedGoodsStock.recipeId, d.recipeId))
        .get();

      const available = fgResult?.available ?? 0;

      // Batches planned or in-progress for this recipe
      const activeBatches = db
        .select({ id: brewBatches.id })
        .from(brewBatches)
        .where(
          and(
            eq(brewBatches.recipeId, d.recipeId),
            inArray(brewBatches.status, [
              "planned",
              "brewing",
              "fermenting",
              "conditioning",
              "ready_to_package",
            ])
          )
        )
        .all();

      const unmetDemand = d.totalQuantity - available;
      if (unmetDemand <= 0 && activeBatches.length > 0) return null;

      // Suggest a latest brew date: delivery date minus ~21 days (3 weeks for fermentation + packaging)
      let latestBrewDate: string | null = null;
      if (d.earliestDelivery) {
        const date = new Date(d.earliestDelivery);
        date.setDate(date.getDate() - 21);
        latestBrewDate = date.toISOString().split("T")[0];
      }

      return {
        recipeId: d.recipeId,
        recipeName: d.recipeName,
        recipeStyle: d.recipeStyle,
        demandQuantity: d.totalQuantity,
        availableStock: available,
        activeBatchCount: activeBatches.length,
        earliestDelivery: d.earliestDelivery,
        latestBrewDate,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

// ── Purchase Timing ─────────────────────────────────
// Shortfall items with required-by/order-by dates, grouped by supplier

export function getPurchaseTiming() {
  const materials = getMaterialsRequirements();
  const shortfallItems = materials.filter((m) => m.shortfall > 0);

  // For each shortfall item, find the earliest planned batch that needs it
  const itemsWithTiming = shortfallItems.map((item) => {
    const earliestBatch = db
      .select({
        plannedDate: brewBatches.plannedDate,
        batchNumber: brewBatches.batchNumber,
      })
      .from(brewBatches)
      .innerJoin(recipes, eq(brewBatches.recipeId, recipes.id))
      .innerJoin(recipeIngredients, eq(recipeIngredients.recipeId, recipes.id))
      .where(
        and(
          eq(recipeIngredients.inventoryItemId, item.inventoryItemId),
          eq(brewBatches.status, "planned")
        )
      )
      .orderBy(brewBatches.plannedDate)
      .limit(1)
      .get();

    // Get supplier info for this item
    const inventoryItem = db
      .select({
        supplierId: inventoryItems.supplierId,
      })
      .from(inventoryItems)
      .where(eq(inventoryItems.id, item.inventoryItemId))
      .get();

    let supplierInfo = null;
    if (inventoryItem?.supplierId) {
      supplierInfo = db
        .select()
        .from(suppliers)
        .where(eq(suppliers.id, inventoryItem.supplierId))
        .get();
    }

    const requiredBy = earliestBatch?.plannedDate ?? null;
    let orderBy: string | null = null;
    if (requiredBy && supplierInfo?.leadTimeDays) {
      const requiredDate = new Date(requiredBy);
      requiredDate.setDate(
        requiredDate.getDate() - supplierInfo.leadTimeDays - 2
      );
      orderBy = requiredDate.toISOString().split("T")[0];
    }

    return {
      ...item,
      requiredBy,
      orderBy,
      batchNumber: earliestBatch?.batchNumber ?? null,
      supplierId: supplierInfo?.id ?? null,
      supplierName: supplierInfo?.name ?? null,
      leadTimeDays: supplierInfo?.leadTimeDays ?? null,
    };
  });

  // Pending deliveries (POs in transit)
  const pendingDeliveries = db
    .select({
      id: purchaseOrders.id,
      poNumber: purchaseOrders.poNumber,
      status: purchaseOrders.status,
      expectedDeliveryDate: purchaseOrders.expectedDeliveryDate,
      supplierName: suppliers.name,
      total: purchaseOrders.total,
    })
    .from(purchaseOrders)
    .innerJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
    .where(
      inArray(purchaseOrders.status, [
        "sent",
        "acknowledged",
        "partially_received",
      ])
    )
    .orderBy(purchaseOrders.expectedDeliveryDate)
    .all();

  return { itemsWithTiming, pendingDeliveries };
}
