# Scout Companion 0.3 — discovery and distribution handoff

Purpose: reduce repeated job-board browsing by delivering recent suitable openings from NextRole's connected data sources, then provide the exact job context for résumé preparation and tracking.

## Normal installation

NextRole `/extension` now uses the Chrome Web Store as the normal distribution route. `lib/companion-channel.json` is deliberately unconfigured: no fabricated store ID, review status or install button. Once a real publisher draft exists, register its extension ID, test the signed/stable release, submit for review and only mark `chromeStoreApproved` after approval. Then the website links to the actual listing and Chrome handles its install permissions and updates. Google requires a developer account and registration fee; that account is not available through the installed product tools. See `store/LISTING.md` for the submission draft, permissions and remaining owner steps.

The welcome screen opens once after install. Connect NextRole opens a fixed website origin with a random 256-bit challenge, five-minute expiry and real extension runtime ID. The website accepts only the publisher-configured ID, requires the signed-in user's explicit discovery/workspace consent, and transfers a newly scoped 30-day token directly to that extension. The receiving worker requires the exact NextRole origin/path and the pending one-use challenge. Concurrent/replayed/expired challenges are rejected. No query-string credential, arbitrary extension ID or Site bypass token is accepted. Reconnecting replaces an old token and pauses checks/application assistance. Advanced developer token pairing remains available for intentional unpacked tests before store registration.

## Discovery and alerts

- `/api/companion` action `matched-jobs` requires explicit fresh `COMPANION_DISCOVERY` consent, bound to the exact current token hash. `COMPANION_WORKSPACE` and older tokens remain limited. The existing scope metadata row encodes the grant; revoke/workspace/career deletion already removes it. No DB migration.
- Reads at most 61 recent match-alert rows per account, from the last 30 days, using existing indexes. Shared sources and alert generation run centrally; the browser cannot trigger source refresh, use an AI key or query another student's alerts.
- Current employer record, title/JD experience evidence, graduation, location, other supported eligibility, freshness and tracking are re-evaluated. Closed, expired, stale, unknown, uncertain and already Interested/Applied/Not interested jobs are excluded. Only narrow job summaries/reasons/source health are returned; no notes, résumé facts, full profile or credentials.
- Up to 30 jobs are shown. It is a recent alert inbox, not exhaustive catalogue search; full workspace link is always visible. Source refresh time and failures are explicit. Job alerts turned off in the website suppress the extension inbox.
- Opt-in browser checks run about every 15 minutes. The initial baseline is quiet. Optional notifications require a user-gesture browser permission request and show a generic count. Known keys prevent repeated notifications, including after browser restart. Cached summaries and up to 2,000 known keys are local, trusted-context storage. Disconnect/re-pair resets them.
- Transient failures preserve a labelled previous check and back off to six hours maximum. Revoked authentication pauses checks and clears matches. A late response after pause/token replacement is ignored. Chrome/device notifications and alarms can be delayed; checks stop when the browser is closed. Website push and nightly mail have separate host setup/student opt-ins.

## Platform coverage limit

The extension does not supply an unrestricted LinkedIn, Unstop or Internshala job feed. LinkedIn explicitly prohibits scraping/automation browser extensions. Existing original-link plus pasted-JD imports remain available; no scripts are injected on restricted/unknown boards. Automatic coverage beyond connected employer/public sources needs a permitted feed, content permission or a platform agreement. The owner's optional SerpApi integration remains off unless configured/authorized; it is not enabled by installing Scout. No new paid provider, sender, student opt-in or job application is activated by this release.

## Verification

Meaningful isolated tests cover the current server endpoint, legacy/new consent, account separation, strict experience/batch/freshness/tracking filters, notification deduplication, denied permission, outages/backoff, pause/replacement races, revocation and simultaneous one-use connections. Actual shipped developer and store ZIPs are checked for manifest, version, dependency/icon integrity and byte equivalence. The real generated Vercel auth/proxy handlers, app types and both production builds are checked before publication.

The public website is browser-previewed. This does not verify an installed extension, actual OS notification permission prompts, native sidePanel lifecycle or live companion-to-backend transport. Previous automated public requests to the native service returned 403/error 1010. That permission/access boundary has not been weakened or worked around. Store registration, the real ID, native service reachability and real Chrome/Edge tests remain release gates. No employer application was submitted for testing.

Rebuild icons: `node scripts/prepare-companion-icons.mjs` (renders the existing product SVG).
Rebuild distributions: `python scripts/package-companion.py`.
Store upload artifact: `handoff/store/Scout-Companion-Store.zip` (runtime only).
Developer artifact: `public/downloads/Scout-Companion.zip` (includes the offline developer manual).
