CREATE INDEX `jobs_representative_idx` ON `jobs` (`job_key`,`active`,`last_checked`);
--> statement-breakpoint
CREATE TRIGGER jobs_catalogue_insert AFTER INSERT ON jobs BEGIN
 INSERT INTO meta(key,value) VALUES('catalogue_revision','1') ON CONFLICT(key) DO UPDATE SET value=CAST(meta.value AS INTEGER)+1;
END;
--> statement-breakpoint
CREATE TRIGGER jobs_catalogue_update AFTER UPDATE ON jobs BEGIN
 INSERT INTO meta(key,value) VALUES('catalogue_revision','1') ON CONFLICT(key) DO UPDATE SET value=CAST(meta.value AS INTEGER)+1;
END;
--> statement-breakpoint
CREATE TRIGGER jobs_catalogue_delete AFTER DELETE ON jobs BEGIN
 INSERT INTO meta(key,value) VALUES('catalogue_revision','1') ON CONFLICT(key) DO UPDATE SET value=CAST(meta.value AS INTEGER)+1;
END;
--> statement-breakpoint
CREATE TRIGGER user_jobs_catalogue_insert AFTER INSERT ON user_jobs BEGIN
 INSERT INTO user_catalogue_versions(user_id,revision) VALUES(NEW.user_id,'v-'||lower(hex(randomblob(16)))) ON CONFLICT(user_id) DO UPDATE SET revision=excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER user_jobs_catalogue_update AFTER UPDATE ON user_jobs BEGIN
 INSERT INTO user_catalogue_versions(user_id,revision) VALUES(NEW.user_id,'v-'||lower(hex(randomblob(16)))) ON CONFLICT(user_id) DO UPDATE SET revision=excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER user_jobs_catalogue_delete AFTER DELETE ON user_jobs BEGIN
 INSERT INTO user_catalogue_versions(user_id,revision) VALUES(OLD.user_id,'v-'||lower(hex(randomblob(16)))) ON CONFLICT(user_id) DO UPDATE SET revision=excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER profiles_catalogue_insert AFTER INSERT ON profiles BEGIN
 INSERT INTO user_catalogue_versions(user_id,revision) VALUES(NEW.user_id,'v-'||lower(hex(randomblob(16)))) ON CONFLICT(user_id) DO UPDATE SET revision=excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER profiles_catalogue_update AFTER UPDATE ON profiles BEGIN
 INSERT INTO user_catalogue_versions(user_id,revision) VALUES(NEW.user_id,'v-'||lower(hex(randomblob(16)))) ON CONFLICT(user_id) DO UPDATE SET revision=excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER profiles_catalogue_delete AFTER DELETE ON profiles BEGIN
 INSERT INTO user_catalogue_versions(user_id,revision) VALUES(OLD.user_id,'v-'||lower(hex(randomblob(16)))) ON CONFLICT(user_id) DO UPDATE SET revision=excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER imported_jobs_catalogue_insert AFTER INSERT ON imported_jobs BEGIN
 INSERT INTO user_catalogue_versions(user_id,revision) VALUES(NEW.user_id,'v-'||lower(hex(randomblob(16)))) ON CONFLICT(user_id) DO UPDATE SET revision=excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER imported_jobs_catalogue_update AFTER UPDATE ON imported_jobs BEGIN
 INSERT INTO user_catalogue_versions(user_id,revision) VALUES(NEW.user_id,'v-'||lower(hex(randomblob(16)))) ON CONFLICT(user_id) DO UPDATE SET revision=excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER imported_jobs_catalogue_delete AFTER DELETE ON imported_jobs BEGIN
 INSERT INTO user_catalogue_versions(user_id,revision) VALUES(OLD.user_id,'v-'||lower(hex(randomblob(16)))) ON CONFLICT(user_id) DO UPDATE SET revision=excluded.revision;
END;
--> statement-breakpoint
-- Seed existing v14 workspaces so deletion/recreation cannot reuse an old cache generation.
INSERT INTO user_catalogue_versions(user_id,revision) SELECT user_id,'v-'||lower(hex(randomblob(16))) FROM (SELECT user_id FROM profiles UNION SELECT user_id FROM user_jobs UNION SELECT user_id FROM imported_jobs) WHERE 1 ON CONFLICT(user_id) DO NOTHING;
