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

// ── Packaging ────────────────────────────────────────

const packageFormatValues = [
  "keg_50l",
  "keg_30l",
  "keg_20l",
  "can_375ml",
  "can_355ml",
  "bottle_330ml",
  "bottle_500ml",
  "other",
] as const;

export const createPackagingRunSchema = z.object({
  brewBatchId: z.string().uuid(),
  packagingDate: z.string().min(1, "Packaging date is required"),
  format: z.enum(packageFormatValues),
  formatCustom: z.string().max(100).nullable().optional(),
  quantityUnits: z.coerce.number().int().positive("Quantity must be positive"),
  volumeLitres: z.coerce.number().positive("Volume must be positive"),
  bestBeforeDate: z.string().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const updateFinishedGoodsSchema = z.object({
  unitPrice: z.coerce.number().nonnegative().nullable().optional(),
  location: z.string().max(200).nullable().optional(),
});

// ── Suppliers ────────────────────────────────────────

export const createSupplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required").max(200),
  contactName: z.string().max(200).nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  phone: z.string().max(50).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  website: z.string().max(200).nullable().optional(),
  paymentTerms: z.string().max(100).nullable().optional(),
  leadTimeDays: z.coerce.number().int().nonnegative().nullable().optional(),
  minimumOrderValue: z.coerce.number().nonnegative().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const updateSupplierSchema = createSupplierSchema.partial();

// ── Purchasing ───────────────────────────────────────

const purchaseOrderStatusValues = [
  "draft",
  "sent",
  "acknowledged",
  "partially_received",
  "received",
  "cancelled",
] as const;

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().uuid("Select a supplier"),
  orderDate: z.string().nullable().optional(),
  expectedDeliveryDate: z.string().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const updatePurchaseOrderSchema = z.object({
  expectedDeliveryDate: z.string().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const purchaseOrderLineSchema = z.object({
  inventoryItemId: z.string().uuid("Select an inventory item"),
  quantityOrdered: z.coerce.number().positive("Quantity must be positive"),
  unit: z.enum(unitValues),
  unitCost: z.coerce.number().nonnegative("Unit cost must be non-negative"),
  notes: z.string().max(500).nullable().optional(),
});

export const poTransitionSchema = z.object({
  toStatus: z.enum(purchaseOrderStatusValues),
});

export const receivePoLineSchema = z.object({
  purchaseOrderLineId: z.string().uuid(),
  quantityReceived: z.coerce.number().positive("Quantity must be positive"),
  lotNumber: z.string().min(1, "Lot number is required").max(100),
  location: z.string().max(200).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

// ── Customers ────────────────────────────────────────

const customerTypeValues = [
  "venue",
  "bottle_shop",
  "distributor",
  "taproom",
  "market",
  "other",
] as const;

export const createCustomerSchema = z.object({
  name: z.string().min(1, "Customer name is required").max(200),
  customerType: z.enum(customerTypeValues),
  contactName: z.string().max(200).nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  phone: z.string().max(50).nullable().optional(),
  addressLine1: z.string().max(200).nullable().optional(),
  addressLine2: z.string().max(200).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(100).nullable().optional(),
  postcode: z.string().max(20).nullable().optional(),
  country: z.string().max(100).default("Australia"),
  deliveryInstructions: z.string().max(1000).nullable().optional(),
  paymentTerms: z.string().max(100).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

// ── Orders ───────────────────────────────────────────

const orderStatusValues = [
  "draft",
  "confirmed",
  "picking",
  "dispatched",
  "delivered",
  "invoiced",
  "paid",
  "cancelled",
] as const;

const orderChannelValues = [
  "wholesale",
  "taproom",
  "online",
  "market",
  "other",
] as const;

export const createOrderSchema = z.object({
  customerId: z.string().uuid("Select a customer"),
  deliveryDate: z.string().nullable().optional(),
  deliveryAddress: z.string().max(500).nullable().optional(),
  channel: z.enum(orderChannelValues).default("wholesale"),
  notes: z.string().max(2000).nullable().optional(),
});

export const updateOrderSchema = z.object({
  deliveryDate: z.string().nullable().optional(),
  deliveryAddress: z.string().max(500).nullable().optional(),
  channel: z.enum(orderChannelValues).optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const orderLineSchema = z.object({
  recipeId: z.string().uuid("Select a recipe"),
  format: z.enum(packageFormatValues),
  description: z.string().max(200).optional(),
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
  unitPrice: z.coerce.number().nonnegative("Price must be non-negative"),
  notes: z.string().max(500).nullable().optional(),
});

export const orderTransitionSchema = z.object({
  toStatus: z.enum(orderStatusValues),
});

// ── Quality Checks ──────────────────────────────────

const qualityCheckTypeValues = [
  "pre_ferment",
  "mid_ferment",
  "post_ferment",
  "pre_package",
  "packaged",
  "other",
] as const;

const qualityCheckResultValues = ["pass", "fail", "pending"] as const;

export const createQualityCheckSchema = z.object({
  brewBatchId: z.string().uuid(),
  checkType: z.enum(qualityCheckTypeValues),
  checkedBy: z.string().max(200).nullable().optional(),
  ph: z.coerce.number().positive().nullable().optional(),
  dissolvedOxygen: z.coerce.number().nonnegative().nullable().optional(),
  turbidity: z.coerce.number().nonnegative().nullable().optional(),
  colourSrm: z.coerce.number().nonnegative().nullable().optional(),
  abv: z.coerce.number().nonnegative().nullable().optional(),
  co2Volumes: z.coerce.number().nonnegative().nullable().optional(),
  sensoryNotes: z.string().max(2000).nullable().optional(),
  microbiological: z.string().max(2000).nullable().optional(),
  result: z.enum(qualityCheckResultValues).default("pending"),
  notes: z.string().max(2000).nullable().optional(),
});

// ── Recipe Process Steps ────────────────────────────

const processStepStageValues = [
  "mash",
  "boil",
  "whirlpool",
  "ferment",
  "condition",
  "package",
] as const;

export const recipeProcessStepSchema = z.object({
  stage: z.enum(processStepStageValues),
  instruction: z.string().min(1, "Instruction is required").max(2000),
  durationMinutes: z.coerce.number().int().nonnegative().nullable().optional(),
  temperatureCelsius: z.coerce.number().nullable().optional(),
  sortOrder: z.coerce.number().int().nonnegative().default(0),
});

// ── Settings ────────────────────────────────────────

export const updateBreweryProfileSchema = z.object({
  name: z.string().min(1, "Brewery name is required").max(200),
  logoUrl: z.string().max(500).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  website: z.string().max(200).nullable().optional(),
  abn: z.string().max(50).nullable().optional(),
  liquorLicenceNumber: z.string().max(100).nullable().optional(),
  defaultCurrency: z.string().max(10).default("AUD"),
  defaultBatchPrefix: z.string().max(10).default("BP"),
  defaultOrderPrefix: z.string().max(10).default("ORD"),
  defaultPoPrefix: z.string().max(10).default("PO"),
  invoiceFooter: z.string().max(2000).nullable().optional(),
});
