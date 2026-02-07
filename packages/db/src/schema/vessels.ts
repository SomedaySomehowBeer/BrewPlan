import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const vessels = sqliteTable("vessels", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  vesselType: text("vessel_type", {
    enum: [
      "fermenter",
      "brite",
      "kettle",
      "hot_liquor_tank",
      "mash_tun",
      "other",
    ],
  }).notNull(),
  capacityLitres: real("capacity_litres").notNull(),
  status: text("status", {
    enum: ["available", "in_use", "cleaning", "maintenance", "out_of_service"],
  })
    .notNull()
    .default("available"),
  currentBatchId: text("current_batch_id"),
  location: text("location"),
  notes: text("notes"),
  archived: integer("archived", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
