# Current job pages and Google sign-in release

Read `JOB-PAGES-GOOGLE.md` first. Full job pages preserve navigation and include job-scoped ScoutX. Google OAuth/login/signup/linking is implemented on Vercel but still requires the owner's registered Google client credentials and real-account activation checks. Existing ChatGPT sign-in remains. Migration 0014 adds only sign-in mapping; student work, DB/R2, secrets, public sharing and schedules are retained.

# Current ScoutX conversation release

Read `SCOUTX-CHAT.md` for bounded multi-turn context, provider role adapters, chat formatting and explicit AI/guided modes. `SCOUT-PDF.md` remains the PDF and fixed-template reference. Preserve the existing project, identities, DB/R2, encryption root, application history, schedules and public audience. No migration or new secret is required. Exact publication receipts determine the live version.

# Current Scout PDF release

Read `SCOUT-PDF.md` for the current attachment, consent, review and download flow. The existing project, student identities, DB, R2, encryption root and tracking history are retained. No migration is added. Exact publication results are recorded separately.

# Extension installation and user guide release

Current presentation update: `DESIGN-RESTORE.md` restores the animated Scout Discovery home, visible sidebar artwork and concise screens. Version 25's backend/data improvements remain; this update adds no migration.

Current focused product release: read `FOCUSED-RELEASE.md` first. It adds schema migration 0013, Today and transparent requirement evidence while preserving existing student work. This release's native publication and Vercel authorization status are separate from the historical release notes below.

The current release adds /extension, visible in-product downloads, a shared online/offline user guide, synchronized version/size/hash metadata, pairing deep links and browser popup fallback fixes. The same Site/database, keys and per-user data are preserved. Read handoff/SCOUT-COMPANION.md and the generated companion/SETUP.txt. Actual Chrome/Edge installation and live employer forms are still separate manual validation gates; automated tests and a browser guide preview do not verify a real submission.

# Scout Companion 0.2 release

This update adds a user-initiated side panel, private reviewed job imports, local drafts, explicit Workspace assistance pairing, single-job preference/status lookup, confirmed manual tracking, and direct job-scoped Scout links. Existing limited tokens are not expanded. Native backend and Vercel retain the same identity, database and encryption root. No SQL migration or paid provider activation is needed. Read EXTENSION-BETA.md. Exact release commit and deployment IDs are in the external receipt. Real Chrome/Edge/ATS validation and Web Store publication remain pending.

# NextRole chat/Vercel project state

The 21 October expansion adds optional, disabled-by-default Google Jobs discovery through SerpApi, owner search/budget controls, private continuation and request counters, source attribution, and strict review-only handling of indexed leads. No provider key or paid request was activated. Read JOB-DISCOVERY.md for activation, limits and source-rights boundaries. The external deployment receipt identifies the exact release commit/version. No database migration is needed.

NextRole uses existing Site appgprj_6ad224df721c8191ba6037935d0477b6 at https://nextrole-job-radar.ivorypine64.chatgpt.site. This release was opened from published commit e253cd85da1f3808779367764b2be4776fc3747f (native version 17). The final external deployment receipt identifies this expansion's actual saved version and commit.

The expansion adds five private tables with migration 0012_milky_fabian_cortez.sql: resume_files, scout_threads, automation_settings, automation_tokens and automation_queue. It adds private R2 binding BUCKET. Migrations 0000–0011 remain unchanged. Keep DB, encryption root, push keys, source IDs/job keys, legacy renderers and saved checkpoints stable.

Shared discovery and deterministic scoring/building use no LLM key. Scout conversation/import uses only the requesting account's encrypted BYOK routing after explicit consent. The browser companion has its own expiring hashed credential and no provider-key/source-maintenance privileges. No Site dispatch/bypass token is used as student identity.

Read ../START-HERE.md, ../PM-EXECUTION-STATUS.md, SCOUT-COMPANION.md, EMAIL-ACTIVATION.md and VERIFICATION.md. Historical INCOMING-V17-* and V13–V17 documents remain for provenance. They are not the current deployment receipt.

The ZIP contains complete tracked source, fonts/licenses, migration history, companion source/download and verification evidence. It does not include production secrets, student records, dependencies or a production database backup. SOURCE-MANIFEST.json hashes every packaged source file except itself.

Vercel project `prj_6MsqOzhV4nAgtZSve5zhjqoecd2M` serves the frontend at https://nextrole-scout.vercel.app. Read VERCEL.md before deploying it. It does not seed/migrate a new database. The bridge uses an independent server-held signing secret, exact HTTPS audience/issuer, S256 PKCE, a two-minute single-use code and a 24-hour Secure HttpOnly application cookie. Native Site sign-in remains intact. No new SQL migrations were introduced in this release.
