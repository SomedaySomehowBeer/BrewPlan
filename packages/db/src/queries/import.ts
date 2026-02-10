import { eq, sql } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { db } from "../client";
import { recipes, recipeIngredients, inventoryItems } from "../schema/index";
import type { BrewfatherRecipeImport } from "@brewplan/shared";

// ── Parse Brewfather JSON ───────────────────────────

export function parseBrewfatherJson(raw: unknown): BrewfatherRecipeImport {
  const data = raw as Record<string, unknown>;

  const name = String(data.name ?? "Untitled Import");
  const styleObj = data.style as Record<string, unknown> | undefined;
  const style = styleObj?.name ? String(styleObj.name) : "Unknown Style";
  const equipment = data.equipment as Record<string, unknown> | undefined;

  const batchSizeLitres =
    typeof data.batchSize === "number"
      ? data.batchSize
      : typeof equipment?.batchSize === "number"
      ? equipment.batchSize
      : 20;

  const boilTimeMinutes =
    typeof data.boilTime === "number"
      ? data.boilTime
      : typeof equipment?.boilTime === "number"
      ? equipment.boilTime
      : 60;

  const fermentables = Array.isArray(data.fermentables)
    ? data.fermentables.map((f: Record<string, unknown>) => ({
        name: String(f.name ?? "Unknown Fermentable"),
        type: String(f.type ?? "Grain"),
        amount: typeof f.amount === "number" ? f.amount : 0,
        unit: "g",
        use: String(f.use ?? "mash"),
        supplier: f.supplier ? String(f.supplier) : null,
      }))
    : [];

  const hops = Array.isArray(data.hops)
    ? data.hops.map((h: Record<string, unknown>) => ({
        name: String(h.name ?? "Unknown Hop"),
        type: String(h.type ?? "Pellet"),
        amount: typeof h.amount === "number" ? h.amount : 0,
        unit: "g",
        use: String(h.use ?? "Boil").toLowerCase(),
        supplier: null,
      }))
    : [];

  const yeasts = Array.isArray(data.yeasts)
    ? data.yeasts.map((y: Record<string, unknown>) => ({
        name: String(y.name ?? "Unknown Yeast"),
        type: String(y.type ?? "Ale"),
        amount: typeof y.amount === "number" ? y.amount : 0,
        unit: y.unit ? String(y.unit) : "g",
        use: "ferment",
        supplier: y.laboratory ? String(y.laboratory) : null,
      }))
    : [];

  const miscs = Array.isArray(data.miscs)
    ? data.miscs.map((m: Record<string, unknown>) => ({
        name: String(m.name ?? "Unknown Misc"),
        type: String(m.type ?? "Other"),
        amount: typeof m.amount === "number" ? m.amount : 0,
        unit: m.unit ? String(m.unit) : "g",
        use: String(m.use ?? "other").toLowerCase(),
        supplier: null,
      }))
    : [];

  const mashObj = data.mash as Record<string, unknown> | undefined;
  const mashSteps = Array.isArray(mashObj?.steps)
    ? (mashObj.steps as Record<string, unknown>[]).map((s) => ({
        name: s.name ? String(s.name) : "Step",
        temperature: typeof s.stepTemp === "number" ? s.stepTemp : 65,
        duration: typeof s.stepTime === "number" ? s.stepTime : 15,
      }))
    : [];

  return {
    name,
    style,
    batchSizeLitres,
    boilTimeMinutes,
    targetOg: typeof data.og === "number" ? data.og : null,
    targetFg: typeof data.fg === "number" ? data.fg : null,
    targetAbv: typeof data.abv === "number" ? data.abv : null,
    targetIbu: typeof data.ibu === "number" ? data.ibu : null,
    targetColour: typeof data.color === "number" ? data.color : null,
    carbonation: typeof data.carbonation === "number" ? data.carbonation : null,
    notes: typeof data.notes === "string" ? data.notes : null,
    fermentables,
    hops,
    yeasts,
    miscs,
    mashSteps,
  };
}

// ── Import parsed recipe into DB ────────────────────

function mapBrewfatherUseToStage(use: string): string {
  const map: Record<string, string> = {
    mash: "mash",
    boil: "boil",
    "first wort": "boil",
    aroma: "whirlpool",
    whirlpool: "whirlpool",
    "dry hop": "dry_hop",
    flameout: "whirlpool",
    sparge: "mash",
    ferment: "ferment",
    primary: "ferment",
    secondary: "ferment",
    package: "package",
    bottling: "package",
  };
  return map[use.toLowerCase()] ?? "other";
}

function findMatchingInventoryItem(name: string) {
  // Case-insensitive match
  return db
    .select()
    .from(inventoryItems)
    .where(sql`lower(${inventoryItems.name}) = lower(${name})`)
    .get();
}

function mapBrewfatherTypeToCategory(type: string): string {
  const lower = type.toLowerCase();
  if (
    lower.includes("grain") ||
    lower.includes("malt") ||
    lower.includes("adjunct") ||
    lower.includes("sugar") ||
    lower.includes("extract")
  )
    return "grain";
  if (lower.includes("hop") || lower === "pellet") return "hop";
  if (lower.includes("yeast") || lower.includes("ale") || lower.includes("lager"))
    return "yeast";
  if (lower.includes("water") || lower.includes("salt") || lower.includes("acid"))
    return "water_chemistry";
  if (lower.includes("spice") || lower.includes("fining"))
    return "adjunct";
  return "other";
}

export function importBrewfatherRecipe(parsed: BrewfatherRecipeImport) {
  const now = new Date().toISOString();
  const recipeId = uuid();

  // Create recipe
  db.insert(recipes)
    .values({
      id: recipeId,
      name: parsed.name,
      style: parsed.style,
      status: "draft",
      version: 1,
      parentRecipeId: null,
      description: null,
      batchSizeLitres: parsed.batchSizeLitres,
      boilDurationMinutes: parsed.boilTimeMinutes,
      mashTempCelsius: parsed.mashSteps.length > 0 ? parsed.mashSteps[0].temperature : null,
      targetOg: parsed.targetOg,
      targetFg: parsed.targetFg,
      targetAbv: parsed.targetAbv,
      targetIbu: parsed.targetIbu,
      targetSrm: parsed.targetColour,
      targetCo2Volumes: parsed.carbonation,
      estimatedBrewDays: 1,
      estimatedFermentationDays: 14,
      estimatedConditioningDays: 7,
      estimatedTotalDays: 22,
      notes: parsed.notes,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  // Import all ingredients
  const allIngredients = [
    ...parsed.fermentables.map((f) => ({
      ...f,
      category: mapBrewfatherTypeToCategory(f.type),
      unit: f.amount >= 1000 ? "kg" : "g",
      quantity: f.amount >= 1000 ? f.amount / 1000 : f.amount,
    })),
    ...parsed.hops.map((h) => ({
      ...h,
      category: "hop" as const,
      unit: "g",
      quantity: h.amount,
    })),
    ...parsed.yeasts.map((y) => ({
      ...y,
      category: "yeast" as const,
      unit: y.unit === "pkg" ? "each" : y.unit,
      quantity: y.amount,
    })),
    ...parsed.miscs.map((m) => ({
      ...m,
      category: mapBrewfatherTypeToCategory(m.type),
      unit: m.unit,
      quantity: m.amount,
    })),
  ];

  let sortOrder = 0;
  for (const ingredient of allIngredients) {
    // Try to match existing inventory item
    let item = findMatchingInventoryItem(ingredient.name);

    // Create placeholder if not found
    if (!item) {
      const itemId = uuid();
      db.insert(inventoryItems)
        .values({
          id: itemId,
          name: ingredient.name,
          sku: null,
          category: ingredient.category as
            | "grain"
            | "hop"
            | "yeast"
            | "adjunct"
            | "water_chemistry"
            | "packaging"
            | "cleaning"
            | "other",
          subcategory: null,
          unit: (ingredient.unit === "kg" ||
            ingredient.unit === "g" ||
            ingredient.unit === "ml" ||
            ingredient.unit === "l" ||
            ingredient.unit === "each"
            ? ingredient.unit
            : "g") as "kg" | "g" | "ml" | "l" | "each",
          unitCost: 0,
          reorderPoint: null,
          reorderQty: null,
          minimumOrderQty: null,
          allergens: null,
          isGlutenFree: false,
          countryOfOrigin: null,
          notes: `Auto-created from Brewfather import: ${parsed.name}`,
          archived: false,
          createdAt: now,
          updatedAt: now,
        })
        .run();
      item = db
        .select()
        .from(inventoryItems)
        .where(eq(inventoryItems.id, itemId))
        .get()!;
    }

    const validUnit =
      ingredient.unit === "kg" ||
      ingredient.unit === "g" ||
      ingredient.unit === "ml" ||
      ingredient.unit === "l" ||
      ingredient.unit === "each"
        ? ingredient.unit
        : "g";

    db.insert(recipeIngredients)
      .values({
        id: uuid(),
        recipeId,
        inventoryItemId: item.id,
        quantity: ingredient.quantity,
        unit: validUnit as "kg" | "g" | "ml" | "l" | "each",
        usageStage: mapBrewfatherUseToStage(ingredient.use) as
          | "mash"
          | "boil"
          | "whirlpool"
          | "ferment"
          | "dry_hop"
          | "package"
          | "other",
        useTimeMinutes: null,
        sortOrder,
        notes: null,
      })
      .run();

    sortOrder++;
  }

  return db.select().from(recipes).where(eq(recipes.id, recipeId)).get()!;
}
