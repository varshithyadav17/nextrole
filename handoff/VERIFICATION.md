# Scout chat and Vercel verification

The deployment receipts in the ZIP identify the exact source commit and each hosting result. Tests use isolated synthetic identities, local D1/R2, intercepted providers and generated handlers. No production student records, private student API keys or actual employer submissions were used.

## Passed checks

- 847 comprehensive functional, account-isolation, key-routing, eligibility, source, catalogue, tracking and synthetic-scale assertions; 26 additional native Worker egress checks.
- 142 targeted Scout, upload/parser, preparation, companion and bridge assertions, including the five new authorization/token HTTP-boundary cases. These overlap the comprehensive suite and must not be added as independent coverage totals.
- 19 actual generated Vercel auth/callback/proxy assertions: forged identity/bypass rejection, signed-cookie verification, expired/tampered sessions, CSRF, fixed upstream routing, no shared caching/cookie forwarding, bounded uploads, backend failure, browser state, PKCE, canonical-domain sign-in and logout.
- 12 retained-schema upgrade checks, without production data.
- Full TypeScript checking and focused lint for the new/changed Scout, bridge and build logic. This is not a claim that inherited global lint issues were repaired.
- Frozen-lockfile configuration validation with the retained pnpm workspace policy and overrides.
- Conventional Next.js production frontend build. The source manifest remains unchanged by that build. The pinned PDF.js worker and license are bundled locally; no external worker CDN is needed.

The full suite included 1,001 synthetic profiles with 500 additional listings, 100 reads at concurrency 10, and a 10,000-listing paginated catalogue. Results are in VERIFICATION-RESULTS.json. These are isolated-runtime measurements, not a production campus load test.

Scout now checks generated and uploaded résumés using the same recognised-skill vocabulary. It returns insufficient evidence when a JD has no recognised skills. Pasted JDs stay private, do not create a verified opening or application, and missing JD skills are not fabricated. Natural explicit build/check requests run the actual deterministic tools. Reviewed imports and factual corrections remain explicit, revision-checked actions.

The login bridge preserves the existing native Site identity and its stable user IDs. Code redemption is tested for wrong verifier/proof/redirect, expiry, replay and a concurrent race with exactly one winner. Code storage is hashed and bounded. Browser headers and Site bypass credentials cannot become a Vercel user identity. No new SQL migration was introduced.

## Verification limits

Managed browser control was unavailable; no alternate browser/preview workaround was used. Actual desktop/mobile layout and keyboard checks, a real ChatGPT→Site→Vercel cookie round trip, device push delivery and real employer forms remain unverified. Scout Companion remains an unpacked beta and must pass a controlled applicant-owned form before broader distribution. An internal résumé/JD score is not an employer ATS score or a hiring prediction.

Email preview and sender logic are implemented, and the retained nightly task is separate from sender activation. A verified sender/domain and operator mail credentials remain absent; no real inbox delivery is claimed. Global LinkedIn/Unstop ingestion and universal live OA/PYQ coverage are not implemented. User-assisted structured capture and source-labelled preparation resources are available.

Production CPU/D1/R2/bandwidth quotas, observability, restore rehearsal and staged campus capacity checks remain required operational work. Vercel hosts the frontend and authenticated proxy; the retained Site continues serving authentication, data, files and background tasks. Deployment success alone does not complete those operational checks.

## 21 October optional indexed discovery

The existing full functional suite passed 821 assertions plus 26 separate native Worker egress checks with the new discovery layer defaulted off. The additional isolated indexed-discovery suite passed 66 assertions, covering owner HTTP access, strict title experience and explicit batch mismatches, safe links, stable identities, empty pages, saved notes/Applied preservation, pagination and capped continuation, shared leases, provider cooldowns, interruption handling and authoritative duplicate precedence. No production provider key or live paid data request was used. TypeScript compilation also passed. See JOB-DISCOVERY.md and the outer release receipt for activation and deployment evidence.

The prior browser/device, real provider quality, inbox delivery and production campus validation limits still apply. An optional connection in code is not activated platform-wide coverage.
