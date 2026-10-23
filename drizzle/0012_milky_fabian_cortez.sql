CREATE TABLE `automation_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`job_key` text NOT NULL,
	`state` text NOT NULL,
	`data` text NOT NULL,
	`revision` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `automation_queue_person_state_idx` ON `automation_queue` (`user_id`,`state`,`created_at`);--> statement-breakpoint
CREATE INDEX `automation_queue_person_job_idx` ON `automation_queue` (`user_id`,`job_key`);--> statement-breakpoint
CREATE TABLE `automation_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`revision` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `automation_tokens` (
	`user_id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `automation_tokens_hash_idx` ON `automation_tokens` (`token_hash`);--> statement-breakpoint
CREATE TABLE `resume_files` (
	`user_id` text NOT NULL,
	`id` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`content_type` text NOT NULL,
	`bytes` integer NOT NULL,
	`sha256` text NOT NULL,
	`object_key` text NOT NULL,
	`data` text NOT NULL,
	`revision` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `id`)
);
--> statement-breakpoint
CREATE INDEX `resume_files_user_time_idx` ON `resume_files` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `scout_threads` (
	`user_id` text NOT NULL,
	`job_key` text NOT NULL,
	`data` text NOT NULL,
	`revision` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `job_key`)
);
--> statement-breakpoint
CREATE INDEX `scout_threads_person_time_idx` ON `scout_threads` (`user_id`,`updated_at`);