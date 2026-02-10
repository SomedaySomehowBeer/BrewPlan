import type {
  RecipeStatus,
  BatchStatus,
  InventoryCategory,
  UsageStage,
  MovementType,
  Unit,
  VesselType,
  VesselStatus,
  PackageFormat,
  PurchaseOrderStatus,
  CustomerType,
  OrderStatus,
  OrderChannel,
  QualityCheckType,
  QualityCheckResult,
  ProcessStepStage,
} from "./enums";

// ── Auth ──────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// ── Recipes ───────────────────────────────────────────
export interface Recipe {
  id: string;
  name: string;
  style: string;
  status: RecipeStatus;
  version: number;
  parentRecipeId: string | null;
  description: string | null;
  batchSizeLitres: number;
  boilDurationMinutes: number;
  mashTempCelsius: number | null;
  targetOg: number | null;
  targetFg: number | null;
  targetAbv: number | null;
  targetIbu: number | null;
  targetSrm: number | null;
  targetCo2Volumes: number | null;
  estimatedBrewDays: number;
  estimatedFermentationDays: number;
  estimatedConditioningDays: number;
  estimatedTotalDays: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecipeIngredient {
  id: string;
  recipeId: string;
  inventoryItemId: string;
  quantity: number;
  unit: Unit;
  usageStage: UsageStage;
  useTimeMinutes: number | null;
  sortOrder: number;
  notes: string | null;
}

// ── Inventory ─────────────────────────────────────────
export interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  category: InventoryCategory;
  subcategory: string | null;
  unit: Unit;
  unitCost: number;
  reorderPoint: number | null;
  reorderQty: number | null;
  minimumOrderQty: number | null;
  allergens: string | null; // JSON array
  isGlutenFree: boolean;
  countryOfOrigin: string | null;
  notes: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryLot {
  id: string;
  inventoryItemId: string;
  lotNumber: string;
  quantityOnHand: number;
  unit: Unit;
  unitCost: number;
  receivedDate: string;
  expiryDate: string | null;
  location: string | null;
  notes: string | null;
  createdAt: string;
}

export interface StockMovement {
  id: string;
  inventoryLotId: string;
  movementType: MovementType;
  quantity: number;
  referenceType: string | null;
  referenceId: string | null;
  reason: string | null;
  performedBy: string | null;
  createdAt: string;
}

export interface InventoryPosition {
  quantityOnHand: number;
  quantityAllocated: number;
  quantityAvailable: number;
  quantityOnOrder: number;
  quantityProjected: number;
}

// ── Brewing ───────────────────────────────────────────
export interface BrewBatch {
  id: string;
  batchNumber: string;
  recipeId: string;
  status: BatchStatus;
  plannedDate: string | null;
  brewDate: string | null;
  estimatedReadyDate: string | null;
  brewer: string | null;
  batchSizeLitres: number;
  actualVolumeLitres: number | null;
  actualOg: number | null;
  actualFg: number | null;
  actualAbv: number | null;
  actualIbu: number | null;
  vesselId: string | null;
  notes: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BrewIngredientConsumption {
  id: string;
  brewBatchId: string;
  recipeIngredientId: string | null;
  inventoryLotId: string;
  plannedQuantity: number;
  actualQuantity: number;
  unit: Unit;
  usageStage: UsageStage;
  notes: string | null;
  createdAt: string;
}

export interface FermentationLogEntry {
  id: string;
  brewBatchId: string;
  loggedAt: string;
  gravity: number | null;
  temperatureCelsius: number | null;
  ph: number | null;
  notes: string | null;
  loggedBy: string | null;
}

// ── Vessels ───────────────────────────────────────────
export interface Vessel {
  id: string;
  name: string;
  vesselType: VesselType;
  capacityLitres: number;
  status: VesselStatus;
  currentBatchId: string | null;
  location: string | null;
  notes: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Packaging ────────────────────────────────────────
export interface PackagingRun {
  id: string;
  brewBatchId: string;
  packagingDate: string;
  format: PackageFormat;
  formatCustom: string | null;
  quantityUnits: number;
  volumeLitres: number;
  bestBeforeDate: string | null;
  notes: string | null;
  createdAt: string;
}

export interface FinishedGoodsStock {
  id: string;
  packagingRunId: string;
  brewBatchId: string;
  recipeId: string;
  productName: string;
  format: PackageFormat;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  unitPrice: number | null;
  bestBeforeDate: string | null;
  location: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Suppliers ────────────────────────────────────────
export interface Supplier {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  paymentTerms: string | null;
  leadTimeDays: number | null;
  minimumOrderValue: number | null;
  notes: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Purchasing ───────────────────────────────────────
export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  status: PurchaseOrderStatus;
  orderDate: string | null;
  expectedDeliveryDate: string | null;
  subtotal: number;
  tax: number;
  total: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderLine {
  id: string;
  purchaseOrderId: string;
  inventoryItemId: string;
  quantityOrdered: number;
  quantityReceived: number;
  unit: Unit;
  unitCost: number;
  lineTotal: number;
  notes: string | null;
}

// ── Customers ────────────────────────────────────────
export interface Customer {
  id: string;
  name: string;
  customerType: CustomerType;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  country: string;
  deliveryInstructions: string | null;
  paymentTerms: string | null;
  notes: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Orders ───────────────────────────────────────────
export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  status: OrderStatus;
  orderDate: string | null;
  deliveryDate: string | null;
  deliveryAddress: string | null;
  channel: OrderChannel;
  subtotal: number;
  tax: number;
  total: number;
  notes: string | null;
  invoiceNumber: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderLine {
  id: string;
  orderId: string;
  recipeId: string;
  format: PackageFormat;
  finishedGoodsId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  notes: string | null;
}

// ── Quality ──────────────────────────────────────────
export interface QualityCheck {
  id: string;
  brewBatchId: string;
  checkType: QualityCheckType;
  checkedAt: string;
  checkedBy: string | null;
  ph: number | null;
  dissolvedOxygen: number | null;
  turbidity: number | null;
  colourSrm: number | null;
  abv: number | null;
  co2Volumes: number | null;
  sensoryNotes: string | null;
  microbiological: string | null;
  result: QualityCheckResult;
  notes: string | null;
  createdAt: string;
}

// ── Recipe Process Steps ─────────────────────────────
export interface RecipeProcessStep {
  id: string;
  recipeId: string;
  stage: ProcessStepStage;
  instruction: string;
  durationMinutes: number | null;
  temperatureCelsius: number | null;
  sortOrder: number;
}

// ── Settings ─────────────────────────────────────────
export interface BreweryProfile {
  id: string;
  name: string;
  logoUrl: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  abn: string | null;
  liquorLicenceNumber: string | null;
  defaultCurrency: string;
  defaultBatchPrefix: string;
  defaultOrderPrefix: string;
  defaultPoPrefix: string;
  invoiceFooter: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Brewfather Import ────────────────────────────────
export interface BrewfatherIngredientImport {
  name: string;
  type: string;
  amount: number;
  unit: string;
  use: string;
  supplier: string | null;
}

export interface BrewfatherRecipeImport {
  name: string;
  style: string;
  batchSizeLitres: number;
  boilTimeMinutes: number;
  targetOg: number | null;
  targetFg: number | null;
  targetAbv: number | null;
  targetIbu: number | null;
  targetColour: number | null;
  carbonation: number | null;
  notes: string | null;
  fermentables: BrewfatherIngredientImport[];
  hops: BrewfatherIngredientImport[];
  yeasts: BrewfatherIngredientImport[];
  miscs: BrewfatherIngredientImport[];
  mashSteps: { name: string; temperature: number; duration: number }[];
}

// ── Production Summary ───────────────────────────────
export interface ProductionSummary {
  batchesCompleted: number;
  totalVolumeLitres: number;
  batchesInProgress: number;
  avgBatchSizeLitres: number;
  vesselUtilisation: {
    vesselId: string;
    vesselName: string;
    batchCount: number;
  }[];
}

// ── Planning ──────────────────────────────────────────
export interface MaterialRequirement {
  inventoryItemId: string;
  inventoryItemName: string;
  unit: Unit;
  quantityNeeded: number;
  quantityOnHand: number;
  quantityAllocated: number;
  quantityAvailable: number;
  quantityOnOrder: number;
  shortfall: number;
}
