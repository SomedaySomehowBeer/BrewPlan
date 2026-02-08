// Recipe statuses
export const RecipeStatus = {
  DRAFT: "draft",
  ACTIVE: "active",
  ARCHIVED: "archived",
} as const;
export type RecipeStatus = (typeof RecipeStatus)[keyof typeof RecipeStatus];

// Brew batch statuses
export const BatchStatus = {
  PLANNED: "planned",
  BREWING: "brewing",
  FERMENTING: "fermenting",
  CONDITIONING: "conditioning",
  READY_TO_PACKAGE: "ready_to_package",
  PACKAGED: "packaged",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  DUMPED: "dumped",
} as const;
export type BatchStatus = (typeof BatchStatus)[keyof typeof BatchStatus];

// Inventory categories
export const InventoryCategory = {
  GRAIN: "grain",
  HOP: "hop",
  YEAST: "yeast",
  ADJUNCT: "adjunct",
  WATER_CHEMISTRY: "water_chemistry",
  PACKAGING: "packaging",
  CLEANING: "cleaning",
  OTHER: "other",
} as const;
export type InventoryCategory =
  (typeof InventoryCategory)[keyof typeof InventoryCategory];

// Recipe ingredient usage stages
export const UsageStage = {
  MASH: "mash",
  BOIL: "boil",
  WHIRLPOOL: "whirlpool",
  FERMENT: "ferment",
  DRY_HOP: "dry_hop",
  PACKAGE: "package",
  OTHER: "other",
} as const;
export type UsageStage = (typeof UsageStage)[keyof typeof UsageStage];

// Package formats (Phase 2, defined now for type completeness)
export const PackageFormat = {
  KEG_50L: "keg_50l",
  KEG_30L: "keg_30l",
  KEG_20L: "keg_20l",
  CAN_375ML: "can_375ml",
  CAN_355ML: "can_355ml",
  BOTTLE_330ML: "bottle_330ml",
  BOTTLE_500ML: "bottle_500ml",
  OTHER: "other",
} as const;
export type PackageFormat =
  (typeof PackageFormat)[keyof typeof PackageFormat];

// Stock movement types
export const MovementType = {
  RECEIVED: "received",
  CONSUMED: "consumed",
  ADJUSTED: "adjusted",
  TRANSFERRED: "transferred",
  RETURNED: "returned",
  WRITTEN_OFF: "written_off",
} as const;
export type MovementType =
  (typeof MovementType)[keyof typeof MovementType];

// Measurement units
export const Unit = {
  KG: "kg",
  G: "g",
  ML: "ml",
  L: "l",
  EACH: "each",
} as const;
export type Unit = (typeof Unit)[keyof typeof Unit];

// Vessel types
export const VesselType = {
  FERMENTER: "fermenter",
  BRITE: "brite",
  KETTLE: "kettle",
  HOT_LIQUOR_TANK: "hot_liquor_tank",
  MASH_TUN: "mash_tun",
  OTHER: "other",
} as const;
export type VesselType = (typeof VesselType)[keyof typeof VesselType];

// Vessel statuses
export const VesselStatus = {
  AVAILABLE: "available",
  IN_USE: "in_use",
  CLEANING: "cleaning",
  MAINTENANCE: "maintenance",
  OUT_OF_SERVICE: "out_of_service",
} as const;
export type VesselStatus =
  (typeof VesselStatus)[keyof typeof VesselStatus];

// Valid batch transitions
export const BATCH_TRANSITIONS: Record<BatchStatus, BatchStatus[]> = {
  [BatchStatus.PLANNED]: [BatchStatus.BREWING, BatchStatus.CANCELLED],
  [BatchStatus.BREWING]: [BatchStatus.FERMENTING, BatchStatus.DUMPED],
  [BatchStatus.FERMENTING]: [BatchStatus.CONDITIONING, BatchStatus.DUMPED],
  [BatchStatus.CONDITIONING]: [
    BatchStatus.READY_TO_PACKAGE,
    BatchStatus.DUMPED,
  ],
  [BatchStatus.READY_TO_PACKAGE]: [BatchStatus.PACKAGED, BatchStatus.DUMPED],
  [BatchStatus.PACKAGED]: [BatchStatus.COMPLETED],
  [BatchStatus.COMPLETED]: [],
  [BatchStatus.CANCELLED]: [],
  [BatchStatus.DUMPED]: [],
};
