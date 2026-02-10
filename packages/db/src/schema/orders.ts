import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { customers } from "./customers";
import { recipes } from "./recipes";
import { finishedGoodsStock } from "./packaging";

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  customerId: text("customer_id")
    .notNull()
    .references(() => customers.id),
  status: text("status", {
    enum: [
      "draft",
      "confirmed",
      "picking",
      "dispatched",
      "delivered",
      "invoiced",
      "paid",
      "cancelled",
    ],
  })
    .notNull()
    .default("draft"),
  orderDate: text("order_date"),
  deliveryDate: text("delivery_date"),
  deliveryAddress: text("delivery_address"),
  channel: text("channel", {
    enum: ["wholesale", "taproom", "online", "market", "other"],
  })
    .notNull()
    .default("wholesale"),
  subtotal: real("subtotal").notNull().default(0),
  tax: real("tax").notNull().default(0),
  total: real("total").notNull().default(0),
  notes: text("notes"),
  invoiceNumber: text("invoice_number").unique(),
  paidAt: text("paid_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const orderLines = sqliteTable("order_lines", {
  id: text("id").primaryKey(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  recipeId: text("recipe_id")
    .notNull()
    .references(() => recipes.id),
  format: text("format", {
    enum: [
      "keg_50l",
      "keg_30l",
      "keg_20l",
      "can_375ml",
      "can_355ml",
      "bottle_330ml",
      "bottle_500ml",
      "other",
    ],
  }).notNull(),
  finishedGoodsId: text("finished_goods_id").references(
    () => finishedGoodsStock.id
  ),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  lineTotal: real("line_total").notNull().default(0),
  notes: text("notes"),
});
