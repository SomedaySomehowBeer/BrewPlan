CREATE UNIQUE INDEX `orders_invoice_number_unique` ON `orders` (`invoice_number`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_brew_ingredient_consumptions` (
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
	FOREIGN KEY (`brew_batch_id`) REFERENCES `brew_batches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`inventory_lot_id`) REFERENCES `inventory_lots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_brew_ingredient_consumptions`("id", "brew_batch_id", "recipe_ingredient_id", "inventory_lot_id", "planned_quantity", "actual_quantity", "unit", "usage_stage", "notes", "created_at") SELECT "id", "brew_batch_id", "recipe_ingredient_id", "inventory_lot_id", "planned_quantity", "actual_quantity", "unit", "usage_stage", "notes", "created_at" FROM `brew_ingredient_consumptions`;--> statement-breakpoint
DROP TABLE `brew_ingredient_consumptions`;--> statement-breakpoint
ALTER TABLE `__new_brew_ingredient_consumptions` RENAME TO `brew_ingredient_consumptions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;