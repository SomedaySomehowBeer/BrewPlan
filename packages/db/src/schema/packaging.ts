import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { brewBatches } from "./brewing";
import { recipes } from "./recipes";

export const packagingRuns = sqliteTable("packaging_runs", {
  id: text("id").primaryKey(),
  brewBatchId: text("brew_batch_id")
    .notNull()
    .references(() => brewBatches.id),
  packagingDate: text("packaging_date").notNull(),
  format: text("format", {
    enum: [
      "keg_50l",
      "keg_30l",
      "keg_20l",
      "can_375ml",
      "can_355ml",
      "bottle_330ml",
      "bottle_500ml",
      "other",
    ],
  }).notNull(),
  formatCustom: text("format_custom"),
  quantityUnits: integer("quantity_units").notNull(),
  volumeLitres: real("volume_litres").notNull(),
  bestBeforeDate: text("best_before_date"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

export const finishedGoodsStock = sqliteTable("finished_goods_stock", {
  id: text("id").primaryKey(),
  packagingRunId: text("packaging_run_id")
    .notNull()
    .references(() => packagingRuns.id),
  brewBatchId: text("brew_batch_id")
    .notNull()
    .references(() => brewBatches.id),
  recipeId: text("recipe_id")
    .notNull()
    .references(() => recipes.id),
  productName: text("product_name").notNull(),
  format: text("format", {
    enum: [
      "keg_50l",
      "keg_30l",
      "keg_20l",
      "can_375ml",
      "can_355ml",
      "bottle_330ml",
      "bottle_500ml",
      "other",
    ],
  }).notNull(),
  quantityOnHand: integer("quantity_on_hand").notNull().default(0),
  quantityReserved: integer("quantity_reserved").notNull().default(0),
  unitPrice: real("unit_price"),
  bestBeforeDate: text("best_before_date"),
  location: text("location"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
