import { z } from "zod";

// ── Enum values for Zod ──────────────────────────────

const recipeStatusValues = ["draft", "active", "archived"] as const;
const batchStatusValues = [
  "planned",
  "brewing",
  "fermenting",
  "conditioning",
  "ready_to_package",
  "packaged",
  "completed",
  "cancelled",
  "dumped",
] as const;
const inventoryCategoryValues = [
  "grain",
  "hop",
  "yeast",
  "adjunct",
  "water_chemistry",
  "packaging",
  "cleaning",
  "other",
] as const;
const usageStageValues = [
  "mash",
  "boil",
  "whirlpool",
  "ferment",
  "dry_hop",
  "package",
  "other",
] as const;
const movementTypeValues = [
  "received",
  "consumed",
  "adjusted",
  "transferred",
  "returned",
  "written_off",
] as const;
const unitValues = ["kg", "g", "ml", "l", "each"] as const;
const vesselTypeValues = [
  "fermenter",
  "brite",
  "kettle",
  "hot_liquor_tank",
  "mash_tun",
  "other",
] as const;
const vesselStatusValues = [
  "available",
  "in_use",
  "cleaning",
  "maintenance",
  "out_of_service",
] as const;

// ── Auth ──────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
});

// ── Recipes ───────────────────────────────────────────

export const createRecipeSchema = z.object({
  name: z.string().min(1, "Recipe name is required").max(200),
  style: z.string().min(1, "Style is required").max(200),
  description: z.string().max(2000).nullable().optional(),
  batchSizeLitres: z.coerce.number().positive("Batch size must be positive"),
  boilDurationMinutes: z.coerce.number().int().nonnegative().default(60),
  mashTempCelsius: z.coerce.number().positive().nullable().optional(),
  targetOg: z.coerce.number().positive().nullable().optional(),
  targetFg: z.coerce.number().positive().nullable().optional(),
  targetAbv: z.coerce.number().nonnegative().nullable().optional(),
  targetIbu: z.coerce.number().nonnegative().nullable().optional(),
  targetSrm: z.coerce.number().nonnegative().nullable().optional(),
  targetCo2Volumes: z.coerce.number().nonnegative().nullable().optional(),
  estimatedBrewDays: z.coerce.number().int().positive().default(1),
  estimatedFermentationDays: z.coerce.number().int().positive().default(14),
  estimatedConditioningDays: z.coerce.number().int().nonnegative().default(7),
  notes: z.string().max(5000).nullable().optional(),
});

export const updateRecipeSchema = createRecipeSchema.partial();

export const recipeIngredientSchema = z.object({
  inventoryItemId: z.string().uuid("Invalid inventory item"),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  unit: z.enum(unitValues),
  usageStage: z.enum(usageStageValues),
  useTimeMinutes: z.coerce.number().int().nonnegative().nullable().optional(),
  sortOrder: z.coerce.number().int().nonnegative().default(0),
  notes: z.string().max(500).nullable().optional(),
});

// ── Inventory ─────────────────────────────────────────

export const createInventoryItemSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  sku: z.string().max(50).nullable().optional(),
  category: z.enum(inventoryCategoryValues),
  subcategory: z.string().max(100).nullable().optional(),
  unit: z.enum(unitValues),
  unitCost: z.coerce.number().nonnegative().default(0),
  reorderPoint: z.coerce.number().nonnegative().nullable().optional(),
  reorderQty: z.coerce.number().nonnegative().nullable().optional(),
  minimumOrderQty: z.coerce.number().nonnegative().nullable().optional(),
  isGlutenFree: z.coerce.boolean().default(true),
  countryOfOrigin: z.string().max(100).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const updateInventoryItemSchema = createInventoryItemSchema.partial();

export const createInventoryLotSchema = z.object({
  inventoryItemId: z.string().uuid(),
  lotNumber: z.string().min(1, "Lot number is required").max(100),
  quantityOnHand: z.coerce.number().nonnegative(),
  unit: z.enum(unitValues),
  unitCost: z.coerce.number().nonnegative(),
  receivedDate: z.string().min(1, "Received date is required"),
  expiryDate: z.string().nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const recordMovementSchema = z.object({
  inventoryLotId: z.string().uuid(),
  movementType: z.enum(movementTypeValues),
  quantity: z.coerce.number().refine((n) => n !== 0, "Quantity cannot be zero"),
  referenceType: z.string().max(50).nullable().optional(),
  referenceId: z.string().uuid().nullable().optional(),
  reason: z.string().max(500).nullable().optional(),
  performedBy: z.string().max(200).nullable().optional(),
});

// ── Brewing ───────────────────────────────────────────

export const createBatchSchema = z.object({
  recipeId: z.string().uuid("Select a recipe"),
  plannedDate: z.string().nullable().optional(),
  brewer: z.string().max(200).nullable().optional(),
  batchSizeLitres: z.coerce.number().positive(),
  vesselId: z.string().uuid().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
});

export const updateBatchSchema = z.object({
  plannedDate: z.string().nullable().optional(),
  brewer: z.string().max(200).nullable().optional(),
  batchSizeLitres: z.coerce.number().positive().optional(),
  actualVolumeLitres: z.coerce.number().positive().nullable().optional(),
  actualOg: z.coerce.number().positive().nullable().optional(),
  actualFg: z.coerce.number().positive().nullable().optional(),
  actualAbv: z.coerce.number().nonnegative().nullable().optional(),
  actualIbu: z.coerce.number().nonnegative().nullable().optional(),
  vesselId: z.string().uuid().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
});

export const batchTransitionSchema = z.object({
  toStatus: z.enum(batchStatusValues),
});

export const recordConsumptionSchema = z.object({
  recipeIngredientId: z.string().uuid().nullable().optional(),
  inventoryLotId: z.string().uuid("Select a lot"),
  plannedQuantity: z.coerce.number().nonnegative(),
  actualQuantity: z.coerce.number().positive("Actual quantity must be positive"),
  unit: z.enum(unitValues),
  usageStage: z.enum(usageStageValues),
  notes: z.string().max(500).nullable().optional(),
});

export const fermentationLogSchema = z.object({
  gravity: z.coerce.number().positive().nullable().optional(),
  temperatureCelsius: z.coerce.number().nullable().optional(),
  ph: z.coerce.number().positive().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  loggedBy: z.string().max(200).nullable().optional(),
});

export const batchMeasurementLogSchema = z.object({
  og: z.coerce.number().positive().nullable().optional(),
  fg: z.coerce.number().positive().nullable().optional(),
  volumeLitres: z.coerce.number().positive().nullable().optional(),
  ibu: z.coerce.number().nonnegative().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  loggedBy: z.string().max(200).nullable().optional(),
});

// ── Vessels ───────────────────────────────────────────

export const createVesselSchema = z.object({
  name: z.string().min(1, "Vessel name is required").max(100),
  vesselType: z.enum(vesselTypeValues),
  capacityLitres: z.coerce.number().positive("Capacity must be positive"),
  location: z.string().max(200).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const updateVesselSchema = createVesselSchema.partial().extend({
  status: z.enum(vesselStatusValues).optional(),
});
