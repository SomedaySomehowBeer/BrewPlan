import { sqliteTable, text, integer, real, check } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { suppliers } from "./suppliers";
import { inventoryItems } from "./inventory";

export const purchaseOrders = sqliteTable("purchase_orders", {
  id: text("id").primaryKey(),
  poNumber: text("po_number").notNull().unique(),
  supplierId: text("supplier_id")
    .notNull()
    .references(() => suppliers.id),
  status: text("status", {
    enum: [
      "draft",
      "sent",
      "acknowledged",
      "partially_received",
      "received",
      "cancelled",
    ],
  })
    .notNull()
    .default("draft"),
  orderDate: text("order_date"),
  expectedDeliveryDate: text("expected_delivery_date"),
  subtotal: real("subtotal").notNull().default(0),
  tax: real("tax").notNull().default(0),
  total: real("total").notNull().default(0),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const purchaseOrderLines = sqliteTable("purchase_order_lines", {
  id: text("id").primaryKey(),
  purchaseOrderId: text("purchase_order_id")
    .notNull()
    .references(() => purchaseOrders.id, { onDelete: "cascade" }),
  inventoryItemId: text("inventory_item_id")
    .notNull()
    .references(() => inventoryItems.id),
  quantityOrdered: real("quantity_ordered").notNull(),
  quantityReceived: real("quantity_received").notNull().default(0),
  unit: text("unit", { enum: ["kg", "g", "ml", "l", "each"] }).notNull(),
  unitCost: real("unit_cost").notNull(),
  lineTotal: real("line_total").notNull().default(0),
  notes: text("notes"),
}, (table) => [
  check("pol_qty_received_nonneg", sql`${table.quantityReceived} >= 0`),
  check("pol_qty_ordered_nonneg", sql`${table.quantityOrdered} > 0`),
  check("pol_qty_received_lte_ordered", sql`${table.quantityReceived} <= ${table.quantityOrdered}`),
]);
