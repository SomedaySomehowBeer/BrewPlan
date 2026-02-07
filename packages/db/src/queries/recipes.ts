import { eq, and, sql } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { db } from "../client";
import { recipes, recipeIngredients } from "../schema/index";
import { inventoryItems } from "../schema/index";
import type { RecipeStatus } from "@brewplan/shared";

// ── List ─────────────────────────────────────────────

export function list(filters?: { status?: RecipeStatus }) {
  if (filters?.status) {
    return db
      .select()
      .from(recipes)
      .where(eq(recipes.status, filters.status))
      .orderBy(recipes.name)
      .all();
  }
  return db.select().from(recipes).orderBy(recipes.name).all();
}

// ── Get ──────────────────────────────────────────────

export function get(id: string) {
  return db.select().from(recipes).where(eq(recipes.id, id)).get() ?? null;
}

// ── Get with ingredients ─────────────────────────────

export function getWithIngredients(id: string) {
  const recipe = get(id);
  if (!recipe) return null;

  const ingredients = db
    .select({
      id: recipeIngredients.id,
      recipeId: recipeIngredients.recipeId,
      inventoryItemId: recipeIngredients.inventoryItemId,
      quantity: recipeIngredients.quantity,
      unit: recipeIngredients.unit,
      usageStage: recipeIngredients.usageStage,
      useTimeMinutes: recipeIngredients.useTimeMinutes,
      sortOrder: recipeIngredients.sortOrder,
      notes: recipeIngredients.notes,
      inventoryItemName: inventoryItems.name,
    })
    .from(recipeIngredients)
    .leftJoin(
      inventoryItems,
      eq(recipeIngredients.inventoryItemId, inventoryItems.id)
    )
    .where(eq(recipeIngredients.recipeId, id))
    .orderBy(recipeIngredients.sortOrder)
    .all();

  return {
    ...recipe,
    ingredients: ingredients.map((ing) => ({
      ...ing,
      inventoryItemName: ing.inventoryItemName ?? "Unknown Item",
    })),
  };
}

// ── Create ───────────────────────────────────────────

export function create(data: {
  name: string;
  style: string;
  description?: string | null;
  batchSizeLitres: number;
  boilDurationMinutes?: number;
  mashTempCelsius?: number | null;
  targetOg?: number | null;
  targetFg?: number | null;
  targetAbv?: number | null;
  targetIbu?: number | null;
  targetSrm?: number | null;
  targetCo2Volumes?: number | null;
  estimatedBrewDays?: number;
  estimatedFermentationDays?: number;
  estimatedConditioningDays?: number;
  notes?: string | null;
  parentRecipeId?: string | null;
  version?: number;
}) {
  const now = new Date().toISOString();
  const id = uuid();

  const estimatedBrewDays = data.estimatedBrewDays ?? 1;
  const estimatedFermentationDays = data.estimatedFermentationDays ?? 14;
  const estimatedConditioningDays = data.estimatedConditioningDays ?? 7;
  const estimatedTotalDays =
    estimatedBrewDays + estimatedFermentationDays + estimatedConditioningDays;

  db.insert(recipes)
    .values({
      id,
      name: data.name,
      style: data.style,
      status: "draft",
      version: data.version ?? 1,
      parentRecipeId: data.parentRecipeId ?? null,
      description: data.description ?? null,
      batchSizeLitres: data.batchSizeLitres,
      boilDurationMinutes: data.boilDurationMinutes ?? 60,
      mashTempCelsius: data.mashTempCelsius ?? null,
      targetOg: data.targetOg ?? null,
      targetFg: data.targetFg ?? null,
      targetAbv: data.targetAbv ?? null,
      targetIbu: data.targetIbu ?? null,
      targetSrm: data.targetSrm ?? null,
      targetCo2Volumes: data.targetCo2Volumes ?? null,
      estimatedBrewDays,
      estimatedFermentationDays,
      estimatedConditioningDays,
      estimatedTotalDays,
      notes: data.notes ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return get(id)!;
}

// ── Update ───────────────────────────────────────────

export function update(
  id: string,
  data: Partial<{
    name: string;
    style: string;
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
    notes: string | null;
  }>
) {
  const existing = get(id);
  if (!existing) throw new Error(`Recipe ${id} not found`);

  // Recalculate total days if any day estimate changed
  const brewDays = data.estimatedBrewDays ?? existing.estimatedBrewDays;
  const fermDays =
    data.estimatedFermentationDays ?? existing.estimatedFermentationDays;
  const condDays =
    data.estimatedConditioningDays ?? existing.estimatedConditioningDays;

  const updateData: Record<string, unknown> = {
    ...data,
    estimatedTotalDays: brewDays + fermDays + condDays,
    updatedAt: new Date().toISOString(),
  };

  db.update(recipes)
    .set(updateData)
    .where(eq(recipes.id, id))
    .run();

  return get(id)!;
}

// ── Set status ───────────────────────────────────────

export function setStatus(id: string, status: RecipeStatus) {
  const existing = get(id);
  if (!existing) throw new Error(`Recipe ${id} not found`);

  db.update(recipes)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(eq(recipes.id, id))
    .run();

  return get(id)!;
}

// ── Ingredients ──────────────────────────────────────

export function addIngredient(
  recipeId: string,
  data: {
    inventoryItemId: string;
    quantity: number;
    unit: string;
    usageStage: string;
    useTimeMinutes?: number | null;
    sortOrder?: number;
    notes?: string | null;
  }
) {
  const id = uuid();

  db.insert(recipeIngredients)
    .values({
      id,
      recipeId,
      inventoryItemId: data.inventoryItemId,
      quantity: data.quantity,
      unit: data.unit as "kg" | "g" | "ml" | "l" | "each",
      usageStage: data.usageStage as
        | "mash"
        | "boil"
        | "whirlpool"
        | "ferment"
        | "dry_hop"
        | "package"
        | "other",
      useTimeMinutes: data.useTimeMinutes ?? null,
      sortOrder: data.sortOrder ?? 0,
      notes: data.notes ?? null,
    })
    .run();

  // Update recipe updatedAt
  db.update(recipes)
    .set({ updatedAt: new Date().toISOString() })
    .where(eq(recipes.id, recipeId))
    .run();

  return db
    .select()
    .from(recipeIngredients)
    .where(eq(recipeIngredients.id, id))
    .get()!;
}

export function updateIngredient(
  id: string,
  data: Partial<{
    inventoryItemId: string;
    quantity: number;
    unit: string;
    usageStage: string;
    useTimeMinutes: number | null;
    sortOrder: number;
    notes: string | null;
  }>
) {
  db.update(recipeIngredients)
    .set(data as Record<string, unknown>)
    .where(eq(recipeIngredients.id, id))
    .run();

  const ingredient = db
    .select()
    .from(recipeIngredients)
    .where(eq(recipeIngredients.id, id))
    .get()!;

  // Update recipe updatedAt
  db.update(recipes)
    .set({ updatedAt: new Date().toISOString() })
    .where(eq(recipes.id, ingredient.recipeId))
    .run();

  return ingredient;
}

export function removeIngredient(id: string) {
  const ingredient = db
    .select()
    .from(recipeIngredients)
    .where(eq(recipeIngredients.id, id))
    .get();

  db.delete(recipeIngredients)
    .where(eq(recipeIngredients.id, id))
    .run();

  // Update recipe updatedAt if ingredient existed
  if (ingredient) {
    db.update(recipes)
      .set({ updatedAt: new Date().toISOString() })
      .where(eq(recipes.id, ingredient.recipeId))
      .run();
  }
}
