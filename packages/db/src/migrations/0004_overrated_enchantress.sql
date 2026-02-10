CREATE TABLE `recipe_process_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`recipe_id` text NOT NULL,
	`stage` text NOT NULL,
	`instruction` text NOT NULL,
	`duration_minutes` integer,
	`temperature_celsius` real,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `quality_checks` (
	`id` text PRIMARY KEY NOT NULL,
	`brew_batch_id` text NOT NULL,
	`check_type` text NOT NULL,
	`checked_at` text NOT NULL,
	`checked_by` text,
	`ph` real,
	`dissolved_oxygen` real,
	`turbidity` real,
	`colour_srm` real,
	`abv` real,
	`co2_volumes` real,
	`sensory_notes` text,
	`microbiological` text,
	`result` text DEFAULT 'pending' NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`brew_batch_id`) REFERENCES `brew_batches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `brewery_profile` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`logo_url` text,
	`address` text,
	`phone` text,
	`email` text,
	`website` text,
	`abn` text,
	`liquor_licence_number` text,
	`default_currency` text DEFAULT 'AUD' NOT NULL,
	`default_batch_prefix` text DEFAULT 'BP' NOT NULL,
	`default_order_prefix` text DEFAULT 'ORD' NOT NULL,
	`default_po_prefix` text DEFAULT 'PO' NOT NULL,
	`invoice_footer` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
