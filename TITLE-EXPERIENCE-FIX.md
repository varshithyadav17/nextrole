# Experience stated in the job title — 18 October 2026

Current live release: version 12. This correction is being prepared as a separate review release; production deployment remains subject to the owner's explicit approval under the PM brief.

## Report and reproduced cause

The owner's screenshot shows two Paytm cards titled `Product Management - Lending Product | Experience : 4 -8 yrs`, both labelled `Experience not confirmed` and offered for eligibility review. That label is incorrect. The v12 ingestion and full-detail matcher passed only the description into experience extraction, ignoring an explicit requirement already present in the title. The body parser also did not recognize the abbreviation `Exp`.

The earlier 395-check suite did not cover experience in the title. A passing test count did not establish that this particular workflow worked. The exact reported title is now a permanent regression fixture.

## Correction

- Both the actual title and description participate in experience extraction. The source fields are parsed separately so a preferred-qualification heading in the description cannot weaken a mandatory title requirement.
- Title forms such as `Experience : 4 -8 yrs`, `Exp: 2 to 4 years`, `3+ yrs` and `(3–5 years)` are supported. A six-month internship/programme duration or a year such as 2027 is not invented as work experience.
- Explicit positive requirements are never erased by a conflicting fresher invitation. Conflicting bounds/routes remain flagged for review; they cannot become a confirmed fresher match.
- Experience rules retain whether an excerpt came from the job title or description, and the detail view labels those excerpts. The screenshot case displays `4–8 years` and reports a 4-year minimum against a zero-experience profile.
- Existing v12 metadata is corrected at read time using the already stored title. Cards, full details, keyword/AI candidate selection, fit explanations and new-match alerts all use the same resolver. A normal source refresh persists the enriched public-job metadata. No job or verification timestamp is rewritten by the read correction.
- Known mismatches are excluded from both For you and Needs review for that profile. Explicit All openings still permits broad catalogue browsing and displays the actual experience requirement.
- Source identity, canonical aliases, Applied/Interested/Not interested choices, notes, stages, reminders and history remain intact. The two Paytm posts retain their distinct provider IDs; identical titles alone do not prove duplicate requisitions.

## Real source verification

A read-only call to Paytm's public Lever feed on 18 October 2026 returned 182 postings and both exact reported titles. The corrected adapter extracted a minimum of 4 and maximum of 8 years for each, and the zero-experience profile was irrelevant for both. One record also supplied a description excerpt beginning `Exp should be in between 4 - 8 years`; the other was supported by the title itself.

- https://jobs.lever.co/paytm/75992181-c0d0-44e7-805a-6dddfd0fe23b
- https://jobs.lever.co/paytm/f24d29df-a4ad-4991-ae78-1c5c24c63c75

This was direct public-source reading and local normalization, not a production database mutation, application submission or LLM call. Counts and availability can change.

## Acceptance and verification

`scripts/verify-title-experience.mjs` covers the exact screenshot, all three ATS normalizers, title/description contradictions, optional qualifications, internship-duration false positives, qualified and unqualified profiles, legacy read-time repair without source writes, consistent card/detail output, company filtering, keyword/AI paths, alert generation and Applied-note preservation. It runs in the existing isolated integration suite. Real provider or student keys are not used.

After explicit approval, deploy the saved matching source/build and resume normal owner-authorized refresh without forcing or restarting sweeps. Check all 20 sources and aggregate alert/delivery backlog. Browser/device UI testing remains unavailable here; source evidence, API integration and production build results do not certify every UI interaction or every possible wording.
