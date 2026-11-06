# NextRole

Find your next job.

NextRole is a job-search workspace for students and early-career professionals. It brings relevant openings, résumé preparation and application tracking into one place, with ScoutX as a job-aware assistant.

[Open NextRole](https://nextrole-scout.vercel.app/)

## Features

- **Job discovery:** structured listings from connected Greenhouse, Lever and Ashby employer boards, plus the supported Jobicy feed. Each opening links to its original source.
- **Eligibility matching:** role, location, work arrangement, experience, graduation batch, qualifications and supported academic requirements. Title and description evidence are checked together. Explicit conflicts stay out of For you; missing information goes to Needs review.
- **Saved jobs:** shortlist openings, add private notes and set reminders. Not interested and Applied choices survive refreshes and prevent repeat discovery.
- **Job details:** a dedicated page with the description, skills, eligibility evidence and employer application link.
- **ScoutX:** discuss a job, attach a résumé PDF, review résumé/JD compatibility and tailor verified profile facts. Reviewed résumé drafts export as PDF and LaTeX using the built-in template.
- **Application tracking:** separately confirm submission, record responses, assessments, interviews and outcomes, and download personal progress reports.
- **Preparation:** keep assessment and interview preparation beside the application, with sourced material distinguished from practice questions.
- **Browser companion:** save a listing you are viewing and assist supported application forms. Setup instructions are available in the app.
- **Optional notifications:** in-app updates, browser push and a nightly email digest, subject to device permission, student opt-in and configured delivery services.
- **Admin analytics:** owner-only adoption, retention, feature usage, application journey, feedback and source/delivery health, with PDF and data exports.

Browsing, matching and tracking do not require an AI API key. Optional AI requests use the signed-in user's configured provider connections, with that provider's limits and charges. Account sign-in does not supply API credits.

## Job quality

The preferred feed requires matching evidence, recent source verification and no unresolved requirement uncertainty. A senior title or an experience range above the candidate's profile cannot become a fresher match just because the description omits a number. Unknown requirements are never treated as zero experience or guaranteed graduation eligibility.

Ingestion is bounded, resumable and protected by leases. A failed or partial source response preserves existing records. Listings removed from a complete employer feed are closed while saved notes and application history remain available. Source health and individual listing check times remain visible.

Coverage is limited to connected sources. LinkedIn, Unstop and Internshala are supported through external discovery links and user-directed imports; NextRole does not have their private job feeds. The companion does not provide unattended access to every website.

## Application and AI boundaries

Opening an employer application page does not mark a job Applied. The student confirms submission separately. Auto-Apply is a limited, opt-in workflow for supported forms and remains a beta feature; it is not universal application submission.

The résumé/JD score is an internal compatibility estimate, not an employer ATS score or hiring prediction. Students review generated facts and documents before use. No résumé edits invent employment, qualifications or project achievements.

## Architecture

The frontend runs on Vercel. A stateless Render service handles authentication and forwards allowlisted API requests to the existing data service. Durable account records use Cloudflare D1; private résumé files use R2. The database and file store have not been migrated to Render.

Google OAuth is implemented with explicit account linking so existing jobs and history retain their account IDs. The current sign-in remains available until Google configuration and account recovery are verified. Host access is enforced on the server.

Per-account AI credentials are encrypted and excluded from exports and browser responses. Usage analytics are optional and aggregate visible, focused activity rather than typed content. Users can export their workspace and clear their data.

## Local development

Use Node.js 22.13 or later and the pnpm version pinned in `package.json`.

```bash
corepack pnpm install --frozen-lockfile
node handoff/setup-local.mjs
pnpm dev
```

The local setup helper creates development-only configuration. Use `.dev.vars.example` to see supported environment variable names. Never copy local keys into production or replace an existing encryption root.

```bash
pnpm typecheck
pnpm test
pnpm test:scale
pnpm build
```

Tests use isolated databases and mocked provider/delivery requests. Local scale measurements do not establish production capacity.

## Deployment

Generate the conventional Next.js frontend and Render service from this repository:

```bash
node scripts/prepare-vercel.mjs --out ../nextrole-vercel --render-backend
node scripts/prepare-render.mjs --out .deploy/render
```

Use an empty output directory outside the repository for the Vercel generator. Configure runtime secrets in the hosting provider. Keep OAuth secrets on Render, preserve the existing data-service secrets and bindings, and never commit credentials. Vercel needs the exact app, Render and storage origins. `render.yaml` describes the backend service.

Follow [Render and Vercel setup](handoff/RENDER-MIGRATION.md), [Vercel deployment](handoff/VERCEL.md) and [email activation](handoff/EMAIL-ACTIVATION.md). Verify the deployed commit, authentication, source refresh, delivery backlog and rollback path before expanding access.

## Release checks

See [production review](handoff/PRODUCTION-REVIEW.md) for the latest verified changes and remaining launch gates. Before a wider campus rollout, complete real-account sign-in and linking, mobile/device notification checks, verified email delivery, quota monitoring, backup/restore and staged production load testing.

## Repository guide

- `app/`: student workspace, ScoutX, admin views and API routes.
- `lib/`: matching, ingestion, private account data, résumé generation and analytics.
- `db/` and `drizzle/`: schema and additive migrations.
- `companion/`: browser extension source.
- `deploy/` and `scripts/`: reproducible deployment outputs and verification.
- `handoff/`: setup, operations and release documentation.
