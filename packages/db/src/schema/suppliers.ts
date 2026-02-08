import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const suppliers = sqliteTable("suppliers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  website: text("website"),
  paymentTerms: text("payment_terms"),
  leadTimeDays: integer("lead_time_days"),
  minimumOrderValue: real("minimum_order_value"),
  notes: text("notes"),
  archived: integer("archived", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
