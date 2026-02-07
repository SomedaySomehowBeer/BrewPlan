CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `recipe_ingredients` (
	`id` text PRIMARY KEY NOT NULL,
	`recipe_id` text NOT NULL,
	`inventory_item_id` text NOT NULL,
	`quantity` real NOT NULL,
	`unit` text NOT NULL,
	`usage_stage` text NOT NULL,
	`use_time_minutes` integer,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`notes` text,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `recipes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`style` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`parent_recipe_id` text,
	`description` text,
	`batch_size_litres` real NOT NULL,
	`boil_duration_minutes` integer DEFAULT 60 NOT NULL,
	`mash_temp_celsius` real,
	`target_og` real,
	`target_fg` real,
	`target_abv` real,
	`target_ibu` real,
	`target_srm` real,
	`target_co2_volumes` real,
	`estimated_brew_days` integer DEFAULT 1 NOT NULL,
	`estimated_fermentation_days` integer DEFAULT 14 NOT NULL,
	`estimated_conditioning_days` integer DEFAULT 7 NOT NULL,
	`estimated_total_days` integer DEFAULT 22 NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`parent_recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `inventory_items` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`sku` text,
	`category` text NOT NULL,
	`subcategory` text,
	`unit` text NOT NULL,
	`unit_cost` real DEFAULT 0 NOT NULL,
	`reorder_point` real,
	`reorder_qty` real,
	`minimum_order_qty` real,
	`allergens` text,
	`is_gluten_free` integer DEFAULT true NOT NULL,
	`country_of_origin` text,
	`notes` text,
	`archived` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `inventory_lots` (
	`id` text PRIMARY KEY NOT NULL,
	`inventory_item_id` text NOT NULL,
	`lot_number` text NOT NULL,
	`quantity_on_hand` real NOT NULL,
	`unit` text NOT NULL,
	`unit_cost` real NOT NULL,
	`received_date` text NOT NULL,
	`expiry_date` text,
	`location` text,
	`notes` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` text PRIMARY KEY NOT NULL,
	`inventory_lot_id` text NOT NULL,
	`movement_type` text NOT NULL,
	`quantity` real NOT NULL,
	`reference_type` text,
	`reference_id` text,
	`reason` text,
	`performed_by` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`inventory_lot_id`) REFERENCES `inventory_lots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `brew_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_number` text NOT NULL,
	`recipe_id` text NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`planned_date` text,
	`brew_date` text,
	`estimated_ready_date` text,
	`brewer` text,
	`batch_size_litres` real NOT NULL,
	`actual_volume_litres` real,
	`actual_og` real,
	`actual_fg` real,
	`actual_abv` real,
	`actual_ibu` real,
	`vessel_id` text,
	`notes` text,
	`completed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`vessel_id`) REFERENCES `vessels`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `brew_batches_batch_number_unique` ON `brew_batches` (`batch_number`);--> statement-breakpoint
CREATE TABLE `brew_ingredient_consumptions` (
	`id` text PRIMARY KEY NOT NULL,
	`brew_batch_id` text NOT NULL,
	`recipe_ingredient_id` text,
	`inventory_lot_id` text NOT NULL,
	`planned_quantity` real NOT NULL,
	`actual_quantity` real NOT NULL,
	`unit` text NOT NULL,
	`usage_stage` text NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`brew_batch_id`) REFERENCES `brew_batches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `fermentation_log_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`brew_batch_id` text NOT NULL,
	`logged_at` text NOT NULL,
	`gravity` real,
	`temperature_celsius` real,
	`ph` real,
	`notes` text,
	`logged_by` text,
	FOREIGN KEY (`brew_batch_id`) REFERENCES `brew_batches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `vessels` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`vessel_type` text NOT NULL,
	`capacity_litres` real NOT NULL,
	`status` text DEFAULT 'available' NOT NULL,
	`current_batch_id` text,
	`location` text,
	`notes` text,
	`archived` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
