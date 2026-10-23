ALTER TABLE `jobs` ADD `feed_checked_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `analyses_expiry_idx` ON `analyses` (`created_at`);--> statement-breakpoint
CREATE INDEX `user_jobs_status_idx` ON `user_jobs` (`status`,`job_key`);
--> statement-breakpoint
UPDATE jobs SET feed_checked_at=last_checked WHERE feed_checked_at='';
