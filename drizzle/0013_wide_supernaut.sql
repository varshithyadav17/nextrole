CREATE TABLE `application_intents` (
	`user_id` text NOT NULL,
	`job_key` text NOT NULL,
	`job_id` text NOT NULL,
	`opened_at` text NOT NULL,
	`dismissed_at` text,
	PRIMARY KEY(`user_id`, `job_key`)
);
--> statement-breakpoint
CREATE INDEX `application_intents_person_time_idx` ON `application_intents` (`user_id`,`opened_at`);