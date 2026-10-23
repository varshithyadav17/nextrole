# Continue the Scout release

The authorized target is the existing public Site appgprj_6ad224df721c8191ba6037935d0477b6 at https://nextrole-job-radar.ivorypine64.chatgpt.site. The original account handoff explicitly authorizes publishing the reviewed, compared and verified changes. The user also requested Scout, controlled Auto-Apply and nightly email. No paid service, new sender credentials, broader sharing or destructive operation was invented.

The original eight SQL migrations are unchanged. All thirteen migrations are included; a database already on native version 16 needs only 0012. A v14 schema needs 0008–0012. Private R2 binding BUCKET is now required. Publish only through the supported Sites source/build/save/deploy flow, which applies pending hosted migrations before the Worker. Do not reset the database, change the stable encryption root, replace push secrets, reorder existing source IDs or replay checkpoints with force.

The final ZIP's DEPLOYMENT-RECEIPT.json records the native saved version, exact pushed source SHA, archive hash, deployment state and URL, environment revision and post-publication health. Earlier incoming deployment notes are historical and retained separately. The source manifest verifies the exact source; the receipt is kept outside it to avoid a commit/hash circular reference.

For later work, reopen this existing project through authorized source access, compare any newer remote changes, and retain audience/configuration. Local helpers in this ZIP create only development keys and local database state; they must never target production. Keep email inactive until sender/provider/domain setup is approved and tested. See EMAIL-ACTIVATION.md and the final deployment receipt for the separate nightly task. Saving a schedule does not configure a sender or prove delivery.

## Move to another editor or repository

The complete application code can be edited outside ChatGPT. Open this directory in your editor and follow `START-HERE.md`. If creating a new Git repository, run the local setup helper first so `.dev.vars` exclusions are present, then review changes before committing. Preserve `pnpm-lock.yaml`, package versions, vendor notices, `.openai/hosting.json` and all migration history.

If continuing on the original hosting platform, reconnect through its authorized source workflow when publishing. A clean ZIP intentionally omits `.git` and its credentials/history.

## Move to another hosting platform

The app currently targets the Cloudflare Worker runtime. It imports `cloudflare:workers` and uses D1 and private R2. A generic static upload, ordinary Next.js hosting, or a Vercel deployment is not a drop-in replacement for its backend.

Before public release on another host:

1. Implement and test a trusted authentication/session adapter in place of Sites identity; preserve server authorization and ownership. Never trust client-provided identity headers.
2. Provision the Worker/D1/R2 runtime or implement and test a compatible database/environment adapter. Set real production binding IDs and apply all pending migrations once.
3. Configure real secrets securely. If moving existing encrypted records, migrate their stable user IDs and transfer the matching encryption root separately and securely.
4. Replace the platform MCP maintenance invocation with an owner-authorized scheduler/worker appropriate to that host. Preserve saved source/alert/delivery checkpoints, retry semantics and cleanup. Never expose an anonymous maintenance writer.
5. Review all Site/domain references, Web Push subject, service worker and browser subscription lifecycle for the new origin. The companion pins the current NextRole origin in its manifest, popup and service worker: rebuild/review it for any new origin; do not forward the existing token there.
6. Verify account isolation, host authorization, Apply versus Applied, export/deletion, feedback, real-device push, relevance, load, billing and restore before inviting users.

No standalone external-host deployment or replacement OAuth stack has been implemented or verified in this handoff.

## Existing background maintenance contract

`app/mcp/route.ts` exposes owner-authorized `nextrole_refresh_sources` and `nextrole_refresh_status`. The updater repeatedly resumes `workPending` rather than forcing/restarting sweeps, and verifies source and aggregate delivery health. Pending analytics cleanup also contributes to work. Deferred push retries are allowed to wait until due. See `OPERATIONS.md` for the current supported connection and complete operational contract.

The retired `scripts/refresh-live.py` intentionally exits; it must not be restored as an identity-free HTTP updater. Do not create duplicate schedules while reconnecting the existing project.

Version 11 migration 0007 adds only nullable jobs.canonical_url and its index. Preserve existing keys and per-user history. Appending new source definitions preserves source-sweep cursor compatibility; do not reorder existing board entries in a live registry.
