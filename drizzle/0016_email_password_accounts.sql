CREATE TABLE `email_accounts` (
	`email` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`password_hash` text NOT NULL,
	`user_data` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_accounts_user_id_unique` ON `email_accounts` (`user_id`);