# NextRole production review

Review date: 6 November 2026. Scope: the existing Vercel frontend, Render API/authentication gateway and durable D1/R2 data service. The approved landing page, Scout artwork and workspace sizing are retained.

## Changes in this release

- Decode named and numeric source entities before interpreting experience and graduation ranges. For example, `0&ndash;2 years` remains a zero-to-two-year route; `4&ndash;8 years` stays outside a fresher's eligibility.
- Preserve requirement section boundaries at HTML line breaks. Preferred experience cannot overwrite a mandatory minimum.
- Re-read older matching metadata from the saved source description on the server. Cards, paginated discovery, alerts and the companion use the current parser version; full descriptions remain omitted from lightweight browser payloads.
- Include the matching-rule version in catalogue cache generations so an existing cached ranking cannot outlive a matching update.
- Add five live-checked public employer boards: Merkle Science, Enterpret, Sigmoid, FourKites and Wikimedia Foundation's internship programme. They are appended so existing source cursors retain their order. A sixth candidate, Postman, was unavailable during the check and was not added.
- Limit one foreground refresh to four bounded requests. Larger sweeps retain their checkpoint; users can continue with available results and resume through Refresh jobs.
- Distinguish temporary authentication-service failure from missing Google configuration. The login page retries once in the background and offers a manual retry if the service remains unavailable.
- Replace the root README screenshot gallery with text-only product, setup, architecture and operating documentation. Generated Vercel documentation now describes the Render forwarding mode correctly.
- Make the deployment-payload helper default to preview. Production requires the explicit `production` argument.
- Patch Next.js and its ESLint configuration to 16.4.1, Zod to 4.6.6 and the fast-uri override to 3.1.9 after auditing the locked runtime dependencies.
- Add a GitHub verification workflow with pinned official actions, read-only repository permissions, isolated tests, dependency audit and a frontend build. No production credentials are supplied to CI.

## Source and delivery baseline

The pre-release owner-authorized refresh completed all 22 existing sources. All 22 were healthy, 1,127 stored listings were marked open, and alert processing, push delivery and cleanup had no remaining work. The sweep began at 2026-11-05 23:45 UTC and completed before the delivery check at 23:57 UTC. Stored open listings are not a count of jobs eligible for a particular student.

The existing source-refresh schedule was re-enabled without changing its cadence or owner-only maintenance prompt. Future execution still needs observation. No student API keys, anonymous maintenance endpoint, application submissions or sharing changes were used.

The five additional boards passed the actual bounded feed adapters before inclusion. Their raw feeds contained 93 listings at that check, including internships. Eligibility remains evidence-based; a listing is not called a confirmed match merely because it is an internship.

## Verification

The release is checked with TypeScript, the isolated integration/scale suite, generated Render/Vercel identity-boundary checks, an upgrade from the older schema and saved ingestion checkpoint, and production builds. The scale suite exercises 1,001 fixture profiles and a separately paginated 10,000-listing catalogue. Those measurements describe the isolated runtime, not production concurrency or a campus service-level guarantee.

Public live checks returned HTTP 200 with `googleReady: true` for authentication options and HTTP 401 for anonymous workspace and host APIs. Those responses used `no-store`. Browser review confirmed that Google sign-in became available after the backend responded. A configured OAuth client and working redirect are separate from completing a real account's consent and token exchange.

The locked runtime dependency audit reports zero advisories after updating Next.js to 16.4.1, Zod to 4.6.6 and fast-uri to 3.1.9. React and server-component packages retain 19.2.9. The audit is a point-in-time dependency check, not proof that the application is free of vulnerabilities. Runtime monitoring and future updates remain necessary.

Patch references: https://github.com/advisories/GHSA-673q-mjm6-r5xr , https://github.com/advisories/GHSA-mrhx-c7xc-m3w5 , https://github.com/advisories/GHSA-w74x-v6f9-j3xg and https://github.com/react/react/security/advisories/GHSA-xqc2-xf4c-x3h3 .

## Remaining launch gates

1. Complete Google sign-in, cancellation, account linking and logout with two real student accounts, then check that their saved jobs and private files stay separate. Keep the current sign-in available until account recovery is verified.
2. Verify browser push on a real device with the app closed. Nightly email is not activated: the owner must configure a verified sender and a consenting recipient, then verify actual delivery. Do not enable student opt-ins automatically.
3. The extension is currently distributed for manual installation; a normal Chrome Web Store install requires the owner's publisher account and store review. Source capture is user-directed, not a private LinkedIn/Unstop feed.
4. Auto-Apply remains a limited opt-in beta for supported forms. Complete live form-specific checks before promoting unattended submission. No applications were submitted during this review.
5. Check hosting quotas, cold-start latency, error and backlog monitoring, backup retention and an actual restore. A full database migration to Render has not been performed.
6. Begin with a small friend cohort and collect relevance/failed-flow feedback before broader campus sharing. Test production concurrency in stages; local fixture results do not establish real-world capacity.

These gates distinguish a working release candidate from a completed campus-scale production validation. Existing account IDs, encryption roots, storage bindings, application choices and history are preserved.

## Source references

- Greenhouse Job Board API: https://docs.greenhouse.io/job-board
- Lever public postings: https://github.com/lever/postings-api
- Ashby public postings: https://developers.ashbyhq.com/docs/public-job-posting-api
- Backend and Google setup: [Render migration](RENDER-MIGRATION.md)
- Email activation: [Email guide](EMAIL-ACTIVATION.md)
- Measurement definitions: [Admin analytics](ADMIN-ANALYTICS.md)
