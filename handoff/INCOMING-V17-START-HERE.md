# NextRole — v17 source handoff

This is the complete local review candidate for trustworthy discovery and verified-fact application preparation. It has not been deployed or saved as a hosted Site version. Read RELEASE-17.md for the supplied résumé layout and profile fields; RELEASE-16.md covers discovery, application timeline, compatibility, analytics and newsletter workflows. RELEASE-15.md retains the pagination details. RELEASE-14.md documents the retained application assistant; ROADMAP-14.md contains the source access research.

The original supplied v13 snapshot records upstream commit 70ae07d0419de03afcece1d34a1907ceb0073d52. Its original manifest is retained in handoff/V13-SOURCE-MANIFEST.json. The v14 manifest and verification record are retained alongside it. The current SOURCE-MANIFEST.json verifies the new package's actual source hashes.

## Local setup

Use Node 24 and pinned pnpm 11.25.0. From the extracted NextRole directory:

```sh
pnpm install --frozen-lockfile
node handoff/setup-local.mjs
node handoff/migrate-local.mjs
pnpm dev
```

The setup generates development-only encryption/push keys and local mock identity. Keep development on loopback. Never copy development keys over production values. The migration helper always uses local D1 and now includes migrations through 0011. No live data or secrets are included.

## Verify

```sh
python3 handoff/verify-source.py
pnpm verify
pnpm lint
```

`pnpm verify` runs TypeScript, the isolated scale/integration suite and the production build. Global lint has documented legacy failures; see handoff/VERIFICATION.md for the baseline and separate new-file checks. Provider/push HTTP is mocked in the suite. `node --experimental-strip-types scripts/check-public-sources.mjs` is an optional read-only live feed check and uses no personal AI keys or database.

## Try the new workflow

1. Complete the ordinary search profile.
2. Open Preferences → Career facts & résumé. Enter accurate contact details and career facts; confirm the facts you reviewed and save.
3. Open the eye icon on a job card. Paste actual questions, optionally inspect the supported public form, and create a saved preparation.
4. Review facts and answers, save changes, and download PDF or LaTeX. Open the official Apply link and submit yourself; only then mark Applied.
5. Use Show more openings to request another server page. Filters and counts apply to the full snapshot. If the catalogue changes, reload results when prompted.
6. Career sources supports private pasted/JSON-LD imports. The host can append permitted ATS boards there, and source-run history begins with the next refresh. Imports appear in Interested and retain their unverified label.

## Deployment boundary

Preserve the existing project in .openai/hosting.json. Before any publication, compare the actual hosted/source state with this archive so newer work is not overwritten. Reconnect through the supported Sites workflow, apply the additive migration, preserve identity/audience/secrets, and obtain production deployment approval. Do not deploy the old v13 saved version as if it contained these changes. Keep the existing encryption root and apply all pending additive migrations through 0011.

See handoff/PROJECT-STATE.md, handoff/ENVIRONMENT.md and handoff/DEPLOYMENT.md for continuity; historical v13 fix documents are retained as provenance.

## Try v16

Open Career facts & résumé to add project repository/demo and professional links. Open View & prepare or the eye on a job; generate a preparation, review compatibility and optionally request AI answer drafts. Apply on the actual source/employer site, then save a submission record with the résumé version you really used. Leave an unknown date blank. Record completed milestones separately, and open My analytics for charts and downloads. Preview the nightly newsletter under Alerts & account; sending is disabled until host activation and a real nightly task. Source refresh resumes Jobicy pages across requests. These local workflows are not production deployment evidence.

## Try v17

In Career facts & résumé, add an optional Profile paragraph and confirm it separately. Set education titles to qualifications and organizations to institutions, with an optional exact grade/score. Add project technology lines and verified skill groups. Save the profile, then create a new preparation for a job to use the supplied Letter layout. Review the selected facts and download PDF or LaTeX. Existing saved preparations keep their earlier layout. See handoff/RESUME-TEMPLATE.md for compilation, font support and storage limits.
