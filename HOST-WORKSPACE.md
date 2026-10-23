# NextRole host workspace

Current admin experience: `/admin` is a separate analytics workspace. The owner lands there on sign-in. See [Admin analytics](handoff/ADMIN-ANALYTICS.md) for the current metrics, active-time instrumentation, PDF reports and synthetic-only portfolio mode. The detailed historical behavior below remains background where it does not conflict with that guide; Apply feedback popups are no longer automatic.

The existing ChatGPT sign-in assigns roles on the server. The account matching the configured, verified NEXTROLE_OWNER_EMAIL is the host. It opens Host workspace on a fresh visit and can still use its personal job workspace. Every other account is a student. No user-supplied role, email or account ID can grant host access. Both host API operations check identity independently of visible navigation.

## Student experience

- Apply remains a normal external link. It opens the employer page immediately and offers an optional 1–5 smiley rating with an improvement comment in NextRole. Skip is always available. Opening Apply or submitting feedback never marks a vacancy Applied.
- Every new Apply click has its own feedback context. Submission retries are idempotent. A repeated click may produce another voluntary response, so ratings are response-based and self-selected.
- Help & feedback is available from navigation and Preferences, including during unfinished onboarding. Students can submit help queries or ideas, read their own submissions and see host replies. They cannot see another account's messages.
- From the calendar month after onboarding, a survey is offered on the next active visit. It asks what to improve, what is needed next and what difficulties exist, with an optional experience rating. Skip suppresses it for that calendar month. The server assigns the current IST period and accepts one response per student/month. A student who does not visit is not contacted separately.
- Unsent help drafts stay in the current browser tab; the existing account-scoped sign-out and deletion cleanup removes them.

## Product signals and definitions

| Metric | Definition and limit |
| --- | --- |
| DAU / WAU / MAU | Distinct analytics participants observed today / in the last 7 / last 30 IST calendar days. |
| Feature adoption | Action count and unique participants in the selected 7/30/90-day window. Adoption divides by recorded active participants in that same window. Search text and filter values are excluded. |
| Onboarding completion | Newly observed, unfinished profiles that complete onboarding, divided by those eligible first-observed profiles in the window. Previously completed profiles are excluded. |
| Day-7 return | Participants in mature first-observed cohorts who return exactly seven calendar days later. A cohort needs seven days of follow-up. This is observed return, not verified campus retention. |
| Apply / Applied | Browser-reported Apply link clicks versus server-recorded transitions to Applied. They are separate totals, not a submission-conversion funnel. Editing notes/stages does not create another Applied action. |
| Apply experience | Average voluntary Apply rating and the fraction rated 4 or 5. Multiple responses per student are possible. These do not measure an employer's hiring process. |
| Prompt views / skips | Consenting participants' viewed/skipped Apply prompts; viewed is recorded when the page is visible. Feedback totals include opt-outs, so no mixed-population response-conversion rate is claimed. |
| Voice themes | Open feedback grouped by the area students selected; the host can set priority and new/reviewing/planned/resolved status. These are categories, not AI-generated themes. |
| Support timing | Average first host reply and resolution time for help requests created in the selected window, among requests having the respective timestamp. Editing a reply preserves its first-response timestamp. |

The host sees metric JSON export and exact daily count tables. No historical activity is fabricated. Existing completed accounts can enter activity/return cohorts after first observation but do not enter the new-onboarding denominator. Owner activity is excluded. Opt-out/deletion can alter historical metrics. Browser reports and best-effort telemetry can be missed; counts describe recorded activity.

## Host inbox and operations

The inbox covers all retained feedback independently of the metric date range. It supports type, status, area and literal text search, with 25-item pages. Only submitted feedback and replies are exposed; neither account emails nor another student's private application notes, keys or individual event log are returned. Replies stay in the application; this release sends no support email or push messages.

Operations shows source timestamps/health, active delivery backlog/failures, alert completion, expired analytics cleanup status and live record counts. Counts are not storage bytes, billed requests, CPU time or D1 rows read/written. Review actual provider monitoring, budgets, backups and staged load tests before expanding the cohort.

## Privacy and maintenance

Usage analytics records first-party feature actions linked to the signed-in account and server dates. It stores no API key, name, account email, search query, note, profile text or arbitrary client event metadata. It uses no LLM/provider calls or third-party analytics SDK.

Students can disable analytics. Doing so removes their usage events and cohort record and prevents subsequent collection; voluntary feedback remains separately visible to its author and host. Workspace export includes their feedback/replies, grouped usage and analytics preference. Clearing removes their feedback and usage, and preserves only a minimal disabled-analytics preference so late requests cannot restart collection.

Events expire after 90 days and inactive cohort records after 180 days through bounded maintenance. Each cleanup deletes at most 500 events/cohorts and reports pending work. Owner MCP refreshes include that pending flag in workPending, so the existing resumable updater continues without a new scheduler. Submitted feedback is retained until its author clears the workspace.

Additive migrations 0004–0006 add indexed tables without changing existing student job choices, notes, provider connections or application history. No test fixtures are deployed. Real browser/accessibility, actual hosting billing and production concurrency remain separate rollout checks.
