# Scout pilot additions

Before distributing Scout Companion, validate a controlled applicant-owned form in Chrome/Edge: install/pair/revoke, token expiry, exact PDF upload, reviewed questions, validation errors, CAPTCHA/declaration pauses, changed preferences/drafts, daily cap, tab/browser interruption, observed confirmation and no automatic uncertain retry. Inspect keyboard/focus/small-screen flows on actual devices. No live employer applications were submitted during development. Verify the sender/domain and owner's opted-in inbox/unsubscribe before activating nightly mail for students. Inspect private R2 storage, queue/error states, real CPU/D1/R2 usage and approved provider budgets as the cohort grows. Existing rollout guidance follows.

# NextRole campus pilot

The app has a public entry and signed-in personal workspaces. It is a beta; opening the link to everyone does not establish production capacity or human usability validation.

## First cohort

Recruit 10–20 final-year students for one week across two role families. API keys are optional for ordinary discovery/tracking; users who want AI search or fit checks bring their own provider connection. Keep setup optional so key creation does not become a barrier to the product's main value.

Twenty employer boards across Greenhouse, Lever and Ashby are checked as shared sources rather than one LLM job search per student. Companies & roles groups the connected employers and role families. Source coverage is limited and must be assessed against the cohort's actual target roles and cities. Overall vacancy counts are not fresher-eligibility counts.

## AI experience

Three user-owned slots support OpenAI, Gemini and Groq, with ordered fallback on quotas and temporary outages. Provider charges and quotas belong to the user's account; separate keys from one project can share limits. A configurable daily check allowance and per-minute/in-flight protections remain. Free-tier providers are not unlimited services. No operator API key is used when a student runs out.

Keys are encrypted at rest, bound to user and slot, masked in readback and excluded from exports. Provider processing is explained at the decision point. Google free-tier processing may use submitted text for product improvement. Users can replace, pause, remove, reorder or clear connections; actual revocation happens at the provider.

## Release checks

- Two real student accounts: onboarding, isolation, preferences, notes and application tracking.
- Back, Forward, reload, company/role filters, AI Connections navigation and unfinished-edit recovery on actual mobile and desktop browsers.
- Apply opens the employer vacancy without changing status. Applied survives refresh, stays out of AI search and has a lasting correction control.
- Real provider keys: successful requested call, quota outage, selected fallback and all-connections-exhausted behavior. Mock adapter tests alone do not establish live account access.
- Verify the owner's connected MCP status/refresh tools and at least one scheduled execution. Current connection readiness must be visible; do not promise automatic delivery until verified.
- Actual browser push enable/disable and a notification with the app closed. Test the published reminder window and disabled reminders.
- Keyboard, screen reader, focus restoration, 320px reflow, text zoom and rendered contrast. Static source checks are not accessibility certification.
- Public anonymous home/privacy access; anonymous and non-owner rejection on personal and maintenance routes; no leaked API secrets in responses, browser storage or exports.

## Learning goals

Collect students' descriptions of how they currently search and track jobs, and observe a real session with consent. Measure relevance in the first ten recommendations, duplicate/closed vacancy reports, lost tracking choices, source and alert failures, time to first saved job and weekly return use. These are goals for real measurement, not fabricated resume metrics.

## Before a broad promotion

Source, detail and notification processing now use bounded resumable work, an alert cursor, durable push retries and owner-visible backlog counts. The isolated 1,001-profile scenario verifies checkpoint continuation; it is not a production throughput guarantee. Add indexed database pagination as sources grow, monitor actual platform limits and costs, run restore drills and load-test the intended campus concurrency.

The functional suite checks encrypted keys, isolation, error paths and state preservation in isolated D1. It does not prove production performance, successful scheduling, device delivery or human usability.

See READINESS.md for the measured synthetic scenario, security patch, and the remaining browser, provider, device, schedule and restore gates.
