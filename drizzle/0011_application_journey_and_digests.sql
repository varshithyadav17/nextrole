CREATE TABLE `application_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`job_key` text NOT NULL,
	`kind` text NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `application_events_person_job_idx` ON `application_events` (`user_id`,`job_key`,`created_at`);--> statement-breakpoint
CREATE TABLE `application_records` (
	`user_id` text NOT NULL,
	`job_key` text NOT NULL,
	`job_id` text NOT NULL,
	`data` text NOT NULL,
	`revision` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `job_key`)
);
--> statement-breakpoint
CREATE TABLE `digest_outbox` (
	`user_id` text NOT NULL,
	`day` text NOT NULL,
	`revision` text NOT NULL,
	`state` text NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `day`)
);
--> statement-breakpoint
CREATE INDEX `digest_outbox_state_idx` ON `digest_outbox` (`state`,`updated_at`);--> statement-breakpoint
CREATE TABLE `digest_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`enabled` integer DEFAULT 0 NOT NULL,
	`revision` text NOT NULL,
	`unsubscribe_token` text NOT NULL,
	`last_sent_at` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `digest_settings_unsubscribe_idx` ON `digest_settings` (`unsubscribe_token`);