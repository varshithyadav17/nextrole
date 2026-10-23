# Fresher and graduation filtering fix — 18 October 2026

Release state: prepared for review; production deployment requires the owner's approval under the supplied PM brief. Version 11 remains live until that approval. No production data, sharing, secrets, schedules or applications were changed while preparing this fix.

## Report and acceptance criteria

A student saved zero years of professional experience and graduation in 2027, but saw roles seeking 3–4 or 4–8 years. The next release must exclude mandatory experience above the saved amount from For you, keyword/AI candidate selection and new-match alerts. Explicit incompatible graduation batches must be excluded. Unconfirmed or conflicting requirements must be available separately in Needs review. Company browsing must keep the selected eligibility scope. Applied, Interested, Not interested, notes and history must survive.

## Root causes verified in the code

- The old extractor recognized `3–4 years of experience`, but missed `Experience: 4 to 8 years`, possessive `3+ years’ experience`, spelled-out amounts and technology-specific formulations. An em dash could cause the upper endpoint to be read as the minimum. A separate `freshers welcome` sentence could override an unrecognized positive requirement.
- An early-career title could be treated as a match without confirmed experience. Uncertain matches were included in For you and new-match alerts.
- Companies & roles deliberately counted all catalogue jobs and opened discovery with `view=all`, bypassing saved eligibility preferences.
- Card explanations led with a matching role even when other requirements failed. Profile changes did not invalidate an earlier AI result's signature.

## Implemented behavior

- Versioned, evidence-carrying experience extraction supports numeric/word amounts, hyphen/en/em dash ranges, possessives, years/months, Experience-first wording, optional sections and explicit fresher exclusions. A positive mandatory requirement wins over a conflicting fresher invitation. Complex alternative qualification routes remain for review.
- `lib/job-selection.ts` is the single selection policy used in client discovery, company browsing, keyword search, AI candidate selection and new-match alerts. For you requires relevance without an uncertainty flag. Needs review shows relevant records requiring confirmation. Explicit All openings remains available with a prominent warning that saved preferences are off.
- Senior titles are excluded for fresher/junior profiles. An intern/graduate title alone never proves zero experience. Legacy, unversioned zero metadata is unconfirmed until a normal source refresh; this avoids presenting old extraction as a verified result.
- Graduation extraction additionally handles year of passing, passouts, month/year wording and em-dash ranges. Separate conflicting conditions require review. A future graduation year does not prove a required degree is already completed.
- Company counts and links preserve the selected scope. Saving profile preferences returns the discovery scope to For you. Experience/year chips are visible near the search heading; cards show unmet or unknown conditions rather than leading with an unrelated positive reason.
- AI search results are invalidated when the saved profile changes. Optional AI never receives excluded candidates in For you and cannot bypass this deterministic gate. Discovery still uses no student API keys.

## Verification and rollout

Run `node --experimental-strip-types scripts/verify-app.mjs --scale`, TypeScript and the supported production build. The new `scripts/verify-eligibility.mjs` exercises extraction, the real profile handler, metadata-only workspace results, full details, company filters, keyword and optional AI paths, notifications and preservation of Applied/notes against an isolated database. Provider and Web Push HTTP are mocked; no live keys or submissions are used.

No database migration is required. The existing public-job JSON gains bounded experience-rule metadata; student records are untouched. After approved deployment, resume the existing owner-authorized source refresh without forcing/restarting it. Confirm all 20 boards complete and healthy, and that alert/delivery queues drain. Old rows may temporarily appear under Needs review until refreshed. A source outage preserves its last-known records under that conservative policy.

Browser control is unavailable in this environment. Real touch/mobile, keyboard, screen-reader, provider-account and device-push checks remain unverified. Text extraction is bounded and conservative; For you is a preference match, not certification of every employer condition. Discipline, work authorization and unusual wording still require review.
