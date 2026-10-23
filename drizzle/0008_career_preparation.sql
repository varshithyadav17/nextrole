CREATE TABLE `application_kits` (
	`user_id` text NOT NULL,
	`id` text NOT NULL,
	`job_key` text NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `id`)
);
--> statement-breakpoint
CREATE INDEX `application_kits_person_job_idx` ON `application_kits` (`user_id`,`job_key`,`created_at`);--> statement-breakpoint
CREATE TABLE `career_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`revision` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `imported_jobs` (
	`user_id` text NOT NULL,
	`id` text NOT NULL,
	`job_key` text NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `id`)
);
--> statement-breakpoint
CREATE INDEX `imported_jobs_person_key_idx` ON `imported_jobs` (`user_id`,`job_key`);