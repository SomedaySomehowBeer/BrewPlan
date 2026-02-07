import { eq, and, sql } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { db } from "../client";
import { vessels, brewBatches } from "../schema/index";
import type { VesselStatus, VesselType } from "@brewplan/shared";

// ── List ─────────────────────────────────────────────

export function list(filters?: {
  status?: VesselStatus;
  vesselType?: VesselType;
  archived?: boolean;
}) {
  const baseQuery = db
    .select({
      id: vessels.id,
      name: vessels.name,
      vesselType: vessels.vesselType,
      capacityLitres: vessels.capacityLitres,
      status: vessels.status,
      currentBatchId: vessels.currentBatchId,
      location: vessels.location,
      notes: vessels.notes,
      archived: vessels.archived,
      createdAt: vessels.createdAt,
      updatedAt: vessels.updatedAt,
      currentBatchNumber: brewBatches.batchNumber,
      currentBatchStatus: brewBatches.status,
    })
    .from(vessels)
    .leftJoin(brewBatches, eq(vessels.currentBatchId, brewBatches.id));

  const conditions = [];
  if (filters?.status) {
    conditions.push(eq(vessels.status, filters.status));
  }
  if (filters?.vesselType) {
    conditions.push(eq(vessels.vesselType, filters.vesselType));
  }
  if (filters?.archived !== undefined) {
    conditions.push(eq(vessels.archived, filters.archived));
  }

  if (conditions.length > 0) {
    return baseQuery
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(vessels.name)
      .all();
  }

  return baseQuery.orderBy(vessels.name).all();
}

// ── Get ──────────────────────────────────────────────

export function get(id: string) {
  const result = db
    .select({
      id: vessels.id,
      name: vessels.name,
      vesselType: vessels.vesselType,
      capacityLitres: vessels.capacityLitres,
      status: vessels.status,
      currentBatchId: vessels.currentBatchId,
      location: vessels.location,
      notes: vessels.notes,
      archived: vessels.archived,
      createdAt: vessels.createdAt,
      updatedAt: vessels.updatedAt,
      currentBatchNumber: brewBatches.batchNumber,
      currentBatchStatus: brewBatches.status,
    })
    .from(vessels)
    .leftJoin(brewBatches, eq(vessels.currentBatchId, brewBatches.id))
    .where(eq(vessels.id, id))
    .get();

  return result ?? null;
}

// ── Create ───────────────────────────────────────────

export function create(data: {
  name: string;
  vesselType: string;
  capacityLitres: number;
  location?: string | null;
  notes?: string | null;
}) {
  const now = new Date().toISOString();
  const id = uuid();

  db.insert(vessels)
    .values({
      id,
      name: data.name,
      vesselType: data.vesselType as
        | "fermenter"
        | "brite"
        | "kettle"
        | "hot_liquor_tank"
        | "mash_tun"
        | "other",
      capacityLitres: data.capacityLitres,
      status: "available",
      currentBatchId: null,
      location: data.location ?? null,
      notes: data.notes ?? null,
      archived: false,
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
    vesselType: string;
    capacityLitres: number;
    status: string;
    location: string | null;
    notes: string | null;
    archived: boolean;
  }>
) {
  const existing = db
    .select()
    .from(vessels)
    .where(eq(vessels.id, id))
    .get();
  if (!existing) throw new Error(`Vessel ${id} not found`);

  db.update(vessels)
    .set({
      ...(data as Record<string, unknown>),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(vessels.id, id))
    .run();

  return get(id)!;
}
