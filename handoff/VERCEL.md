# NextRole on Vercel

Canonical frontend: https://nextrole-scout.vercel.app

Retained Vercel project: `prj_6MsqOzhV4nAgtZSve5zhjqoecd2M` (`nextrole-scout`). Use the authenticated connection's current default scope with this exact project ID. Passing its reported account ID as a team selector returned a scope error, while project-ID access through the connection's default scope succeeded. Do not create a duplicate project or switch to unrelated CLI credentials.

The complete ZIP includes the authoritative deployment receipts and generated frontend source. The frontend is a conventional Next.js 16 app. It is a hybrid deployment: the existing Site remains the authenticated data service, retaining D1, private R2 files, personal encrypted AI connections, host authorization, MCP maintenance and existing source/nightly schedules. No student records are copied into Vercel, and no extra cron is created.

## Reproduce the frontend

From the complete source checkout:

```sh
node scripts/prepare-vercel.mjs --out /absolute/empty/nextrole-vercel
cd /absolute/empty/nextrole-vercel
pnpm install --frozen-lockfile
pnpm build
```

Node 22 or 24 and pnpm 11.25.0 are required. The generator carries the matching pnpm workspace policy/overrides with its frozen lockfile, copies the UI and reviewed support code, replaces backend routes with fixed-route proxies, bundles the pinned PDF.js worker and emits VERCEL-SOURCE-MANIFEST.json. Do not deploy the original Vinext tree directly to Vercel. Deploy the generated tree to the retained Vercel project with the Next.js preset and production environment. It requires no Cloudflare binding on Vercel. Keep dependency versions and lockfile together.

## Environment

| Host | Variable | Purpose |
| --- | --- | --- |
| Site | `NEXTROLE_BRIDGE_SECRET` | Independent random 32-byte secret, 64 lowercase hexadecimal characters. |
| Site | `NEXTROLE_BRIDGE_ISSUER` | `https://nextrole-job-radar.ivorypine64.chatgpt.site` |
| Site | `NEXTROLE_VERCEL_ORIGIN` | `https://nextrole-scout.vercel.app` |
| Vercel production | `NEXTROLE_BRIDGE_SECRET` | Same private bridge secret, stored as a sensitive variable. |
| Vercel production | `NEXTROLE_BACKEND_ORIGIN` | Exact native backend HTTPS origin above. |
| Vercel production | `NEXTROLE_APP_ORIGIN` | Exact canonical Vercel HTTPS origin above. |

Keep the existing encryption root, owner email, push keys, storage and sharing unchanged. Environment edits on Sites need a new native deployment to take effect. Vercel environment edits apply to newly built deployments. Preview deployments intentionally have no production session secret and retain Vercel authentication protection. Production is publicly reachable; the application still enforces personal/host authorization.

The ZIP has no live secrets or database backup. Manage credentials in the authenticated provider controls. Rotating the bridge secret invalidates existing Vercel application sessions; it does not require changing the student-key encryption root. Changing the canonical domain requires coordinated exact-origin updates and a new deployment of both components. Avoid wildcard callbacks and untrusted Host-derived origins.

## Login and private requests

Vercel starts a top-level sign-in on the retained Site, which uses its native ChatGPT identity. The Site accepts only the configured callback with S256 PKCE and high-entropy state. A two-minute, hashed, one-time authorization code is consumed atomically. Vercel verifies browser state and the resulting audience/issuer-bound session, then sets a Secure, HttpOnly, SameSite=Lax cookie for at most 24 hours. The original Site-scoped user ID preserves existing work and the host role.

The frontend never trusts visitor-supplied `oai-*`, authorization or bypass headers. Server proxy calls send only the verified application session to a fixed backend route; the backend independently verifies it. Mutations require the exact Vercel Origin. Responses remain private/no-store and do not relay backend cookies or redirects. Code exchange is signed server-to-server; no Site bypass credential is used. Expired code metadata is bounded and cleaned during maintenance and subsequent sign-in; workspace deletion clears outstanding codes.

Native reserved sign-in/out/callback paths are untouched on the Site. Those paths exist only in the separately generated Vercel tree. Vercel sign-out clears its own session cookies, rather than logging the visitor out of their ChatGPT account. Browser end-to-end verification remains necessary; protocol/handler tests do not prove a real provider redirect/cookie round trip.

## Product boundaries

- Uploads are limited to 4 MiB per original, 10 originals and 25 MiB per workspace. Browser extraction and server/proxy limits align with Vercel's 4.5 MB request cap. Private originals remain in R2.
- Large response bodies are forwarded as streams. Actual production download/export limits should be measured with the intended cohort.
- Source refreshes and the existing nightly email task stay on the owner-authorized Site connection. Do not add a duplicate scheduler or anonymous maintenance route on Vercel.
- The paired browser companion still targets the retained Site, using its own scoped, expiring applicant token. Vercel does not expose the native maintenance, companion or MCP transport as an anonymous proxy.
- Email unsubscribe on the Vercel frontend redirects to the fixed native endpoint, which verifies the recipient token. Email delivery remains disabled until a verified sender is configured.
- Full migration away from Sites would require a new trusted identity adapter plus an explicit database, files, encryption-key and user-ID migration. This release does not claim that migration occurred.

## Verification

Run the normal native checks/build and:

```sh
node --experimental-strip-types scripts/verify-vercel.mjs /absolute/nextrole-vercel
```

This exercises the actual generated auth/proxy/callback handlers with isolated fixtures, including forged identity, token expiry/tampering, CSRF, fixed upstream routing, upload limits, state/PKCE, session validation and logout. The shared suite additionally tests one-time and concurrent D1 code consumption. The build and HTTP receipts are in the ZIP. Real browser/mobile login, device notifications, actual employer forms, mail sender/inbox delivery, production campus load and a restore rehearsal remain separate checks.

The current connection can create and inspect the retained project/deployments, but its build-log endpoint returned a scope authorization error. No separate CLI credentials were available. This release does not claim a runtime error-log scan; verify monitoring/log access in the actual Vercel account before the campus pilot.
