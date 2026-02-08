import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { suppliers } from "./suppliers";

export const inventoryItems = sqliteTable("inventory_items", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  sku: text("sku"),
  supplierId: text("supplier_id").references(() => suppliers.id),
  category: text("category", {
    enum: [
      "grain",
      "hop",
      "yeast",
      "adjunct",
      "water_chemistry",
      "packaging",
      "cleaning",
      "other",
    ],
  }).notNull(),
  subcategory: text("subcategory"),
  unit: text("unit", { enum: ["kg", "g", "ml", "l", "each"] }).notNull(),
  unitCost: real("unit_cost").notNull().default(0),
  reorderPoint: real("reorder_point"),
  reorderQty: real("reorder_qty"),
  minimumOrderQty: real("minimum_order_qty"),
  allergens: text("allergens"), // JSON array
  isGlutenFree: integer("is_gluten_free", { mode: "boolean" })
    .notNull()
    .default(true),
  countryOfOrigin: text("country_of_origin"),
  notes: text("notes"),
  archived: integer("archived", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const inventoryLots = sqliteTable("inventory_lots", {
  id: text("id").primaryKey(),
  inventoryItemId: text("inventory_item_id")
    .notNull()
    .references(() => inventoryItems.id),
  lotNumber: text("lot_number").notNull(),
  quantityOnHand: real("quantity_on_hand").notNull(),
  unit: text("unit", { enum: ["kg", "g", "ml", "l", "each"] }).notNull(),
  unitCost: real("unit_cost").notNull(),
  receivedDate: text("received_date").notNull(),
  expiryDate: text("expiry_date"),
  purchaseOrderId: text("purchase_order_id"),
  location: text("location"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

export const stockMovements = sqliteTable("stock_movements", {
  id: text("id").primaryKey(),
  inventoryLotId: text("inventory_lot_id")
    .notNull()
    .references(() => inventoryLots.id),
  movementType: text("movement_type", {
    enum: [
      "received",
      "consumed",
      "adjusted",
      "transferred",
      "returned",
      "written_off",
    ],
  }).notNull(),
  quantity: real("quantity").notNull(),
  referenceType: text("reference_type"),
  referenceId: text("reference_id"),
  reason: text("reason"),
  performedBy: text("performed_by"),
  createdAt: text("created_at").notNull(),
});
