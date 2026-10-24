# NextRole hero framing and blend correction
final result: passed

24 October 2026 (Asia/Kolkata). Scope: keep the NEXT JOB storefront sign visible and blend the city street into the page, preserving v38's approved compact UI sizing and all functional behavior.

The owner-provided screenshot showed the sign cropped above a short header and a hard pavement edge. It was inspected locally and is not copied to the public repository. docs/review/compact/laptop.jpg supplies a synthetic v38 before view. docs/review/hero/comparison.jpg places that view together with the actual corrected browser capture at the same 1363 × 936 outer viewport and 1280 × 720 iframe (DPR 1). The corrected mobile capture is hero/mobile.jpg. The desktop capture was verified locally and is excluded from repository source after automatic publication review rejected its public upload; this does not block the application correction. The source illustration is unchanged at public/art/scout-pages/city-street.webp, RGBA 1280 × 640.

- [P1 fixed] Full-width cover scaling cropped away the storefront fascia when the header shrank to 230 px. The street container width is now capped relative to its height (620 × 230 px at the reviewed laptop size), limiting the vertical crop while retaining the full sign. Desktop and mobile were visually checked for the complete NEXT JOB lettering.
- [P2 fixed] Pavement ended at a visible horizontal edge. Two presentation masks feather only the existing street raster along the left, top and bottom, leaving the interactive Scout separate and opaque. Browser readback confirmed the intersect composition and the actual captures show a soft canvas transition.
- [P2 fixed] On narrow screens Scout's head occupied the sign area. The mobile and medium-width horizontal anchors move Scout to the left of the frontage without changing the approved character size, art or animation.

Required surfaces: fonts and type hierarchy are unchanged (14 px laptop navigation, 46.08 px laptop main heading); spacing and controls retain v38 dimensions; colors and focus tokens are unchanged; the original image is reframed rather than replaced, stretched or given a text overlay; no app copy was changed. Laptop document client and scroll width remain equal at 1265 px. Mobile and full desktop views show the complete sign and softened edge. This scoped correction does not claim pixel-identical generated art, real-device keyboard testing or full-product certification.

The Scout greeting button was clicked in the browser and returned You’ve got this. Application-origin console error checks were empty. TypeScript and the native production build passed. No student data, auth, backend, sharing, provider or maintenance setting changed. The Vercel copy remains unchanged pending its existing team-access issue.

The compact sizing review below is retained as historical evidence for the preceding revision; its UI dimensions remain in effect.

---

# NextRole compact sizing review

24 October 2026, Asia/Kolkata. Scope: restore the earlier compact UI sizes while keeping the approved Scout composition and artwork. This supersedes the v37 density judgment, which the owner rejected as enlarged. This is not a pixel-identical clone claim.

## Visual truth and normalization

The owner supplied Jobs, Saved and Scout action boards. Their persistent references are docs/design/scout-city-jobs-target.webp and scout-saved-target.webp (1487 × 1058), and scout-page-actions-target.webp (1182 × 1330). The latest instruction changes interface density while preserving this composition. Raster reference pixels must not be copied directly into CSS font sizes.

Browser-rendered evidence is docs/review/compact/jobs.jpg, saved.jpg, laptop.jpg and mobile.jpg. Full source/render comparison: compact/comparison.jpg; focused row/type/action comparison: compact/rows.jpg. Both were opened together for comparison. Prior enlarged screenshots remain in docs/review/jobs-final.jpg and saved-final.jpg.

Desktop Chrome: 1363 × 936 CSS px, DPR 1. Source board proportionally resized to 1363 px wide and cropped to the same height. Laptop iframe: 1280 × 720 CSS px, 1265 px document client/scroll width after scrollbar. Mobile iframe: 390 × 844 CSS px, 375 px document client/scroll width. These are same-origin browser viewport checks, not physical-device or keyboard tests. All jobs/accounts in screenshots are clearly synthetic; production returns notFound for the review route.

## Findings, fixes and comparison history

- [P1 fixed] v37 tied interface density to a large mockup scale. compact-layout.css restores the original 208 px sidebar, 14 px navigation, 16 px job titles, 12–13 px supporting text, 46 px company marks, 47 px search controls, 42 px desktop actions and 108 px normal discovery rows. No CSS or browser zoom is used. Current desktop readback confirmed 14 px nav, 49.068 px main heading, 108 px rows, and equal client/scroll width (1363).
- [P1 fixed] Display headings and forms were oversized. Jobs/Saved titles now cap at 54 px; desktop fields use 14 px while mobile text entry remains 16 px. Scout artwork is sized independently, retaining its aspect ratio and prominence.
- [P2 fixed] In the initial laptop check the collapsed assistant overlapped the final job action. A height-specific 230 px Jobs header now keeps the action bottom (641.48 px) above the launcher top (646 px). The release recheck confirmed the same values and no horizontal overflow.
- [P2 fixed] Initial mobile hero minimum left the first action underneath the assistant. Reducing unused hero height from 390 to 360 px keeps the existing 180 px city scene. Post-fix first-action bottom is 759.39 px, launcher top 770 px. The menu and normal content remain scrollable.
- Early rapid screenshots captured a previous paint or an illustration still loading; these were excluded. Settled Preferences review confirmed the image decoded at its 320 px source size and rendered at 220 px. A workspace refresh required restoring the same reviewed code; fresh release Jobs/Saved/laptop/mobile checks confirm that restoration. Compact CSS blob: 442dc39180e468b9ebc5da81d6797ca49cb50ef6.

## Required fidelity surfaces

| Surface | Result |
| --- | --- |
| Typography | Georgia headings and Arial UI retained. Earlier compact hierarchy restored; focused comparisons checked wrapping and readable controls. |
| Spacing/layout | 46 px nav, 47 px search, compact rows/gaps. Short viewport overlap fixes were checked again. No horizontal overflow at reviewed sizes. |
| Colors/tokens | Ivory canvas, white rows, orange actions, teal saves and light focus retained. No black input rectangle. |
| Artwork | Existing city, NEXT JOB storefront, formal file-carrying Scout and per-page WebPs retained. No stretching, replacement code art or new imagery. |
| Copy/content | Existing labels, JD excerpts, source evidence and deadlines retained. Unconfirmed experience is not relabelled zero; demo eligibility stays synthetic. |

## Interaction checks and scope

During this sizing correction, Saved keyword search narrowed to Data Analyst; clearing restored three jobs. Hybrid filtering returned Backend Intern. Full job details opened and Back retained the Saved filter. Scout accepted a résumé request and displayed a guided fixture reply. Applications, Progress, Preferences and Help navigation and headers were reviewed. Mobile account menu exposed Help and Log out; Escape closed just that dropdown, left navigation open and restored focus. No actual logout, application submission, student write or provider request occurred. Application-origin console error checks were empty; browser-extension metadata errors were excluded.

Final TypeScript, native production and generated Next.js webpack builds passed. Backend/auth/storage/migrations, account choices/history, sharing and provider configuration are unchanged. Existing live PDF/AI, Google OAuth, real-device, employer-form and campus-load checks remain outside this visual revision. Vercel authorization is unchanged; no Vercel deployment is claimed.

No actionable P0/P1/P2 finding remains in the reviewed scope. P3: small generated-illustration and font-glyph differences remain; compact density is an explicitly requested difference from the raster boards.
