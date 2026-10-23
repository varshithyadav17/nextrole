# NextRole source refresh

The public app's unattended writer is an owner-authorized Site MCP connection. It does not use student API keys or LLM calls.

The configured catalogue now contains 21 Greenhouse, Lever and Ashby boards plus one Jobicy public job-board source in this release. Zeta was appended after the retained Jobicy entry without changing prior IDs/order. Source progress is registry-derived; append new boards without reordering existing entries so saved cursors continue safely. Lever pagination and Ashby listed-only filtering are handled in lib/job-feeds.ts. LinkedIn, Unstop and company-web searches are external navigation and are not part of unattended import. Explicit companion JobPosting capture creates a private unverified import. See SOURCE-COVERAGE.md.

The linked schedule retains 09:00, 14:00 and 19:00 Asia/Kolkata. Use the existing linked automation; do not create another.

## Supported writer

1. Obtain the linked Site's MCP connection using the native Site metadata. The provisioned NextRole plugin must be installed and connected by the owner.
2. Call nextrole_refresh_sources with no arguments. Each invocation advances at most two employer feeds, one checkpointed Jobicy feed/status step, or bounded saved-detail/alert/delivery work after the source sweep completes. The response includes workPending.
3. While workPending is true, call nextrole_refresh_sources again, up to 120 invocations in one scheduled run. If busy, wait briefly before retrying. Do not restart a sweep or redeploy to clear work. Delayed push retries become eligible at a later check.
4. Call nextrole_refresh_status with no arguments. Verify lastSync, activeListings, sourceProgress, source health and delivery backlog. Results contain no student profiles or API credentials. Notify the owner on source failures, a failed queue item, authentication failure, or a backlog still pending after the run budget.
5. Stay quiet on success. Report an authentication/connection failure to the owner and explain that NextRole needs Connect under Plugins > Personal > Created by you. Do not fall back to identity-free HTTP writes or weaken access controls.

Sites supplies authenticated request identity through the supported plugin. The server checks it against NEXTROLE_OWNER_EMAIL, configured from the verified Site owner. The Site-scoped visitor ID is distinct from access-policy account IDs. Keep the owner binding current if ownership changes.

Before the connection has been exercised, the UI shows scheduled setup as pending. A successful authenticated refresh marks the connection active. Saving an enabled schedule does not establish that a connected tool call or a scheduled execution succeeded.

## Preservation and delivery

A source outage preserves existing jobs. Applied, Interested, Not interested, notes and stages remain user-scoped. Published deadlines are never generated from guesses. Saved-job reminders are processed at the next daily check; exact-minute delivery is not promised.

The public /api/maintenance endpoint rejects missing identity and non-owner callers. The old bearer-bypass updater script is retired. Never expose maintenance or schedule control to anonymous visitors.

## Personal AI keys

KEYRING_ENCRYPTION_KEY is the independent AES encryption root. Keep it stable and secret across deploys; database ciphertext alone is insufficient to restore keys without it. Student keys are encrypted, never returned, never used by background updates and never replaced by an operator/global provider key. Names, account email, application notes and application history stay out of prompts.

The keyword-search API action must remain independent of the AI router even when a student has enabled connections. ChatGPT is account authentication only. Public employer and Jobicy feeds, deterministic matching, tracking and notifications have no provider-credit dependency. Only a requested AI search or fit interpretation may select that authenticated account's enabled keys. Preserve this boundary in future changes; global provider environment variables are not a fallback.

Deleting or replacing a connection stops new use here, but cannot revoke its provider credential or undo an already-sent request. The UI and privacy page explain this.


## Bounded work and recovery

Source checkpoints, the alert cursor and the push outbox live in D1. A killed invocation leaves resumable work. Leases use expiring ownership tokens and are released only by their owner. Notification creation and outbox enqueue are atomic. Browser delivery is best effort; a crash after a provider accepted a message but before acknowledgment can cause a duplicate push. In-app notification IDs remain idempotent.

The worker checks at most four saved details per invocation. Failed detail requests are throttled and do not erase source information. Push workers select up to 25 accounts and stop starting new work after their time budget; no more than six device requests run concurrently. A row retries five times with increasing delay, then remains failed for investigation. New eligible updates can requeue that account. Disabling browser alerts or clearing a workspace removes its pending work.

Daily/minute counters and expired AI cache rows are pruned in bounded batches. The owner should monitor source timestamps, pending and failed deliveries, oldest backlog age, platform errors and actual account quotas/costs. Use the existing linked automation, not an additional scheduler.

## Restore and release precautions

Keep the encryption root stable. A database restore requires the matching root secret to recover saved provider keys. Use the platform-supported database backup/restore controls, validate in an isolated environment, and reconcile source/queue checkpoints afterward. A production restore drill and the hosting account's backup retention are not verified through the current Sites interface.

Apply forward migrations before serving the new bundle. Code rollback after these additive migrations must retain schema compatibility. Do not roll back to React Server DOM Webpack 19.2.6: the 17 October release pins the patched React 19.2.9 line. See READINESS.md for evidence and remaining real-device/production gates.

## Host product monitoring

The existing owner email binding also protects the Host workspace and both host API operations; general users cannot self-select that role. Product metrics exclude host activity and show recorded analytics participants, not every campus student. Help requests and owner replies remain in the app. No support email or push is sent.

Analytics expiry is checkpoint-free idempotent bounded deletion: at most 500 expired event and inactive cohort records per maintenance invocation. Pending cleanup appears in both owner refresh status and the host Operations view, and contributes to workPending so the linked updater resumes it. No additional automation is needed. Alert generation, student application state and provider-key use are unchanged. Review actual hosting/D1 billing, storage, CPU, backups and staged production load separately from the app’s record counts.

## Jobicy source checkpoints

The review build uses a separate persisted Jobicy traversal alongside the existing source-sweep checkpoint. New traversals are at most hourly, including shared student refreshes; cursors resume unchanged and expire at the provider after 24 hours. A page and its continuation commit atomically. Each new page is status checked; older imports are status checked in resumable 100-ID batches. Do not apply employer-board absent-row closure to this seven-day feed. Deferred/rate-limited or invalid responses mark source health unavailable and preserve records. Report these failures to the owner; do not loop before Retry-After, clear checkpoints, force a sweep or weaken owner authentication. Delayed source retries resume in a later normal sweep. See JOBICY-DISCOVERY.md.

## Scout and nightly delivery

See handoff/SCOUT-COMPANION.md for scoped tokens, exact-file receipts, conservative form boundaries and recovery. Owner status and Host Operations expose aggregate R2/queue/email readiness only. New uploaded/chat/private queue data is included in user deletion; original files are separate downloads. Preserve legacy application document bytes.

See handoff/EMAIL-ACTIVATION.md for the separate nightly task and sender prerequisites. It must remain inactive without a verified sender/key, regardless of a saved schedule. Source maintenance never submits applications or uses student API keys. No local process is a production scheduler.
