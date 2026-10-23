CREATE TABLE `product_activity_days` (
	`user_id` text NOT NULL,
	`day` text NOT NULL,
	`section` text NOT NULL,
	`seconds` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`user_id`, `day`, `section`)
);
--> statement-breakpoint
CREATE INDEX `product_activity_days_day_idx` ON `product_activity_days` (`day`);--> statement-breakpoint
CREATE TABLE `product_activity_minutes` (
	`user_id` text NOT NULL,
	`minute` integer NOT NULL,
	`day` text NOT NULL,
	`section` text NOT NULL,
	`seconds` integer NOT NULL,
	PRIMARY KEY(`user_id`, `minute`)
);
--> statement-breakpoint
CREATE INDEX `product_activity_minutes_expiry_idx` ON `product_activity_minutes` (`minute`);
--> statement-breakpoint
CREATE TRIGGER `product_activity_insert` AFTER INSERT ON `product_activity_minutes` BEGIN
 INSERT INTO product_activity_days(user_id,day,section,seconds) VALUES(NEW.user_id,NEW.day,NEW.section,NEW.seconds)
 ON CONFLICT(user_id,day,section) DO UPDATE SET seconds=seconds+NEW.seconds;
END;
--> statement-breakpoint
CREATE TRIGGER `product_activity_update` AFTER UPDATE OF seconds ON `product_activity_minutes` WHEN NEW.seconds>OLD.seconds BEGIN
 INSERT INTO product_activity_days(user_id,day,section,seconds) VALUES(NEW.user_id,NEW.day,NEW.section,NEW.seconds-OLD.seconds)
 ON CONFLICT(user_id,day,section) DO UPDATE SET seconds=seconds+NEW.seconds-OLD.seconds;
END;
