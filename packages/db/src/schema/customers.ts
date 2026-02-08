import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const customers = sqliteTable("customers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  customerType: text("customer_type", {
    enum: ["venue", "bottle_shop", "distributor", "taproom", "market", "other"],
  }).notNull(),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  addressLine1: text("address_line_1"),
  addressLine2: text("address_line_2"),
  city: text("city"),
  state: text("state"),
  postcode: text("postcode"),
  country: text("country").notNull().default("Australia"),
  deliveryInstructions: text("delivery_instructions"),
  paymentTerms: text("payment_terms"),
  notes: text("notes"),
  archived: integer("archived", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
