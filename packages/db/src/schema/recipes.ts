import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const recipes = sqliteTable("recipes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  style: text("style").notNull(),
  status: text("status", { enum: ["draft", "active", "archived"] })
    .notNull()
    .default("draft"),
  version: integer("version").notNull().default(1),
  parentRecipeId: text("parent_recipe_id").references((): ReturnType<typeof text> => recipes.id),
  description: text("description"),
  batchSizeLitres: real("batch_size_litres").notNull(),
  boilDurationMinutes: integer("boil_duration_minutes").notNull().default(60),
  mashTempCelsius: real("mash_temp_celsius"),
  targetOg: real("target_og"),
  targetFg: real("target_fg"),
  targetAbv: real("target_abv"),
  targetIbu: real("target_ibu"),
  targetSrm: real("target_srm"),
  targetCo2Volumes: real("target_co2_volumes"),
  estimatedBrewDays: integer("estimated_brew_days").notNull().default(1),
  estimatedFermentationDays: integer("estimated_fermentation_days")
    .notNull()
    .default(14),
  estimatedConditioningDays: integer("estimated_conditioning_days")
    .notNull()
    .default(7),
  estimatedTotalDays: integer("estimated_total_days").notNull().default(22),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const recipeIngredients = sqliteTable("recipe_ingredients", {
  id: text("id").primaryKey(),
  recipeId: text("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  inventoryItemId: text("inventory_item_id").notNull(),
  quantity: real("quantity").notNull(),
  unit: text("unit", { enum: ["kg", "g", "ml", "l", "each"] }).notNull(),
  usageStage: text("usage_stage", {
    enum: ["mash", "boil", "whirlpool", "ferment", "dry_hop", "package", "other"],
  }).notNull(),
  useTimeMinutes: integer("use_time_minutes"),
  sortOrder: integer("sort_order").notNull().default(0),
  notes: text("notes"),
});

export const recipeProcessSteps = sqliteTable("recipe_process_steps", {
  id: text("id").primaryKey(),
  recipeId: text("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  stage: text("stage", {
    enum: ["mash", "boil", "whirlpool", "ferment", "condition", "package"],
  }).notNull(),
  instruction: text("instruction").notNull(),
  durationMinutes: integer("duration_minutes"),
  temperatureCelsius: real("temperature_celsius"),
  sortOrder: integer("sort_order").notNull().default(0),
});
