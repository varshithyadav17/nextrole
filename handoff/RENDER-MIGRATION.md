# Render + Vercel migration

## Prepared architecture

Vercel keeps the NextRole UI. A stateless Render service runs Google OIDC, signs/verifies application sessions and forwards allowlisted personal APIs to the existing owner-authorized Site data service. Existing D1/R2 remains durable storage. This is a staged backend migration, not a completed move of the database or private files to Render.

`scripts/prepare-render.mjs --out .deploy/render` generates the Render service. `render.yaml` describes it without secrets. The service uses the existing OpenID SDK, PKCE, state/nonce validation, signature verification, explicit Google account linking and independent application session secret. It uses no student AI key for identity or source maintenance.

Repeat builds safely refresh the marked `.deploy/render` output restored by Render's cache, removing stale generated routes while retaining dependency/compiler caches. Partial restores containing only real `node_modules` / `.next` directories are also supported. Nonempty arbitrary directories, other unmarked managed content and symlinked managed paths are refused. Run `node scripts/verify-render-preparation.mjs` to verify fresh, complete-cache and partial-cache preparation plus cleanup boundaries.

`scripts/prepare-vercel.mjs --out <empty-directory> --render-backend` generates the corresponding frontend. In that mode Vercel has no OAuth client secret or application signing secret. It forwards only fixed routes, selected host-only cookies and necessary headers. Render validates identity; spoofed native identity / bypass headers are never forwarded. Upload sizes, origin checks, no-store behavior and restricted secure cookie forwarding are retained.

The default generator still targets the current backend. Do not switch the production frontend before the Render service is healthy and its auth flows are verified.

## Environment placement

| Location | Configuration |
| --- | --- |
| Render | `NEXTROLE_APP_ORIGIN=https://nextrole-scout.vercel.app` |
| Render | `NEXTROLE_BACKEND_ORIGIN=https://nextrole-job-radar.ivorypine64.chatgpt.site` |
| Render, secret | `NEXTROLE_BRIDGE_SECRET`: either securely copy the existing value, or provision an independent random 32-byte hex key shared only with the data service's `NEXTROLE_RENDER_BRIDGE_SECRET`. Never replace the existing data-service/Vercel key to configure Render. |
| Render | `GOOGLE_CLIENT_ID`; secret `GOOGLE_CLIENT_SECRET` from the owner's Google Cloud OAuth web client |
| Render | `NEXTROLE_GOOGLE_ONLY=false` until account linking and recovery are verified |
| Vercel in Render mode | `NEXTROLE_APP_ORIGIN`, `NEXTROLE_RENDER_ORIGIN` (exact healthy HTTPS service origin), `NEXTROLE_STORAGE_ORIGIN` (the existing Site origin; legacy login redirect allowlist) |
| Existing data service | Retain current storage bindings, key encryption, bridge, owner authorization, push and mail configuration while it remains the data service. These secrets cannot be removed merely by adding Render. |

Google callback remains `https://nextrole-scout.vercel.app/auth/google/callback`, because Vercel forwards the callback to Render and returns secure host-only cookies at the frontend origin. Google client credentials and token exchange run on Render in the generated Render mode.

## Cutover order

1. Publish the reviewed source to a new NextRole repository. Do not reuse or overwrite an unrelated repository. Deploy `render.yaml` from that repository with automatic deploys off initially.
2. Configure the bridge secret and Google credentials securely in Render. If the existing key is write-only, add a separate random 32-byte hex credential as `NEXTROLE_RENDER_BRIDGE_SECRET` on the data service and `NEXTROLE_BRIDGE_SECRET` on Render. The data service verifies proofs/sessions against these two explicit credentials, preserving the current key and login. Register the exact Google callback and configure the consent screen. No credentials belong in Git or screenshots.
3. Check `/healthz`. Confirm both backend readiness and Google readiness. On a free Render instance, cold starts can delay login; observe this before choosing a campus hosting plan.
4. Build the Vercel frontend with `--render-backend`. Verify sign-in, Google cancellation, callback expiry, logout, private API access, PDF uploads, owner-only admin and source refresh/digest maintenance. Preserve existing account IDs. When Render uses an independent credential, existing browser sessions must sign in again at cutover; the account ID, jobs and history stay unchanged. The original Vercel build remains a compatible rollback because its key was retained.
5. Existing users must explicitly link Google from their signed-in workspace. Never merge by matching email. The current owner's linked Google identity restores its existing canonical ID and host capability. A new unlinked Google account does not become admin by matching the owner email.
6. Only after successful linking/recovery checks, set `NEXTROLE_GOOGLE_ONLY=true` on Render. The sign-in UI then shows Google only. Remove unused signing/OAuth secrets from Vercel after a successful cutover; never remove the data service's active secrets or bindings.
7. Observe auth failures, latency, source health and delivery backlog. Roll back to the previous Vercel build if needed. Existing database records and applications stay in place.

## Remaining migration boundary

A fully Render-owned database/storage backend is a separate migration: select a managed database and private object store, adapt SQLite-specific SQL/leases/triggers and R2 streaming, migrate encrypted keys without changing their encryption key, reconcile account IDs, compare counts/checksums and test backup/restore before cutover. This release does not silently export student data or replace durable storage with ephemeral Render files.

The existing owner MCP connection and its source/email schedules continue to target the existing authorized data service. They are not moved, bypassed or duplicated by this migration scaffold. A full service move must explicitly preserve those maintenance checkpoints and authorization.

References: [Render Blueprints](https://render.com/docs/blueprint-spec), [Render persistent storage](https://render.com/docs/disks), [Google OIDC](https://developers.google.com/identity/openid-connect/openid-connect).
