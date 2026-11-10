import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core';
export const profiles = sqliteTable('profiles', {
  userId: text('user_id').primaryKey(), data: text('data').notNull(), createdAt: text('created_at').notNull(), updatedAt: text('updated_at').notNull(),
});
export const jobs = sqliteTable('jobs', {
  id: text('id').primaryKey(), jobKey: text('job_key').notNull(), sourceId: text('source_id').notNull(), data: text('data').notNull(), canonicalUrl:text('canonical_url'), firstSeen:text('first_seen').notNull(), lastChecked:text('last_checked').notNull(), feedCheckedAt:text('feed_checked_at').notNull().default(''), active:integer('active').notNull().default(1),
}, t=>[index('jobs_key_idx').on(t.jobKey),index('jobs_source_idx').on(t.sourceId),index('jobs_active_idx').on(t.active),index('jobs_canonical_url_idx').on(t.canonicalUrl),index('jobs_representative_idx').on(t.jobKey,t.active,t.lastChecked)]);
export const userJobs=sqliteTable('user_jobs',{
  userId:text('user_id').notNull(),jobKey:text('job_key').notNull(),jobId:text('job_id').notNull(),status:text('status').notNull(),stage:text('stage'),note:text('note').notNull().default(''),remindAt:text('remind_at'),updatedAt:text('updated_at').notNull(),
},t=>[primaryKey({columns:[t.userId,t.jobKey]}),index('user_jobs_status_idx').on(t.status,t.jobKey)]);
export const notifications=sqliteTable('notifications',{
  id:text('id').primaryKey(),userId:text('user_id').notNull(),jobKey:text('job_key'),title:text('title').notNull(),body:text('body').notNull(),type:text('type').notNull(),createdAt:text('created_at').notNull(),readAt:text('read_at'),pushPending:integer('push_pending').notNull().default(0),
},t=>[index('notifications_user_idx').on(t.userId),index('notifications_feed_idx').on(t.userId,t.createdAt),index('notifications_seen_idx').on(t.userId,t.type,t.jobKey)]);
export const sourceRuns=sqliteTable('source_runs',{
  id:text('id').primaryKey(),checkedAt:text('checked_at').notNull(),success:integer('success').notNull(),count:integer('count').notNull(),error:text('error'),
});
export const subscriptions=sqliteTable('subscriptions',{
  endpoint:text('endpoint').primaryKey(),userId:text('user_id').notNull(),data:text('data').notNull(),createdAt:text('created_at').notNull(),
},t=>[index('subscriptions_user_idx').on(t.userId)]);
export const pushOutbox=sqliteTable('push_outbox',{
 userId:text('user_id').primaryKey(),revision:text('revision').notNull(),attempts:integer('attempts').notNull().default(0),availableAt:text('available_at').notNull(),createdAt:text('created_at').notNull(),state:text('state').notNull().default('pending'),
},t=>[index('push_outbox_due_idx').on(t.state,t.availableAt)]);
export const meta=sqliteTable('meta',{key:text('key').primaryKey(),value:text('value').notNull()});
export const analyses=sqliteTable('analyses',{
  id:text('id').primaryKey(),userId:text('user_id').notNull(),jobKey:text('job_key').notNull(),data:text('data').notNull(),createdAt:text('created_at').notNull(),
},t=>[index('analyses_user_created_idx').on(t.userId,t.createdAt),index('analyses_expiry_idx').on(t.createdAt)]);
export const apiSlots=sqliteTable('api_slots',{
 userId:text('user_id').notNull(),slot:integer('slot').notNull(),provider:text('provider').notNull(),model:text('model').notNull(),label:text('label').notNull(),ciphertext:text('ciphertext').notNull(),fingerprint:text('fingerprint').notNull(),lastFour:text('last_four').notNull(),enabled:integer('enabled').notNull().default(1),status:text('status').notNull().default('untested'),message:text('message').notNull().default('Saved. Not used yet.'),cooldownUntil:text('cooldown_until'),updatedAt:text('updated_at').notNull(),
},t=>[primaryKey({columns:[t.userId,t.slot]})]);
export const aiSettings=sqliteTable('ai_settings',{
 userId:text('user_id').primaryKey(),autoFallback:integer('auto_fallback').notNull().default(1),dailyLimit:integer('daily_limit').notNull().default(20),updatedAt:text('updated_at').notNull(),
});

export const productPeople=sqliteTable('product_people',{
 userId:text('user_id').primaryKey(),firstSeen:text('first_seen').notNull(),lastSeen:text('last_seen').notNull(),firstDay:text('first_day').notNull(),initialCompleted:integer('initial_completed').notNull().default(0),
},t=>[index('product_people_first_idx').on(t.firstDay),index('product_people_last_idx').on(t.lastSeen)]);
export const productEvents=sqliteTable('product_events',{
 id:text('id').primaryKey(),userId:text('user_id').notNull(),kind:text('kind').notNull(),day:text('day').notNull(),createdAt:text('created_at').notNull(),
},t=>[index('product_events_day_idx').on(t.day,t.kind),index('product_events_kind_day_idx').on(t.kind,t.day),index('product_events_person_idx').on(t.userId,t.day)]);
export const productActivityMinutes=sqliteTable('product_activity_minutes',{
 userId:text('user_id').notNull(),minute:integer('minute').notNull(),day:text('day').notNull(),section:text('section').notNull(),seconds:integer('seconds').notNull(),
},t=>[primaryKey({columns:[t.userId,t.minute]}),index('product_activity_minutes_expiry_idx').on(t.minute)]);
export const productActivityDays=sqliteTable('product_activity_days',{
 userId:text('user_id').notNull(),day:text('day').notNull(),section:text('section').notNull(),seconds:integer('seconds').notNull().default(0),
},t=>[primaryKey({columns:[t.userId,t.day,t.section]}),index('product_activity_days_day_idx').on(t.day)]);
export const engagementSettings=sqliteTable('engagement_settings',{
 userId:text('user_id').primaryKey(),analyticsEnabled:integer('analytics_enabled').notNull().default(1),surveyMonth:text('survey_month').notNull().default(''),updatedAt:text('updated_at').notNull(),
});
export const feedback=sqliteTable('feedback',{
 id:text('id').primaryKey(),userId:text('user_id').notNull(),kind:text('kind').notNull(),contextId:text('context_id').notNull(),jobId:text('job_id'),rating:integer('rating'),category:text('category').notNull(),subject:text('subject').notNull(),message:text('message').notNull(),needs:text('needs').notNull().default(''),difficulty:text('difficulty').notNull().default(''),period:text('period'),status:text('status').notNull().default('new'),priority:text('priority').notNull().default('normal'),reply:text('reply').notNull().default(''),repliedAt:text('replied_at'),replyReadAt:text('reply_read_at'),resolvedAt:text('resolved_at'),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
},t=>[index('feedback_person_idx').on(t.userId,t.createdAt),index('feedback_inbox_idx').on(t.status,t.createdAt),index('feedback_kind_idx').on(t.kind,t.createdAt),index('feedback_created_idx').on(t.createdAt)]);

export const importedJobs=sqliteTable('imported_jobs',{
 userId:text('user_id').notNull(),id:text('id').notNull(),jobKey:text('job_key').notNull(),data:text('data').notNull(),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
},t=>[primaryKey({columns:[t.userId,t.id]}),index('imported_jobs_person_key_idx').on(t.userId,t.jobKey)]);
export const careerProfiles=sqliteTable('career_profiles',{
 userId:text('user_id').primaryKey(),data:text('data').notNull(),revision:text('revision').notNull(),updatedAt:text('updated_at').notNull(),
});
export const applicationKits=sqliteTable('application_kits',{
 userId:text('user_id').notNull(),id:text('id').notNull(),jobKey:text('job_key').notNull(),data:text('data').notNull(),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
},t=>[primaryKey({columns:[t.userId,t.id]}),index('application_kits_person_job_idx').on(t.userId,t.jobKey,t.createdAt)]);

export const catalogueSnapshots=sqliteTable('catalogue_snapshots',{
 userId:text('user_id').primaryKey(),id:text('id').notNull(),queryHash:text('query_hash').notNull(),generation:text('generation').notNull(),data:text('data').notNull(),expiresAt:text('expires_at').notNull(),createdAt:text('created_at').notNull(),
},t=>[index('catalogue_snapshots_expiry_idx').on(t.expiresAt)]);
export const userCatalogueVersions=sqliteTable('user_catalogue_versions',{
 userId:text('user_id').primaryKey(),revision:text('revision').notNull(),
});
export const sourceRunHistory=sqliteTable('source_run_history',{
 id:text('id').primaryKey(),sourceId:text('source_id').notNull(),provider:text('provider').notNull(),checkedAt:text('checked_at').notNull(),outcome:text('outcome').notNull(),fetched:integer('fetched').notNull().default(0),unique:integer('unique_count').notNull().default(0),newJobs:integer('new_jobs').notNull().default(0),closed:integer('closed').notNull().default(0),incomplete:integer('incomplete').notNull().default(0),durationMs:integer('duration_ms').notNull(),errorCode:text('error_code'),
},t=>[index('source_run_history_time_idx').on(t.checkedAt),index('source_run_history_source_time_idx').on(t.sourceId,t.checkedAt)]);

export const applicationRecords=sqliteTable('application_records',{
 userId:text('user_id').notNull(),jobKey:text('job_key').notNull(),jobId:text('job_id').notNull(),data:text('data').notNull(),revision:text('revision').notNull(),updatedAt:text('updated_at').notNull(),
},t=>[primaryKey({columns:[t.userId,t.jobKey]})]);
export const applicationEvents=sqliteTable('application_events',{
 id:text('id').primaryKey(),userId:text('user_id').notNull(),jobKey:text('job_key').notNull(),kind:text('kind').notNull(),data:text('data').notNull(),createdAt:text('created_at').notNull(),
},t=>[index('application_events_person_job_idx').on(t.userId,t.jobKey,t.createdAt)]);
export const digestSettings=sqliteTable('digest_settings',{
 userId:text('user_id').primaryKey(),email:text('email').notNull(),enabled:integer('enabled').notNull().default(0),revision:text('revision').notNull(),unsubscribeToken:text('unsubscribe_token').notNull(),lastSentAt:text('last_sent_at'),updatedAt:text('updated_at').notNull(),
},t=>[index('digest_settings_unsubscribe_idx').on(t.unsubscribeToken)]);
export const digestOutbox=sqliteTable('digest_outbox',{
 userId:text('user_id').notNull(),day:text('day').notNull(),revision:text('revision').notNull(),state:text('state').notNull(),data:text('data').notNull(),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
},t=>[primaryKey({columns:[t.userId,t.day]}),index('digest_outbox_state_idx').on(t.state,t.updatedAt)]);

export const resumeFiles=sqliteTable('resume_files',{
 userId:text('user_id').notNull(),id:text('id').notNull(),name:text('name').notNull(),role:text('role').notNull(),contentType:text('content_type').notNull(),bytes:integer('bytes').notNull(),sha256:text('sha256').notNull(),objectKey:text('object_key').notNull(),data:text('data').notNull(),revision:text('revision').notNull(),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
},t=>[primaryKey({columns:[t.userId,t.id]}),index('resume_files_user_time_idx').on(t.userId,t.createdAt)]);
export const scoutThreads=sqliteTable('scout_threads',{
 userId:text('user_id').notNull(),jobKey:text('job_key').notNull(),data:text('data').notNull(),revision:text('revision').notNull(),updatedAt:text('updated_at').notNull(),
},t=>[primaryKey({columns:[t.userId,t.jobKey]}),index('scout_threads_person_time_idx').on(t.userId,t.updatedAt)]);
export const automationSettings=sqliteTable('automation_settings',{
 userId:text('user_id').primaryKey(),data:text('data').notNull(),revision:text('revision').notNull(),updatedAt:text('updated_at').notNull(),
});
export const automationTokens=sqliteTable('automation_tokens',{
 userId:text('user_id').primaryKey(),tokenHash:text('token_hash').notNull(),expiresAt:text('expires_at').notNull(),createdAt:text('created_at').notNull(),
},t=>[index('automation_tokens_hash_idx').on(t.tokenHash)]);
export const automationQueue=sqliteTable('automation_queue',{
 id:text('id').primaryKey(),userId:text('user_id').notNull(),jobKey:text('job_key').notNull(),state:text('state').notNull(),data:text('data').notNull(),revision:text('revision').notNull(),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
},t=>[index('automation_queue_person_state_idx').on(t.userId,t.state,t.createdAt),index('automation_queue_person_job_idx').on(t.userId,t.jobKey)]);

export const applicationIntents=sqliteTable('application_intents',{
 userId:text('user_id').notNull(),jobKey:text('job_key').notNull(),jobId:text('job_id').notNull(),openedAt:text('opened_at').notNull(),dismissedAt:text('dismissed_at'),
},t=>[primaryKey({columns:[t.userId,t.jobKey]}),index('application_intents_person_time_idx').on(t.userId,t.openedAt)]);
export const googleAccounts=sqliteTable('google_accounts',{
 subjectHash:text('subject_hash').primaryKey(),userId:text('user_id').notNull().unique(),userData:text('user_data').notNull(),linkedAt:text('linked_at').notNull(),
});
