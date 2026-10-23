CREATE TABLE `analyses` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`job_key` text NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`job_key` text NOT NULL,
	`source_id` text NOT NULL,
	`data` text NOT NULL,
	`first_seen` text NOT NULL,
	`last_checked` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `jobs_key_idx` ON `jobs` (`job_key`);--> statement-breakpoint
CREATE INDEX `jobs_source_idx` ON `jobs` (`source_id`);--> statement-breakpoint
CREATE TABLE `meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`job_key` text,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`type` text NOT NULL,
	`created_at` text NOT NULL,
	`read_at` text
);
--> statement-breakpoint
CREATE INDEX `notifications_user_idx` ON `notifications` (`user_id`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `source_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`checked_at` text NOT NULL,
	`success` integer NOT NULL,
	`count` integer NOT NULL,
	`error` text
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`endpoint` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_jobs` (
	`user_id` text NOT NULL,
	`job_key` text NOT NULL,
	`job_id` text NOT NULL,
	`status` text NOT NULL,
	`stage` text,
	`note` text DEFAULT '' NOT NULL,
	`remind_at` text,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `job_key`)
);
