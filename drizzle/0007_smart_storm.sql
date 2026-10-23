ALTER TABLE `jobs` ADD `canonical_url` text;--> statement-breakpoint
CREATE INDEX `jobs_canonical_url_idx` ON `jobs` (`canonical_url`);