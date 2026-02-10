import { sqliteTable, text, real } from "drizzle-orm/sqlite-core";
import { brewBatches } from "./brewing";

export const qualityChecks = sqliteTable("quality_checks", {
  id: text("id").primaryKey(),
  brewBatchId: text("brew_batch_id")
    .notNull()
    .references(() => brewBatches.id),
  checkType: text("check_type", {
    enum: [
      "pre_ferment",
      "mid_ferment",
      "post_ferment",
      "pre_package",
      "packaged",
      "other",
    ],
  }).notNull(),
  checkedAt: text("checked_at").notNull(),
  checkedBy: text("checked_by"),
  ph: real("ph"),
  dissolvedOxygen: real("dissolved_oxygen"),
  turbidity: real("turbidity"),
  colourSrm: real("colour_srm"),
  abv: real("abv"),
  co2Volumes: real("co2_volumes"),
  sensoryNotes: text("sensory_notes"),
  microbiological: text("microbiological"),
  result: text("result", { enum: ["pass", "fail", "pending"] })
    .notNull()
    .default("pending"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});
