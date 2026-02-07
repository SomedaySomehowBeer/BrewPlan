import type {
  RecipeStatus,
  BatchStatus,
  InventoryCategory,
  UsageStage,
  MovementType,
  Unit,
  VesselType,
  VesselStatus,
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
