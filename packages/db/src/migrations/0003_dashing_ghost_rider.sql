CREATE TABLE `finished_goods_stock` (
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
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `packaging_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`brew_batch_id` text NOT NULL,
	`packaging_date` text NOT NULL,
	`format` text NOT NULL,
	`format_custom` text,
	`quantity_units` integer NOT NULL,
	`volume_litres` real NOT NULL,
	`best_before_date` text,
	`notes` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`brew_batch_id`) REFERENCES `brew_batches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`contact_name` text,
	`email` text,
	`phone` text,
	`address` text,
	`website` text,
	`payment_terms` text,
	`lead_time_days` integer,
	`minimum_order_value` real,
	`notes` text,
	`archived` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `purchase_order_lines` (
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
	FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `purchase_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`po_number` text NOT NULL,
	`supplier_id` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`order_date` text,
	`expected_delivery_date` text,
	`subtotal` real DEFAULT 0 NOT NULL,
	`tax` real DEFAULT 0 NOT NULL,
	`total` real DEFAULT 0 NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `purchase_orders_po_number_unique` ON `purchase_orders` (`po_number`);--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`customer_type` text NOT NULL,
	`contact_name` text,
	`email` text,
	`phone` text,
	`address_line_1` text,
	`address_line_2` text,
	`city` text,
	`state` text,
	`postcode` text,
	`country` text DEFAULT 'Australia' NOT NULL,
	`delivery_instructions` text,
	`payment_terms` text,
	`notes` text,
	`archived` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `order_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`recipe_id` text NOT NULL,
	`format` text NOT NULL,
	`finished_goods_id` text,
	`description` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price` real NOT NULL,
	`line_total` real DEFAULT 0 NOT NULL,
	`notes` text,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`finished_goods_id`) REFERENCES `finished_goods_stock`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`order_number` text NOT NULL,
	`customer_id` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`order_date` text,
	`delivery_date` text,
	`delivery_address` text,
	`channel` text DEFAULT 'wholesale' NOT NULL,
	`subtotal` real DEFAULT 0 NOT NULL,
	`tax` real DEFAULT 0 NOT NULL,
	`total` real DEFAULT 0 NOT NULL,
	`notes` text,
	`invoice_number` text,
	`paid_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_order_number_unique` ON `orders` (`order_number`);--> statement-breakpoint
ALTER TABLE `inventory_items` ADD `supplier_id` text REFERENCES suppliers(id);--> statement-breakpoint
ALTER TABLE `inventory_lots` ADD `purchase_order_id` text;