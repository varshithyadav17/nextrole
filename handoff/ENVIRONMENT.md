# Environment and secrets

## Why jobs appear without a personal API key

ChatGPT is the identity provider. Real employer ATS feeds supply the job catalogue. Keyword search, deterministic matching, tracking, reminders and analytics use application code and the database. They do not call ChatGPT or another LLM.

Only a student-requested AI ranking, fit explanation, Scout conversation or reviewed fact extraction may use that student's enabled encrypted API slots. There is no global provider credential fallback. Never add `OPENAI_API_KEY`, `GEMINI_API_KEY` or `GROQ_API_KEY` as a workaround for student quotas. Three keys in the same provider project can share the same provider limits.

## Server configuration

| Name | Purpose |
| --- | --- |
| `BUCKET` | Private R2 binding for original résumé uploads, configured by hosting. |
| `DB` | Cloudflare D1 binding, configured through hosting rather than a text password. |
| `NEXTROLE_OWNER_EMAIL` | Exact trusted signed-in owner email; authorizes Host workspace and maintenance. |
| `KEYRING_ENCRYPTION_KEY` | Stable secret, exactly 64 hexadecimal characters representing 32 random bytes. Encrypts personal provider keys. |
| `VAPID_PUBLIC_KEY` | Public Web Push application key. |
| `VAPID_PRIVATE_KEY` | Matching secret Web Push private key. |
| `VAPID_SUBJECT` | Operator contact URI for Web Push, such as an appropriate `mailto:` address or HTTPS URL. |

See `.dev.vars.example` for variable names. `node handoff/setup-local.mjs` generates valid fresh development keys and sets the local mock owner. It prints no keys and preserves existing configuration. No local values are copied from the hosted app.

On Sites, configure server values with the platform's authenticated runtime-environment controls and preserve existing production values. `.dev.vars` is for local development only. Keep secret values out of `.openai/hosting.json`, browser bundles, Git, screenshots, analytics, feedback and prompts. Keep any provider key only in its user's encrypted connection.

## Identity and portability

Production identity is injected by the trusted Sites platform. `app/chatgpt-auth.ts` reads that identity. The loopback-only test identity in `build/sites-vite-plugin.ts` exists only during portable development; it is absent from production builds.

The supported Vercel generator replaces the Site header reader with server-side signed-cookie verification, and strips identity, cookie, authorization and bypass headers before proxying. The retained Site checks the signed bridge identity itself. Native Site requests continue using platform identity. See VERCEL.md. Never expose the original native header-reading implementation on an arbitrary public server or use an access/bypass token as identity.

User IDs are Site-scoped. Creating a different Site does not automatically reconnect existing student records. Preserve the existing project for continued deployment or explicitly design and test a user-ID/data migration.

## Backup boundary

The ZIP has schema/migrations, not live database rows or live credentials. Restoring encrypted student keys needs both the database backup and its matching stable `KEYRING_ENCRYPTION_KEY`. Generating a different root does not decrypt old ciphertext. Obtain any real backup through owner-authorized platform controls, transfer it securely, and rehearse restoration in an isolated environment. Backup/restore capabilities and retention need verification with the actual hosting account.

Changing a domain or Web Push key pair can require browser subscriptions to be renewed. Rotating credentials is separate from copying code. Provider calls, hosting, storage and monitoring can have costs; this source handoff does not create unlimited API credits or a prepaid hosting account.

## Optional mail transport

See EMAIL-ACTIVATION.md for exact settings, verified-domain prerequisites and the nightly task. Current production sender credentials are absent. NEXTROLE_MAIL_DAILY_BUDGET defaults to 50; it can be raised only within the approved provider account quota. Acceptance is not proven inbox delivery. Never add an operator LLM key as a fallback for students.

## Vercel bridge

The Site adds `NEXTROLE_BRIDGE_SECRET` (independent 32-byte secret encoded as 64 lowercase hex characters), `NEXTROLE_BRIDGE_ISSUER` (exact native backend HTTPS origin) and `NEXTROLE_VERCEL_ORIGIN` (exact canonical Vercel HTTPS origin). Vercel production uses the same bridge secret plus `NEXTROLE_BACKEND_ORIGIN` and `NEXTROLE_APP_ORIGIN`. These values are configured through native hosting tools, not committed files. No global LLM key is configured.
