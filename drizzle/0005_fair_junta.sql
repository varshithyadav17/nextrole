CREATE INDEX `feedback_created_idx` ON `feedback` (`created_at`);--> statement-breakpoint
CREATE INDEX `product_events_kind_day_idx` ON `product_events` (`kind`,`day`);