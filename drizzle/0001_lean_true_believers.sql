CREATE TABLE `ai_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`auto_fallback` integer DEFAULT 1 NOT NULL,
	`daily_limit` integer DEFAULT 20 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `api_slots` (
	`user_id` text NOT NULL,
	`slot` integer NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`label` text NOT NULL,
	`ciphertext` text NOT NULL,
	`fingerprint` text NOT NULL,
	`last_four` text NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'untested' NOT NULL,
	`message` text DEFAULT 'Saved. Not used yet.' NOT NULL,
	`cooldown_until` text,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `slot`)
);

--> statement-breakpoint
UPDATE meta SET value=json_set(value,'$.enabled',0,'$.transport','owner-mcp-pending') WHERE key='schedule';
