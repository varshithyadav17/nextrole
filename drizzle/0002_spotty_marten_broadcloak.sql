CREATE TABLE `push_outbox` (
	`user_id` text PRIMARY KEY NOT NULL,
	`revision` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`available_at` text NOT NULL,
	`created_at` text NOT NULL,
	`state` text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `push_outbox_due_idx` ON `push_outbox` (`state`,`available_at`);--> statement-breakpoint
ALTER TABLE `notifications` ADD `push_pending` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `notifications_feed_idx` ON `notifications` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `notifications_seen_idx` ON `notifications` (`user_id`,`type`,`job_key`);--> statement-breakpoint
CREATE INDEX `analyses_user_created_idx` ON `analyses` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `jobs_active_idx` ON `jobs` (`active`);--> statement-breakpoint
CREATE INDEX `subscriptions_user_idx` ON `subscriptions` (`user_id`);