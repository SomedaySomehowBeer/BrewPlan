import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const breweryProfile = sqliteTable("brewery_profile", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  abn: text("abn"),
  liquorLicenceNumber: text("liquor_licence_number"),
  defaultCurrency: text("default_currency").notNull().default("AUD"),
  defaultBatchPrefix: text("default_batch_prefix").notNull().default("BP"),
  defaultOrderPrefix: text("default_order_prefix").notNull().default("ORD"),
  defaultPoPrefix: text("default_po_prefix").notNull().default("PO"),
  invoiceFooter: text("invoice_footer"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
