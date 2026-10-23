# Focused NextRole release — 23 October 2026

This release simplifies the existing product around useful next steps, transparent requirements and reliable application records. Keep the existing Site, audience, D1/R2 bindings, identity and encryption root. Apply only the new schema migration `0013_wide_supernaut.sql`; migrations 0000–0012 are unchanged. No student records are seeded or reset.

## What changed

- Four primary destinations: Today, Jobs, Applications and Profile. Saved jobs and sources are inside Jobs; progress reports and archived choices are inside Applications. Optional AI connections and browser assistance sit under Advanced. Detailed source operations are host-only.
- Two-step onboarding retains drafts. Joining date and internship commitment are optional, with calendar and range validation.
- Each job explains experience, graduation batch, degree/discipline, academic cutoffs, availability and explicit joining constraints. It shows published evidence alongside saved facts and separates a conflict from an unstated requirement or an item requiring review. Title-level experience still participates in filtering. Equivalent qualifications require confirmation, and no grading-scale conversion is inferred.
- Today shows a short current-match list and bounded personal actions: saved deadlines/reminders, source changes, scheduled incomplete assessments/interviews, reviewed browser-work notices and recently opened application links awaiting confirmation. Today always uses the student's current saved preferences; a previous search's All/Needs review filter does not change its shortlist.
- Opening an employer link records private intent, never submission. The student can confirm Applied or dismiss the reminder. Applied, Interested, Not interested, existing notes and immutable application documents remain intact. Link intents are included in export and workspace deletion; intents older than 30 days are pruned on the student's next recorded open.
- Employer changes to requirements, deadlines, location, destination or availability are retained as meaningful source changes. Routine whitespace and repeated checks do not reset their date. Saved-job change updates respect the student's reminders setting. An older preparation cannot enter browser assistance after a detected source change; it must be rebuilt and reviewed.
- The job workspace places requirement evidence, résumé/answers and the timeline in one place. Résumé content coverage remains an internal comparison, separate from eligibility or any employer's ATS decision.
- Apply feedback popups and automatic monthly survey prompts are removed. Help, private incorrect-match reports and optional check-ins remain available. The host can inspect confirmed applications whose checked requirements fit, with the metric's limits stated. Analytics opt-outs still apply.

## Verification

The full regression and synthetic-scale suite passed 925 checks. The native Worker adapter suite passed 26 checks, the generated Vercel authentication/proxy suite passed 19, and the retained-schema/checkpoint upgrade passed 12. TypeScript, native production and generated Next.js production builds passed. The 10,000-listing synthetic catalogue produced a 54,164-byte first page. See `FOCUSED-VERIFICATION.json` for measured fixture results and their limits.

Run `pnpm typecheck`, `pnpm test:scale` and the Sites build helper. `scripts/verify-focus.mjs` exercises the actual handlers and isolated D1 data for eligibility, timing, source changes, Today privacy, intent/Applied separation, scheduled milestones, exports and preservation of notes. The full suite also covers existing authentication, uploads, application history, alerts, owner permissions, source failure preservation and synthetic campus workloads.

The generated Vercel frontend includes the authenticated `/api/today` proxy. Verify it with `scripts/verify-vercel.mjs` and a Next.js production build. These checks are evidence about isolated test behavior, not a production capacity guarantee.

## External gates

- Managed preview reports running but the browser cannot reach its internal address. Visual, touch/device and end-to-end browser checks for this release remain unverified.
- The Vercel connector denies the retained team's scope with HTTP 403; Vercel publication requires restoring authorization for that same team. Do not replace the project, copy the database, expose credentials or weaken the bridge to work around this.
- LinkedIn/Unstop are not unrestricted global feeds. The companion has not been published to the Chrome Web Store or verified on live employer forms. Automatic submission remains a controlled, off-by-default capability with explicit per-job review, not the main product promise.
- Verified mail sender setup and student opt-in remain prerequisites for real newsletters. No sender, student opt-in, paid discovery provider or provider key was activated by this release.
- Campus interviews, real device testing and a measured production pilot are separate validation work. Keep product claims proportionate to those results.
