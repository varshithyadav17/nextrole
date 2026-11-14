# NextRole

**A calmer job search. A measurable product.**

NextRole helps students and early-career candidates discover relevant openings, prepare a truthful résumé with ScoutX, and keep their applications moving. Its separate admin workspace closes the product loop: understand adoption, diagnose drop-offs, listen to students and decide what to improve.

[Open NextRole](https://nextrole-scout.vercel.app) · [Measurement handbook](handoff/ADMIN-ANALYTICS.md) · [Render migration](handoff/RENDER-MIGRATION.md)

## The product problem

Students lose time repeatedly checking career pages, discovering ineligible roles, preparing the same information and remembering what they applied for. A larger feed alone does not solve that problem. NextRole prioritizes clear eligibility evidence, persistent choices and an actionable application workflow.

The product hypothesis is that reliable relevance and a simpler preparation/tracking loop help candidates act on suitable opportunities and return when they need to. That hypothesis needs real pilot evidence; feature availability alone does not prove product-market fit.

## What a student can do

- Set role, location, work arrangement, experience, graduation and supported academic preferences. Explicit conflicts are excluded from the preferred feed; missing evidence stays uncertain.
- Open a complete job page with its source and JD. Save it, dismiss it, or separately confirm Applied. Choices, notes and history survive source refreshes.
- Talk to ScoutX about the current job, attach an original PDF and check résumé/JD compatibility. Review tailored facts, then export PDF and LaTeX using a fixed template.
- Track application milestones, prepare using clearly labelled evidence/practice material, and export personal progress.
- Choose optional alerts, nightly email and feedback. AI calls use the student's explicitly configured providers; shared source discovery does not require student API keys.

Compatibility is an internal estimate, not an employer ATS result. Source coverage is limited to configured feeds and supported discovery/import workflows; the product does not claim access to every job board or universal automatic application submission.

## Employer coverage

Job imports and employer targets are separate. The original supplied list contains 260 distinct employer brands; the directory also includes additional targets. A brand is shown as checked only after its source completes a successful import. Empty personal search results do not hide configured companies.

The shared importer supports India-scoped Google Careers, Amazon Jobs, Microsoft Careers, Greenhouse, Lever, SmartRecruiters, Workday, Oracle career portals, Kula and Trakstar. Other supported adapters remain available for verified employer boards. Provider names alone do not imply that every company on that platform is connected.

Large sources checkpoint public job IDs and resume in bounded batches. Descriptions, explicit eligibility and employer URLs are retained. Failed, incomplete and rate-limited reads preserve existing jobs and students' Saved, Applied, Not interested, notes and history. Search windows never prove closure by absence.

- [Complete requested-company source map](handoff/REQUESTED-COMPANY-COVERAGE.csv)
- [Import scope, source evidence and remaining gaps](handoff/EMPLOYER-COVERAGE.md)
- [Source import audit — 14 November 2026](handoff/SOURCE-IMPORT-AUDIT-2026-11-14.md)
- [Actual status for all 260 requested companies](handoff/REQUESTED-COMPANY-STATUS-2026-11-14.csv)

## Admin intelligence

The host opens a dedicated `/admin` experience instead of a personal job feed. Six views connect behavior, feedback and reliability.

| View | What the team learns | Decision it supports |
| --- | --- | --- |
| Overview | Active reach, application action, exact Day-7 return, active-time estimate, onboarding and checked application records | Is the core loop producing useful action? |
| Retention | Mature return cohorts, Day-1/7/30 return, active-day frequency and inactivity after 1 / 2–3 / 4+ active days | Where does momentum fade? |
| Feature adoption | Unique participants, adoption, actions per user, complete-period comparisons and time by section | Which features deserve improvement or simplification? |
| Application journey | Ordered participant visit → job view → Apply open → Marked Applied; current tracked stages | Where should the workflow be investigated? |
| Feedback & help | Voluntary ratings, selected feedback categories, monthly needs, inbox triage and reply/resolution timing | What do students say is getting in their way? |
| Operations | Source health, refresh age, delivery backlog, email readiness, retained records and analytics cleanup | Is the experience dependable enough to expand? |

The dashboard offers an actual PDF report, a PDF for each section, summary CSV and full aggregate JSON. Reports include definitions, observation coverage and exact daily tables. Private messages and student identities do not appear in analytics reports.

## How a product manager would measure it

The north-star candidate is **students recording applications with no detected requirement conflict or uncertainty**. It pairs an action with the quality of the evidence available at confirmation. It remains a proxy: NextRole cannot verify employer acceptance or complete eligibility from incomplete source text.

| Measure | Definition and interpretation |
| --- | --- |
| Active participants | Distinct accounts with recorded activity in the same selected IST window. Not verified campus enrollment. |
| Feature adoption | Distinct accounts using a feature / accounts active in that window. Repetition is reported separately as actions per user. |
| Day-7 return | Exact seventh-day activity / first-observed accounts with a full seven days of follow-up. Immature cohorts are excluded. |
| Active time | Visible, focused and recently used time estimate. It is neither open-tab wall time nor time saved. |
| Inactive after one use | One recorded active day, with at least seven days since last activity. It is not a session count or a verified reason for leaving. |
| Journey drop-off | Ordered unique-account steps during the window; may involve different jobs. It is not same-job submission conversion. |

No retention target or impact percentage is invented for the portfolio. Establish a pilot baseline, review relevance and feedback alongside return, then predefine the success metric for each change. Avoid optimizing raw time spent or clicks when the candidate's goal is to complete their task efficiently.

### Tracking active time responsibly

The browser samples elapsed monotonic time only while the page is visible, focused and used within the previous 60 seconds. It observes interaction timestamps, not typed content. Large suspended-clock gaps are discarded.

The authenticated server validates a small, allowlisted sample payload. Cumulative per-account minute maxima make retries and overlapping tabs idempotent; atomic triggers add only the delta to daily section totals. The first accepted section receives that minute. Sequential tab switches, throttling or lost requests can undercount, so the UI calls this an estimate.

Host actions are excluded. Analytics opt-out removes the participant's events, cohorts, minute ledger and daily time totals; subsequent requests remain disabled. Workspace deletion does the same. Student data export includes their own daily time estimates. The ledger expires after 48 hours, events/daily aggregates after 90 days. Cleanup resumes through the existing bounded maintenance workflow.

See the [complete event/metric definitions and caveats](handoff/ADMIN-ANALYTICS.md).

## Architecture and deployment status

The deployed product uses a Vercel Next.js frontend, a stateless Render authentication/API gateway, and an owner-authorized Site data service with Cloudflare D1 and private R2. The native Site remains available. Existing maintenance tools preserve source, alert and delivery checkpoints.

Render runs the Google-authentication/API tier; the frontend's forwarding mode needs no OAuth/signing secrets. Existing storage and canonical account IDs remain in place. Live checks verify Google configuration, authorization redirects, secure cookies and anonymous access boundaries. An actual account owner's consent/token exchange and account linking require that owner's sign-in. The [cutover guide](handoff/RENDER-MIGRATION.md) explains verification and rollback; a full database migration is not claimed.

Google-only sign-in is gated until existing accounts are linked safely. Students can connect Google from Preferences; admins have a dedicated **Account** entry and `/account` page. No password login is introduced. The current working sign-in remains during the transition.

## Run and verify

Use Node 22.13+ with the package manager pinned in `package.json`.

```bash
corepack pnpm install --frozen-lockfile
pnpm dev
pnpm typecheck
node --experimental-strip-types scripts/verify-app.mjs
node --experimental-strip-types scripts/verify-app.mjs --scale
```

Admin analytics require owner identity and configured storage. The workspace has one All data view with automatic refresh and private database backups. Native hosting uses the repository's existing Sites build integration. To prepare a conventional frontend or the Render service:

```bash
node scripts/prepare-vercel.mjs --out /absolute/empty/frontend
node scripts/prepare-render.mjs --out .deploy/render
# After Render is configured and verified:
node scripts/prepare-vercel.mjs --out /absolute/empty/render-frontend --render-backend
```

Use the [environment guide](handoff/ENVIRONMENT.md), [Vercel guide](handoff/VERCEL.md) and [Render migration guide](handoff/RENDER-MIGRATION.md). Never commit secrets or student data. The blueprint leaves secret values for secure configuration.

## Evidence and honest limits

The isolated regression suite covers eligibility boundaries, persistent application state, account isolation, encrypted provider keys, owner access, consent, time deduplication, cleanup and PDF export. Separate generated-handler checks cover Google OIDC/session boundaries and the Render-to-Vercel forwarding mode. Synthetic load checks exercise bounded catalogues and maintenance; they are not proof of production capacity.

Real Google sign-in, real browser/device accessibility, campus concurrency, provider billing and Render cold-start behavior need rollout checks. Current job-board restrictions, browser-store approval and conditional email activation are documented rather than hidden behind placeholder success messages.

## Source map

- `app/host-dashboard.tsx`, `app/admin.css`: dedicated owner analytics workspace.
- `lib/admin-analytics.ts`, `lib/host-metrics.ts`: aggregate queries and coverage.
- `app/use-active-time.ts`, `lib/activity.ts`, migration `0015`: active-time estimate and atomic deduplication.
- `lib/admin-pdf.ts`: vector PDF report and methodology appendix.
- `app/scout-chat.tsx`, `lib/scout*`: job-aware assistant and reviewed résumé workflow.
- `scripts/prepare-vercel.mjs`, `scripts/prepare-render.mjs`, `render.yaml`: reproducible deployment variants.
- `scripts/verify-*.mjs`, `handoff/`: executable evidence and operational handoff.

NextRole is a product case study in making a narrow job-search loop useful, measurable and understandable before claiming large-scale impact.

## Employer coverage

The source registry configures 70 feeds representing 68 employers plus Jobicy. India-focused SmartRecruiters collection now includes Freshworks, Bosch, NielsenIQ, Dr Reddy’s Laboratories and Ramboll. Large indexes collect full descriptions in saved batches; absent postings are closed only after the complete index is revalidated. Existing student decisions, notes and application history retain their original keys.

The searchable Sources directory includes 466 employer targets and all 58 requested platforms. A target is separate from a connected feed. Read-only career-page discovery records identified boards, access limits and connector reviews; owner maintenance resumes eight employer checks per call. Additional connections require a validated public feed and access review. A platform name does not imply its jobs are being imported.

Configuration: [employer targets](data/employers.json), [platform inventory](data/platforms.json), [connected feeds](lib/sources.ts). Adapters cover Greenhouse, Lever, Ashby, SmartRecruiters, Workable, Recruitee, Personio, Breezy, Teamtailor RSS, Rippling, Workday and Oracle. Portal-specific recipes must pass validation before connection; credentials and collection permissions vary. Teamtailor RSS is a windowed discovery source, so absence does not close a job or confirm availability. Recruitee’s Careers Site API requires its designated token from 10 February 2027; this project does not bypass that requirement.

Shared maintenance uses the existing owner-authorized connection and 10:00 / 18:00 Asia/Kolkata schedule. It does not spend student AI credits, submit applications or enable email subscriptions. A successful build is distinct from source health; the owner status tool reports live refresh progress, listing counts, failed feeds and delivery backlog.
