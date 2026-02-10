import { eq, desc } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { db } from "../client";
import { qualityChecks } from "../schema/index";

export function listByBatch(batchId: string) {
  return db
    .select()
    .from(qualityChecks)
    .where(eq(qualityChecks.brewBatchId, batchId))
    .orderBy(desc(qualityChecks.checkedAt))
    .all();
}

export function get(id: string) {
  return (
    db.select().from(qualityChecks).where(eq(qualityChecks.id, id)).get() ??
    null
  );
}

export function create(data: {
  brewBatchId: string;
  checkType: string;
  checkedBy?: string | null;
  ph?: number | null;
  dissolvedOxygen?: number | null;
  turbidity?: number | null;
  colourSrm?: number | null;
  abv?: number | null;
  co2Volumes?: number | null;
  sensoryNotes?: string | null;
  microbiological?: string | null;
  result?: string;
  notes?: string | null;
}) {
  const now = new Date().toISOString();
  const id = uuid();

  db.insert(qualityChecks)
    .values({
      id,
      brewBatchId: data.brewBatchId,
      checkType: data.checkType as
        | "pre_ferment"
        | "mid_ferment"
        | "post_ferment"
        | "pre_package"
        | "packaged"
        | "other",
      checkedAt: now,
      checkedBy: data.checkedBy ?? null,
      ph: data.ph ?? null,
      dissolvedOxygen: data.dissolvedOxygen ?? null,
      turbidity: data.turbidity ?? null,
      colourSrm: data.colourSrm ?? null,
      abv: data.abv ?? null,
      co2Volumes: data.co2Volumes ?? null,
      sensoryNotes: data.sensoryNotes ?? null,
      microbiological: data.microbiological ?? null,
      result: (data.result as "pass" | "fail" | "pending") ?? "pending",
      notes: data.notes ?? null,
      createdAt: now,
    })
    .run();

  return get(id)!;
}

export function update(
  id: string,
  data: Partial<{
    checkType: string;
    checkedBy: string | null;
    ph: number | null;
    dissolvedOxygen: number | null;
    turbidity: number | null;
    colourSrm: number | null;
    abv: number | null;
    co2Volumes: number | null;
    sensoryNotes: string | null;
    microbiological: string | null;
    result: string;
    notes: string | null;
  }>
) {
  db.update(qualityChecks)
    .set(data as Record<string, unknown>)
    .where(eq(qualityChecks.id, id))
    .run();

  return get(id)!;
}

export function remove(id: string) {
  db.delete(qualityChecks).where(eq(qualityChecks.id, id)).run();
}
