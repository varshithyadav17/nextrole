# NextRole design fidelity review
final result: passed

Reviewed 24 October 2026 (Asia/Kolkata). This result covers the student workspace visual correction and the interactions listed below. It is not a claim of pixel-identical generated illustrations, live-provider AI/PDF testing, Google sign-in completion, or campus-load certification.

## Evidence and normalization
- Approved Jobs and Saved boards: docs/design/scout-city-jobs-target.webp and scout-saved-target.webp, each 1487 × 1058.
- Approved action studies: docs/design/scout-page-actions-target.webp, 1182 × 1330. These are header/action studies, not full-page wireframes.
- Desktop: actual Chrome viewport 1363 × 936, DPR 1. Source boards resized proportionally to width 1363 and cropped to the same viewport height; the source's remaining lower area is outside that comparison. Bottom-anchored controls adapt to the shorter browser.
- Mobile: actual 390 × 844 CSS iframe viewport in the same cloud browser, DPR 1; 375 px document client width with a 15 px desktop scrollbar. This checks responsive browser layout, not physical-device keyboard behavior.
- docs/review/jobs-comparison.jpg and saved-comparison.jpg contain source and rendered implementation together. Focused job-row comparisons are also retained.
- docs/review/page-actions-comparison.jpg combines the approved action board with rendered Applications, Progress, archive, Preferences and Help headers.
- All account/job data in captures are synthetic and isolated in the development-only /design-preview harness. That route returns notFound in production. No real student screenshot, record, API key or email is used as demo data.

## Findings, fixes and post-fix evidence
- [P1 fixed] Small, detached city/header composition and narrow type hierarchy. Replaced the split desktop layout with the wide city scene, one-line bold serif heading, formal Scout carrying a file, NEXT JOB storefront, and proportional desktop geometry. See jobs-comparison.jpg.
- [P1 fixed] Sidebar clutter and duplicate assistant entry. Bottom utilities and a single profile menu replace the promotional card/permanent logout row. Floating ScoutX and direct full-page conversation remain. Logout, Help, notifications, settings and motion are in the profile menu.
- [P2 fixed] Sidebar text wrapping, excessive row heights and duplicated loading labels. Navigation stays on one line, job rows use the reference's identity/facts/actions rhythm, and only one loading status remains.
- [P2 fixed] Saved artwork/header scale and spacing. Larger folder-peeking Scout and bold heading match the approved composition, with search immediately above the saved rows. See saved-comparison.jpg.
- [P1 fixed] Mobile profile dropdown rendered behind the sidebar (observed z-index 70 vs 90), hiding Log out. The dropdown and its positioning wrapper now use z-index 120. The pre-fix browser capture could not be attached; mobile-account-fixed.jpg records the verified correction.
- [P2 fixed] Mobile Saved subtitle overlapped the folder art. Limited the subtitle measure. See mobile-saved.jpg and mobile-saved-fixed.jpg.
- [P2 fixed] Mobile icon-only filter/refresh controls had no useful accessible name. Added explicit labels. Filter and arrangement controls were exercised afterward.
- [P2 fixed] Escape propagated from the profile menu and also closed mobile navigation. The menu now stops that event; the retest left the sidebar open and returned focus to its profile trigger.
- [Preview-only fix] HTTP preview lacks crypto.randomUUID. The development-only fixture supplies UUIDs using getRandomValues, and keeps local navigation on its review route. Production authentication and cryptography are unchanged.

## Required fidelity surfaces
| Surface | Result |
| --- | --- |
| Fonts and typography | Bold Georgia display headings, Arial interface text, corrected sizing/weight, one-line desktop Jobs heading, readable input sizes. Source font is inferred from raster artwork; minor glyph/raster differences are P3. |
| Spacing and layout | Proportional 241/1487 sidebar, ~328 px Jobs hero and ~304 px Saved hero at the reviewed width. Search/list alignment, compact rows and bottom utilities were checked in combined comparisons. Desktop scrollWidth equals clientWidth (1363). Mobile scrollWidth equals clientWidth (375). |
| Colors and tokens | Pale ivory/white, near-black headings, orange primary actions and teal bookmarks/bars. Focus stays light with an orange ring; no black typing rectangle. |
| Image quality and fidelity | Existing approved-direction WebP assets are used: office street, formal file-carrying Scout, and per-page actions. NEXT JOB/ORBIT TECH remain part of the raster scene. No CSS/SVG approximation replaced artwork. Minor pose, texture and storefront details differ from the generated boards (P3). |
| Copy and content | Minimal headings/labels follow the references. Actual source descriptions, confirmed eligibility evidence and deadlines remain honest. Unconfirmed experience is never relabeled as zero years. Absolute dates, contextual source/view controls and synthetic-preview disclosure intentionally differ from mock copy. |

## Browser checks performed
- Desktop Jobs/Saved/Applications/Progress/archive/Preferences/Help; page action artwork and floating ScoutX.
- Profile menu includes Log out and Help; motion pause works. Mobile dropdown is visible; Escape closes only that dropdown.
- Keyword search narrowed discovery to Data Analyst Intern.
- Hybrid arrangement filter returned one matching saved opening, then clearing restored all three.
- Save moved a fictional job into Saved (3 to 4); Mark applied moved the selected saved job to Applications (1 to 2).
- Not interested moved a fictional job to archive; Restore returned it to discovery.
- Full job page opens with JD, evidence, notes and Scout context; Back returns to Saved. A saved note was present after reopening.
- Scout accepts typed chat, renders a guided fixture reply, and shows the selected company/job context. PDF attachment controls and résumé/JD actions remain available; no live provider or real résumé was sent.
- Analytics CSV downloaded in browser review. Advanced expanded/collapsed.
- Browser console inspection found no application-origin errors in the final review session. Browser-extension infrastructure messages were excluded.
- Running Scout loader remains removed. Decorative entrance/reaction motion remains controlled by the existing pause, reduced-motion and document-visibility provider.

## Expected differences / P3 follow-up
- Generated source boards are illustrations of a UI, not executable pixel specifications: exact artwork details, glyph shapes and the source's paper texture cannot be treated as identical pixels.
- Real listing length, dates, eligibility and status vary; production never seeds the example jobs.
- The development disclosure replaces the mock's Design concept badge. View/source/refresh access is retained in compact controls.
- No new full design target was supplied for mobile, job-detail body, or form contents. Those preserve existing product behavior within the approved visual system.

## Validation and release boundaries
TypeScript, the native production build, the generated Next.js webpack production build and the existing 10 navigation-hook checks are required for this source revision. The generated frontend build passed; native final packaging reruns the native build and type check. One manual default-Turbopack invocation failed on a local dependency symlink; the project's actual build script (next build --webpack) passed.

Google OAuth, external applications, student keys, nightly email opt-ins, sharing, storage schemas and application history were not changed or exercised against production. Real-device, real-provider PDF/AI and campus-load checks remain separate.

The owner required rendered comparison before GitHub synchronization/publication. This visual gate is now passed for this scoped revision. Vercel team access still returns 403; its required team-authorization tools are not exposed, so no Vercel release may be claimed. Native Site release receipts establish publication separately.

## Implementation checklist
- [x] Open source boards and actual Chrome captures together.
- [x] Fix observed P0/P1/P2 issues and recapture.
- [x] Check all five fidelity surfaces and key desktop/mobile interactions.
- [x] Retain synthetic-only evidence and preserve existing backend/auth behavior.
- [ ] Record final source/GitHub/native deployment receipts.
