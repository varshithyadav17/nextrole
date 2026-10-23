CREATE TABLE `engagement_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`analytics_enabled` integer DEFAULT 1 NOT NULL,
	`survey_month` text DEFAULT '' NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`context_id` text NOT NULL,
	`job_id` text,
	`rating` integer,
	`category` text NOT NULL,
	`subject` text NOT NULL,
	`message` text NOT NULL,
	`needs` text DEFAULT '' NOT NULL,
	`difficulty` text DEFAULT '' NOT NULL,
	`period` text,
	`status` text DEFAULT 'new' NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`reply` text DEFAULT '' NOT NULL,
	`replied_at` text,
	`reply_read_at` text,
	`resolved_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `feedback_person_idx` ON `feedback` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `feedback_inbox_idx` ON `feedback` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `feedback_kind_idx` ON `feedback` (`kind`,`created_at`);--> statement-breakpoint
CREATE TABLE `product_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`day` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `product_events_day_idx` ON `product_events` (`day`,`kind`);--> statement-breakpoint
CREATE INDEX `product_events_person_idx` ON `product_events` (`user_id`,`day`);--> statement-breakpoint
CREATE TABLE `product_people` (
	`user_id` text PRIMARY KEY NOT NULL,
	`first_seen` text NOT NULL,
	`last_seen` text NOT NULL,
	`first_day` text NOT NULL,
	`initial_completed` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `product_people_first_idx` ON `product_people` (`first_day`);