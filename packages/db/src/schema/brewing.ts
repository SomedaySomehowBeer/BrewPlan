import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { recipes } from "./recipes";
import { vessels } from "./vessels";

export const brewBatches = sqliteTable("brew_batches", {
  id: text("id").primaryKey(),
  batchNumber: text("batch_number").notNull().unique(),
  recipeId: text("recipe_id")
    .notNull()
    .references(() => recipes.id),
  status: text("status", {
    enum: [
      "planned",
      "brewing",
      "fermenting",
      "conditioning",
      "ready_to_package",
      "packaged",
      "completed",
      "cancelled",
      "dumped",
    ],
  })
    .notNull()
    .default("planned"),
  plannedDate: text("planned_date"),
  brewDate: text("brew_date"),
  estimatedReadyDate: text("estimated_ready_date"),
  brewer: text("brewer"),
  batchSizeLitres: real("batch_size_litres").notNull(),
  actualVolumeLitres: real("actual_volume_litres"),
  actualOg: real("actual_og"),
  actualFg: real("actual_fg"),
  actualAbv: real("actual_abv"),
  actualIbu: real("actual_ibu"),
  vesselId: text("vessel_id").references(() => vessels.id),
  notes: text("notes"),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const brewIngredientConsumptions = sqliteTable(
  "brew_ingredient_consumptions",
  {
    id: text("id").primaryKey(),
    brewBatchId: text("brew_batch_id")
      .notNull()
      .references(() => brewBatches.id),
    recipeIngredientId: text("recipe_ingredient_id"),
    inventoryLotId: text("inventory_lot_id").notNull(),
    plannedQuantity: real("planned_quantity").notNull(),
    actualQuantity: real("actual_quantity").notNull(),
    unit: text("unit", { enum: ["kg", "g", "ml", "l", "each"] }).notNull(),
    usageStage: text("usage_stage", {
      enum: [
        "mash",
        "boil",
        "whirlpool",
        "ferment",
        "dry_hop",
        "package",
        "other",
      ],
    }).notNull(),
    notes: text("notes"),
    createdAt: text("created_at").notNull(),
  }
);

export const fermentationLogEntries = sqliteTable("fermentation_log_entries", {
  id: text("id").primaryKey(),
  brewBatchId: text("brew_batch_id")
    .notNull()
    .references(() => brewBatches.id),
  loggedAt: text("logged_at").notNull(),
  gravity: real("gravity"),
  temperatureCelsius: real("temperature_celsius"),
  ph: real("ph"),
  notes: text("notes"),
  loggedBy: text("logged_by"),
});
