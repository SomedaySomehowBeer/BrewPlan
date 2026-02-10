PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_inventory_lots` (
	`id` text PRIMARY KEY NOT NULL,
	`inventory_item_id` text NOT NULL,
	`lot_number` text NOT NULL,
	`quantity_on_hand` real NOT NULL,
	`unit` text NOT NULL,
	`unit_cost` real NOT NULL,
	`received_date` text NOT NULL,
	`expiry_date` text,
	`purchase_order_id` text,
	`location` text,
	`notes` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "lot_qty_on_hand_nonneg" CHECK("__new_inventory_lots"."quantity_on_hand" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_inventory_lots`("id", "inventory_item_id", "lot_number", "quantity_on_hand", "unit", "unit_cost", "received_date", "expiry_date", "purchase_order_id", "location", "notes", "created_at") SELECT "id", "inventory_item_id", "lot_number", "quantity_on_hand", "unit", "unit_cost", "received_date", "expiry_date", "purchase_order_id", "location", "notes", "created_at" FROM `inventory_lots`;--> statement-breakpoint
DROP TABLE `inventory_lots`;--> statement-breakpoint
ALTER TABLE `__new_inventory_lots` RENAME TO `inventory_lots`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_finished_goods_stock` (
	`id` text PRIMARY KEY NOT NULL,
	`packaging_run_id` text NOT NULL,
	`brew_batch_id` text NOT NULL,
	`recipe_id` text NOT NULL,
	`product_name` text NOT NULL,
	`format` text NOT NULL,
	`quantity_on_hand` integer DEFAULT 0 NOT NULL,
	`quantity_reserved` integer DEFAULT 0 NOT NULL,
	`unit_price` real,
	`best_before_date` text,
	`location` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`packaging_run_id`) REFERENCES `packaging_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`brew_batch_id`) REFERENCES `brew_batches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "fg_qty_on_hand_nonneg" CHECK("__new_finished_goods_stock"."quantity_on_hand" >= 0),
	CONSTRAINT "fg_qty_reserved_nonneg" CHECK("__new_finished_goods_stock"."quantity_reserved" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_finished_goods_stock`("id", "packaging_run_id", "brew_batch_id", "recipe_id", "product_name", "format", "quantity_on_hand", "quantity_reserved", "unit_price", "best_before_date", "location", "created_at", "updated_at") SELECT "id", "packaging_run_id", "brew_batch_id", "recipe_id", "product_name", "format", "quantity_on_hand", "quantity_reserved", "unit_price", "best_before_date", "location", "created_at", "updated_at" FROM `finished_goods_stock`;--> statement-breakpoint
DROP TABLE `finished_goods_stock`;--> statement-breakpoint
ALTER TABLE `__new_finished_goods_stock` RENAME TO `finished_goods_stock`;--> statement-breakpoint
CREATE TABLE `__new_purchase_order_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`purchase_order_id` text NOT NULL,
	`inventory_item_id` text NOT NULL,
	`quantity_ordered` real NOT NULL,
	`quantity_received` real DEFAULT 0 NOT NULL,
	`unit` text NOT NULL,
	`unit_cost` real NOT NULL,
	`line_total` real DEFAULT 0 NOT NULL,
	`notes` text,
	FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "pol_qty_received_nonneg" CHECK("__new_purchase_order_lines"."quantity_received" >= 0),
	CONSTRAINT "pol_qty_ordered_nonneg" CHECK("__new_purchase_order_lines"."quantity_ordered" > 0)
);
--> statement-breakpoint
INSERT INTO `__new_purchase_order_lines`("id", "purchase_order_id", "inventory_item_id", "quantity_ordered", "quantity_received", "unit", "unit_cost", "line_total", "notes") SELECT "id", "purchase_order_id", "inventory_item_id", "quantity_ordered", "quantity_received", "unit", "unit_cost", "line_total", "notes" FROM `purchase_order_lines`;--> statement-breakpoint
DROP TABLE `purchase_order_lines`;--> statement-breakpoint
ALTER TABLE `__new_purchase_order_lines` RENAME TO `purchase_order_lines`;