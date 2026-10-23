CREATE TABLE `catalogue_snapshots` (
	`user_id` text PRIMARY KEY NOT NULL,
	`id` text NOT NULL,
	`query_hash` text NOT NULL,
	`generation` text NOT NULL,
	`data` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `catalogue_snapshots_expiry_idx` ON `catalogue_snapshots` (`expires_at`);--> statement-breakpoint
CREATE TABLE `source_run_history` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`provider` text NOT NULL,
	`checked_at` text NOT NULL,
	`outcome` text NOT NULL,
	`fetched` integer DEFAULT 0 NOT NULL,
	`unique_count` integer DEFAULT 0 NOT NULL,
	`new_jobs` integer DEFAULT 0 NOT NULL,
	`closed` integer DEFAULT 0 NOT NULL,
	`incomplete` integer DEFAULT 0 NOT NULL,
	`duration_ms` integer NOT NULL,
	`error_code` text
);
--> statement-breakpoint
CREATE INDEX `source_run_history_time_idx` ON `source_run_history` (`checked_at`);--> statement-breakpoint
CREATE INDEX `source_run_history_source_time_idx` ON `source_run_history` (`source_id`,`checked_at`);--> statement-breakpoint
CREATE TABLE `user_catalogue_versions` (
	`user_id` text PRIMARY KEY NOT NULL,
	`revision` text NOT NULL
);
