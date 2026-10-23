# Integrating the other-account v17 source

The existing owner-accessible Site is `appgprj_6ad224df721c8191ba6037935d0477b6`. Before this integration its live saved release was 14, source commit `a84b0c5dedb32093e1f671366aff07f92fc64558`. The other account's local labels v14–v17 are development milestones, not hosted version numbers on this Site.

The supplied v17 ZIP checksum was verified as `12e57d283906babe7986547384919191c7541509bdbfdfec6605bd7bd5da7fea`; all 292 files in its source manifest matched. It branches from the older v13 source. The original manifest and verification are retained as handoff/V17-*; earlier release documents describe historical local work. The latest handoff receipt identifies the actual merged source, saved version and deployment.

## Acceptance for this rollout

1. Preserve Site identity, public audience, runtime configuration, all existing migration history, source/alert/delivery checkpoints and student application choices.
2. Integrate the supplied confirmed career facts, versioned résumé template/PDF/LaTeX, eye assistant, editable/source-labelled answers, application records/milestones, paged browsing, personal analytics and newsletter preview.
3. Keep the live Jobicy source ID and filter, atomic page/checkpoint commits, separate older-listing availability checks, explicit unknown-versus-closed behavior, source credit, seniority and text/availability timestamps.
4. Apply only additive migrations 0008–0011 through the supported deployment. Do not recreate the database, backfill invented application events or substitute development identities/secrets.
5. Keep email sending inactive and automatic submission unimplemented. Do not activate a sender, purchase a service, create a second schedule or represent the internal JD metric as an official ATS score.
6. Run the combined suite, a direct live-v14-schema upgrade scenario, TypeScript and the supported build. Inspect actual PDF output. Report browser/device, delivery and production-capacity limits.

## Merge decisions

- Retain `jobicy-worldwide` with `geo=anywhere` rather than replacing it with the incoming branch's `jobicy-public` ID. Existing job keys and saved choices remain linked. The rolling feed never uses absent-row closure.
- Bring over the incoming source registry, source-run history, parser version 3, whole-place/country matching, incomplete-evidence/freshness checks and server-paged catalogue. Keep the live bulk status pipeline and category metrics.
- Treat unresolved Jobicy geography conservatively. Source seniority remains additional evidence; an Entry-level label alone never fabricates a zero-year requirement.
- Preserve the incoming legacy résumé renderer and `nextrole-letter-v1`. The hosted PDF renderer remains distinct from local LaTeX compilation. Submitted copies remain immutable.
- Preserve the optional mail worker behind its explicit configuration gate. The verified existing runtime revision is 4, required auth/encryption/push names are present, and mail is unconfigured. No secret values were exported or replaced.
- The production database overview contained the original 15 user tables. A separate isolated upgrade test applies the four pending migrations, resumes a saved opaque source cursor, and checks old choices, keys, notes, stages and closed history. It uses no production rows.

## Verification and remaining scope

See handoff/VERIFICATION.md for final combined results. The original v17 global lint baseline remains a historical record, not a claim that every merged file passes lint. Source hashes and a clean build are not browser or production-load proof.

The long-term product requirements are recorded in PRODUCT-VISION.md. Broad platform coverage, actual Auto-Apply, role-specific file uploads, conversational résumé rewriting, sourced company preparation and activated nightly delivery remain separate work. The original Site maintenance remains in place; source failures and delivery backlogs must still be surfaced to the owner.

## Runtime regression caught after initial publication

Native version 15 was published, then its owner-authorized refresh exposed an incoming Worker incompatibility: redirect mode error is unsupported at the edge. All 20 ATS source attempts preserved their prior listings on failure. The correction uses manual redirect handling with the existing non-2xx refusal, and a new native Worker regression exercises the actual feed adapters. It does not enable email sending or loosen destination checks. Normal maintenance was drained without forcing/restarting its sweep. The final ZIP receipt identifies the subsequent corrective release and live health; version 15 is not the intended final handoff.
