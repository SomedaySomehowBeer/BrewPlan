CREATE TABLE `batch_measurement_log` (
	`id` text PRIMARY KEY NOT NULL,
	`brew_batch_id` text NOT NULL,
	`logged_at` text NOT NULL,
	`og` real,
	`fg` real,
	`volume_litres` real,
	`ibu` real,
	`notes` text,
	`logged_by` text,
	FOREIGN KEY (`brew_batch_id`) REFERENCES `brew_batches`(`id`) ON UPDATE no action ON DELETE no action
);
