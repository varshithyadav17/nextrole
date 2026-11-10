# NextRole authentication and recorded analytics review

Review date: 10 November 2026. This is a review candidate; the existing production deployments and database have not been changed by this work.

## Resulting behavior

The login page offers email/password sign-in, a separate account-creation state (name, email, password and confirmation), password visibility controls and the configured Google option. It removes the ChatGPT button and outdated sign-in instructions. The form renders without waiting for the free authentication service to wake; availability is checked in the background. Existing compatibility routes remain for account recovery and previously issued sessions.

Existing authenticated users can enable a password from Your account or Preferences. Linking retains their exact user ID, saved jobs, private files, applications and analytics history. New registrations receive their own email namespace. They do not verify ownership of an email address, automatically merge another workspace or acquire owner privileges. Verified Google users must add a password while signed in, and password users must explicitly connect Google. Password recovery email and email verification are not implemented in this change.

Passwords are processed on the Node authentication tier using salted scrypt (N=131072, r=8, p=1), with one concurrent derivation to bound memory on the existing free gateway. Only hashes reach the existing durable database. The exchange uses signed, short-lived, single-use requests; lookup limits are enforced in D1 before expensive hashing. Browser sessions retain secure, HttpOnly, SameSite=Lax, host-only cookies. Passwords and hashes are excluded from browser responses, workspace exports and logs. New registrations cannot become admins by entering the owner email.

Google's public start route was observed returning the expected authorization redirect. This does not verify real account consent or callback completion. The candidate distinguishes account-store failure from provider/state failures and emits only method, stage and HTTP status. It never logs an authorization code, token, cookie, password or user identity. Existing-account sign-in and linking still need a real-account production check.

The admin page and its JSON/PDF endpoints always query the operational tables, including when an old `mode=demo` URL is opened. The former public sample page redirects to the authenticated admin page. The synthetic aggregate generator remains an explicit script/fixture utility and is not used by the app. No fixture values are relabelled as measured results or inserted into operational tables.

The dashboard refreshes once a minute while visible and when returning to the tab. It shows the recorded period, measurement coverage and last update time. A failed refresh displays an error and keeps the timestamp of the previous response. Date-filter changes clear the previous period. Exports use the same recorded dataset. Future-dated events, onboarding and feedback cannot inflate the selected reporting period. Feedback messages remain owner-only; active-time estimates and self-reported application confirmations retain their definitions.

## Verification evidence

- Root TypeScript check: passed.
- Isolated D1/R2 workflow and scale suite: 1,072 checks passed, plus 26 Worker transport checks.
- Actual Node email gateway: 36 checks passed, covering real scrypt, signup, correct/incorrect login, same-account linking, signed exchanges, origin checks, safe return URLs, session cookies, disabled rollout and upstream outage.
- Generated Render/frontend identity boundary suite: 19 checks passed.
- Generated Google OAuth, callback and private upload boundary suite: 31 checks passed.
- Render regeneration/cache-safety suite: 10 checks passed.
- Canonical Worker, generated Render backend and generated Vercel frontend production builds: passed.
- Browser visual review: sign-in, sign-up switching and password visibility were checked in the isolated local preview. Authentication was disabled there; screenshots do not demonstrate a live signup or Google login.

[Login screen](../docs/review/account-flow/login.png) · [Signup screen](../docs/review/account-flow/signup.png)

All test accounts, recorded events and feedback fixtures were isolated from production. Scale timings do not establish production capacity. Live student counts, review ratings and historical adoption totals were not independently verified because database access was unavailable.

## Production dependency and rollout order

The GitHub repository is `varshithyadav17/nextrole`; the Vercel project is `nextrole-scout`; the Render service is `srv-dbdk6fvb9u1s73a010u0`. Durable D1/R2 remains attached to the original Site `appgprj_6ad224df721c8191ba6037935d0477b6`.

The connected account could retrieve Site metadata (version 41), but source write credentials, runtime configuration and database reads returned `project_not_found`; NextRole was absent from the account's owned Site list. Continue from the account that owns the original Site. Do not recreate the database or replace the production bridge/encryption secrets to work around this access boundary.

1. Open the original Site's current source with its authorized write credential. Compare it with this candidate before applying the changes; preserve hosted-only changes, its project ID, bindings, schedules, secrets and migration history.
2. Confirm a backup/rollback path and inspect applied migrations. Apply only pending additive migrations, including `0016_email_password_accounts.sql`, through the normal Site deployment workflow. The new table does not change existing account IDs or analytics records.
3. Publish the updated data-service source, including `/api/bridge/email`, Google identity linking safeguards, password-method status, owner authorization and recorded-only analytics endpoints. Verify these using the existing trusted bridge configuration.
4. Merge the reviewed source and deploy the generated Render tier with `NEXTROLE_EMAIL_ENABLED=false`. Set that flag to `true` only after the data-service migration and endpoint have been verified. Preserve every other environment variable; no new service or paid plan is required by this candidate.
5. Deploy the generated Vercel frontend to the existing project, with the existing Render, storage and app origins. No new credential belongs in frontend environment variables.
6. Verify a new email account, incorrect password, sign-out/sign-in, an existing Google account, explicit linking and owner access. Confirm that a student cannot access `/admin` or another workspace. Check saved-job/file continuity before releasing widely.
7. Compare admin counts, rating numerators/denominators, feedback messages and exports with the actual records. Historical values require those records; this change does not backfill adoption or create reviews. Observe the sanitized callback diagnostics if Google still fails.

Keep the pull request in draft until the original data service is accessible and the rollout can be completed. The email activation flag defaults to false so a partial deployment cannot pretend that a disconnected email method is working.

References: [Node crypto](https://nodejs.org/docs/latest-v22.x/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback), [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#scrypt).
