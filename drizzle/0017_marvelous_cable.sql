CREATE TABLE `analytics_import_pages` (
	`import_id` text NOT NULL,
	`page` integer NOT NULL,
	`digest` text NOT NULL,
	`row_count` integer NOT NULL,
	PRIMARY KEY(`import_id`, `page`),
	FOREIGN KEY (`import_id`) REFERENCES `analytics_imports`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `analytics_import_rows` (
	`import_id` text NOT NULL,
	`source_sha` text NOT NULL,
	`sheet` text NOT NULL,
	`row_number` integer NOT NULL,
	`data` text NOT NULL,
	PRIMARY KEY(`import_id`, `source_sha`, `sheet`, `row_number`),
	FOREIGN KEY (`import_id`) REFERENCES `analytics_imports`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `analytics_import_rows_order_idx` ON `analytics_import_rows` (`import_id`,`source_sha`,`sheet`,`row_number`);--> statement-breakpoint
CREATE TABLE `analytics_imports` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`created_at` text NOT NULL,
	`manifest` text NOT NULL,
	`manifest_hash` text NOT NULL,
	`state` text DEFAULT 'pending' NOT NULL,
	`report` text
);
