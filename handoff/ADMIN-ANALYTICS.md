# NextRole admin intelligence

The owner opens `/admin`, a dedicated workspace with six views. Ordinary students cannot use its live API or reports. `/demo/admin` is a public, synthetic-only portfolio demonstration. It does not load live metrics, messages or operations, and it never grants admin capability.

## Decisions and measures

| Decision | Primary measure | Diagnostics | Guardrail |
| --- | --- | --- | --- |
| Is job discovery producing useful action? | Students recording applications with checked requirements | Job views, Apply opens, confirmed Applied, saved jobs | Requirement checks are incomplete evidence, not employer eligibility or a submission receipt |
| Does the product earn repeat use? | Exact Day-7 return among mature first-observed participants | Day-1 / Day-30 return, weekly cohorts, active-day frequency | Hide immature cohorts and incomplete comparisons |
| Where should the team improve? | Feature adoption and open feedback themes | Actions per participant, estimated active time, reply/resolution timing | Voluntary feedback is self-selected; time spent is not time saved |

No numerical growth or retention target is declared without a measured baseline. Review a small pilot weekly and use feedback to choose the next change. A future experiment should record its exposure and predefine its outcome; this release does not claim causal impact.

## Metric dictionary

| Metric | Definition |
| --- | --- |
| Active participants | Distinct accounts with recorded product activity in the selected 7/30/90-day IST window. Host actions excluded. |
| DAU / WAU / MAU | Distinct workspace-open accounts today / trailing 7 / trailing 30 IST calendar days. Independent of selected report window. |
| Adoption | Distinct participants performing the feature action / distinct participants active in the same window. Actions per participant include repetitions. |
| Onboarding completion | Newly observed unfinished profiles completing onboarding / newly observed unfinished profiles in the window. Already completed profiles excluded. |
| Exact-day return | Participants active exactly 1, 7 or 30 days after first observation / first-observed participants in the period with sufficient follow-up. |
| Return cohort | First-observed Monday cohort, with rolling seven-day observation windows per person. Hide a cell until the latest member completes the full week. Week 0 includes the initial visit. |
| Inactive after one use | More precisely: one recorded active day and at least seven days since last observation. Not a session count or verified abandonment. 2–3 / 4+ active-day groups use the same rule. Only first-observed cohorts inside retained 90-day history are included. |
| Journey | Ordered unique-account workspace visit → job view → Apply open → Marked Applied during the window. May concern different jobs; not a same-job application funnel. |
| Tracked stages | Current user-maintained stage of Applied records updated during the window. Not historical stage transition totals. |
| Comparison | Previous non-overlapping equal-length period, shown only if fully inside tracking and retained event coverage. Zero baselines are labelled new activity; unavailable comparisons are suppressed. |
| Help timing | Mean time to first reply/resolution, among help requests created in the period that have that timestamp. Excludes unanswered/unresolved cases from each respective average. |

## Active time, not an open-tab timer

`app/use-active-time.ts` samples elapsed monotonic time only while the document is visible, focused and interacted with in the last 60 seconds. Pointer, keyboard, scrolling and touch events update a timestamp; their contents are never recorded. Suspended-clock gaps over 2.5 seconds are discarded. Thirty-second cumulative minute samples are best effort; navigation/blur/page hiding flush them without interrupting work.

The authenticated server accepts only allowlisted section names and at most four recent samples, caps each account minute at 60 seconds and rejects old/future data. An atomic SQLite upsert retains the maximum per account/minute. Insert/update triggers add only its delta into a daily section aggregate. This prevents duplicate retries and overlapping tabs from inflating totals. Sequential tab switches, network failures and browser throttling can undercount. A minute is attributed to its first accepted section. No presence detection proves attention; the result is an estimate.

The minute ledger expires after 48 hours; daily aggregates and feature events after 90 days. Cohort records expire after 180 inactive days. Bounded cleanup participates in the existing resumable owner maintenance loop. Opt-out and workspace deletion remove both time tables and existing events/cohorts. Late requests cannot restart disabled tracking. Student export includes their own daily time data. Host responses contain aggregates, not identities or individual timelines.

## Reports and demo data

- Download report: an actual PDF generated with vector charts, data tables, definitions, coverage and daily appendix. More exports provides a section PDF, summary CSV and full aggregate JSON.
- Live PDF endpoint independently verifies owner access, rate-limits report generation and responds with private/no-store headers. It omits private feedback text, identities and résumés.
- `lib/admin-demo.ts` is a pure synthetic aggregate fixture. It never writes database rows. Demo views, filenames, PDF metadata and every PDF page carry synthetic labels.
- Portfolio numbers, including the 973 illustrative profiles, are not actual campus adoption. Report images in the README are exports from this fixture, not browser screenshots or production evidence.
- `/demo/admin` can export its synthetic report entirely in the browser. It has no live-data switch and cannot send support replies.

Run `node --experimental-strip-types scripts/export-demo-report.mjs` to reproduce the synthetic sample report. Standard type checks and the isolated `scripts/verify-app.mjs` suite cover metric denominators, time idempotency, opt-out, deletion, identity boundaries and PDF authorization. Synthetic concurrency checks do not certify production capacity. Real browser/device QA is still required.
