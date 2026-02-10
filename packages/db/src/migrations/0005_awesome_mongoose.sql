ALTER TABLE `users` ADD `role` text DEFAULT 'brewer' NOT NULL;--> statement-breakpoint
UPDATE `users` SET `role` = 'admin' WHERE `role` = 'brewer';