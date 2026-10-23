> Current v17 local review: read RELEASE-17.md, handoff/RESUME-TEMPLATE.md and handoff/VERIFICATION.md. The supplied résumé layout is implemented for new preparations; existing documents keep their versions. No deployment or mail activation exists. Earlier release statements below are historical.

> Current v16 local review: read RELEASE-16.md, PM-EXECUTION-STATUS.md and handoff/VERIFICATION.md. No v16 deployment or mail activation exists. Earlier release statements below are historical.

> Current v15 review candidate: see ../RELEASE-15.md. Server-paged browsing and durable source history are implemented and tested locally. The earlier source/feature status below is historical; no v15 hosted version or deployment exists.

> Current v14 local review candidate: see ../RELEASE-14.md. Verified-fact preparation, private imports, configurable sources and security updates supersede the older feature/status descriptions below. No v14 hosted version or deployment was created. Historical release details remain for provenance.

# Continue development and deployment

## Keep the existing Sites project

The current project is `appgprj_6ad224df721c8191ba6037935d0477b6`; `.openai/hosting.json` preserves its identity, `DB` binding and MCP capability. The public URL is https://nextrole-job-radar.ivorypine64.chatgpt.site.

In a future Sites-enabled assistant session, select that existing project, inspect its current version, obtain its supported source-repository access, and open/synchronize the existing source through the current Sites workflow. This ZIP has no Git remote credentials or session tokens. Do not register a duplicate Site or overwrite newer changes without first comparing them.

The current version 13 is saved only, with no deployment. The PM brief requires explicit owner approval before production publication. After that approval, deploy the exact saved version, resume the existing authenticated refresh without forcing/restarting it, and check source and delivery health.

For a release: append and inspect migrations when the schema changes, run the appropriate isolated checks and production build, synchronize the exact source state, save its matching version/archive and deploy through the owner-authorized Sites tools. Preserve the existing audience and runtime secrets. Sites applies its hosted migrations before publishing the Worker. Keep existing production encryption and push keys stable unless deliberately migrating them.

The optional setup scripts under `handoff/` are for local development. They are not production migration or deployment tools. Nothing in creating this ZIP changes the current deployment.

## Move to another editor or repository

The complete application code can be edited outside ChatGPT. Open this directory in your editor and follow `START-HERE.md`. If creating a new Git repository, run the local setup helper first so `.dev.vars` exclusions are present, then review changes before committing. Preserve `pnpm-lock.yaml`, package versions, vendor notices, `.openai/hosting.json` and all migration history.

If continuing on the original hosting platform, reconnect through its authorized source workflow when publishing. A clean ZIP intentionally omits `.git` and its credentials/history.

## Move to another hosting platform

The app currently targets the Cloudflare Worker runtime. It imports `cloudflare:workers` and uses D1. A generic static upload, ordinary Next.js hosting, or a Vercel deployment is not a drop-in replacement for its backend.

Before public release on another host:

1. Implement and test a trusted authentication/session adapter in place of Sites identity; preserve server authorization and ownership. Never trust client-provided identity headers.
2. Provision the Worker/D1 runtime or implement and test a compatible database/environment adapter. Set real production binding IDs and apply all pending migrations once.
3. Configure real secrets securely. If moving existing encrypted records, migrate their stable user IDs and transfer the matching encryption root separately and securely.
4. Replace the platform MCP maintenance invocation with an owner-authorized scheduler/worker appropriate to that host. Preserve saved source/alert/delivery checkpoints, retry semantics and cleanup. Never expose an anonymous maintenance writer.
5. Review the old Site/domain references, Web Push subject, service worker and browser subscription lifecycle for the new origin.
6. Verify account isolation, host authorization, Apply versus Applied, export/deletion, feedback, real-device push, relevance, load, billing and restore before inviting users.

No standalone external-host deployment or replacement OAuth stack has been implemented or verified in this handoff.

## Existing background maintenance contract

`app/mcp/route.ts` exposes owner-authorized `nextrole_refresh_sources` and `nextrole_refresh_status`. The updater repeatedly resumes `workPending` rather than forcing/restarting sweeps, and verifies source and aggregate delivery health. Pending analytics cleanup also contributes to work. Deferred push retries are allowed to wait until due. See `OPERATIONS.md` for the current supported connection and complete operational contract.

The retired `scripts/refresh-live.py` intentionally exits; it must not be restored as an identity-free HTTP updater. Do not create duplicate schedules while reconnecting the existing project.

Version 11 migration 0007 adds only nullable jobs.canonical_url and its index. Preserve existing keys and per-user history. Appending new source definitions preserves source-sweep cursor compatibility; do not reorder existing board entries in a live registry.
