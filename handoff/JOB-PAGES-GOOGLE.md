# Job pages and Google sign-in — 23 October 2026

## Job pages

The eye, title and View job controls now open `/jobs/{encoded-id}` in the workspace. Job details use the normal page flow rather than a backdrop, dialog, focus trap or scroll lock. The full description appears above preparation tools. ScoutX stays in the bottom-right with this job’s actual context and its private conversation. Applied remains an independent confirmation; viewing or preparing a job does not submit an application.

Back to jobs and browser Back restore the previous filters, result-count URL and scroll state. Browser Forward reopens the job. Direct links have a safe results fallback. Existing `?job=` notification/extension links remain compatible. Job loading/errors have page-level Back and Retry controls. Routine availability verification no longer reloads the underlying results unless the job is closed. Notes and all saved application state are retained.

## Google activation: still required

Google login/sign-up and explicit linking are implemented for the canonical Vercel frontend. No Google OAuth credentials were present during this release. Google login remains unavailable there until the owner registers and configures them; existing ChatGPT sign-in stays usable. Do not describe Google sign-in as live or end-to-end verified before activation.

1. In Google Cloud / Google Auth Platform, select a project you own and configure NextRole’s branding, audience, support email, homepage and privacy URL. Request only `openid email profile`.
2. Create a **Web application** OAuth client. Register this exact authorized redirect URI:

   `https://nextrole-scout.vercel.app/auth/google/callback`

   The app origin is `https://nextrole-scout.vercel.app`. Use the app’s `/privacy` page. If the OAuth audience is in Testing, add the intended test accounts; follow Google’s requirements before making it available to a campus audience.
3. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` as server-side **Production** environment variables in Vercel project `nextrole-scout` (`prj_6MsqOzhV4nAgtZSve5zhjqoecd2M`). Treat the secret as sensitive. Do not paste it into chat, browser storage, source or a public variable. No native Site Google client secret is needed.
4. Redeploy the same reviewed Vercel source to load the new environment configuration. Test new-account Google login, logout, a job deep-link return, existing-account linking and denied/cancelled consent with real test accounts before a campus launch.

Existing users should first use their current sign-in, then open **Preferences → Alerts & account → Connect Google**. That preserves their original workspace and history. A Google account first used independently creates a separate workspace; the app does not automatically merge accounts by email. A connection conflict leaves both accounts unchanged.

## Authentication architecture

The native Site’s hosted ChatGPT identity integration and owner-authorized MCP operations are retained. Vercel adds Google OIDC using pinned `openid-client` 6.8.8: authorization code flow, S256 PKCE, independent state and nonce, a signed ten-minute Secure HttpOnly transaction cookie, exact canonical callbacks, issuer/audience/expiry checks and RS256 signature verification from Google’s fixed JWKS endpoint. Requests to identity endpoints refuse redirects. Google access/refresh tokens are not retained or exposed to browser code. Only verified profile claims are used.

The existing independent signed bridge authorizes a short-lived, single-use server-to-server identity exchange. Migration **0014_google_sign_in** adds `google_accounts` with unique provider-subject hash and workspace ID. Google-only accounts use an issuer-scoped namespaced ID; matching an owner email does not confer host access. Explicit linking requires the existing signed session, same-origin POST and a browser-bound transaction, and returns the original native account ID. Existing Google-only contacts refresh from verified claims while their workspace stays stable. The original DB/R2, identity methods, encryption root, API keys, histories, schedules and public audience remain intact.

Clearing workspace content retains the sign-in mapping, matching the existing behavior of keeping the upstream account. This is disclosed in account and privacy copy. Do not silently delete authentication connections as part of a job-data cleanup.

## Verification

The actual navigation hook is exercised with simulated browser history (Back, Forward, direct-link fallback, filters, result count, scroll, notifications and old links). Native isolated tests cover real OIDC library validation against synthetic RS256 tokens, invalid state/nonce/audience/issuer/expiry/key/email verification, explicit linking, uniqueness, replay, stable IDs and host isolation. Generated Vercel handlers additionally test callbacks, cookies, canonical redirects, preservation of job return paths, same-origin linking and proof-bound identity packets. No real Google credentials, student provider keys, job applications or mail sends are used.

Managed preview reported running, but its browser entry point returned `ERR_CONNECTION_REFUSED`; real browser/device QA remains unverified. Google provider setup and a real-account OAuth test are outstanding. Synthetic scale tests do not establish production capacity. See the verification JSON and exact publication receipts.

References: https://developers.google.com/identity/openid-connect/openid-connect · https://github.com/panva/openid-client · https://github.com/panva/openid-client/blob/main/docs/functions/enableNonRepudiationChecks.md
