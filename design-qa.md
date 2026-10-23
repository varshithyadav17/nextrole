# Scout city and page actions — design QA

final result: blocked

## Approved scope — 23 October 2026

The owner approved the city, Saved and page-action concepts and requested implementation, changing the foreground company sign to NEXT JOB. This replaces the earlier countryside header and running-Scout loading effect. Existing authorization to publish persists; visual QA remains a separate, unmet verification gate.

## Comparison targets

- Jobs: `docs/design/scout-city-jobs-target.webp`, 1487 × 1058 px. This is the revised NEXT JOB target.
- Saved: `docs/design/scout-saved-target.webp`, 1487 × 1058 px.
- Other page actions: `docs/design/scout-page-actions-target.webp`, 1182 × 1330 px. This is a grid of header studies, not a full-page reference for each destination.
- Intended Jobs/Saved capture: 1440 × 1024 CSS px, light theme, development-only synthetic fixture; follow-up at 390 px width. A uniform normalization is appropriate for the two desktop targets. The header studies require matching component crops, not a full-page overlay.
- Implementation captures: unavailable. No density normalization, combined comparison image or visual iteration can be completed without them.

The target images were opened. Production raster assets were also inspected and mechanically resized/encoded to WebP. Artwork inspection is not a rendered UI comparison.

## Current blocker and history

The supported preview supervisor again reported `http://terminal.local:4173/` running, but its local HTTP listener returned connection refused (HTTP 000). The prior managed-profile repair is retained. The earlier browser error-page policy rejection was not bypassed, and no alternate server, browser, CDP access or endpoint was used. The supervised preview was stopped.

There is no implementation screenshot, browser console evidence, desktop/mobile interaction result or reference/implementation comparison. Build checks and successful deployment cannot establish visual fidelity.

## Five required fidelity surfaces

| Surface | Implemented intent | Rendered evidence |
| --- | --- | --- |
| Fonts / typography | Existing Trail serif headings and sans controls; shorter copy | Pending: actual wrapping, fallback and heading density |
| Spacing / layout | Inset city scene, separate heading/art columns, mobile stacking and compact page mascots | Pending: overlap, geometry, overflow, scroll and touch targets |
| Colours / tokens | Retained ivory, tangerine and teal; existing readable form fields | Pending: computed contrast and focus/active states |
| Images | NEXT JOB city, formal Scout and ten page-specific poses; transparent WebP assets | Assets inspected; actual crop, edges, scale and animation pending |
| Copy / content | Short page titles/status labels; fictional data confined to local fixture and labelled admin demo | Pending: density and truncation in real rendered states |

No objective visual differences can be scored without implementation evidence. There is no claimed P0/P1/P2 pass.

## Non-browser checks completed for this revision

- Source TypeScript checking passed.
- Native production build passed.
- Generated Render-forwarding Next.js frontend production build and its TypeScript phase passed.
- Existing navigation-hook checks passed 10 cases, including job/back/forward, filter and scroll restoration. These use simulated history and are not real-device proof.
- CSS parsing and `git diff --check` passed.
- Eleven new production WebP assets total 347,490 bytes. The existing formal Scout is reused. No new runtime dependency was added.

Previous one-page résumé, provider isolation and application workflow checks are historical evidence from the preceding release; those backend implementations were not changed in this revision.

## Remaining browser review

1. Restore supported preview access and capture Jobs/Saved at the intended viewport and state.
2. Combine each capture with its corresponding normalized reference. Compare focused header, job-row and assistant-composer regions as well as the overall page.
3. Capture Applications, job details, Progress, Preferences, Résumé/profile, Alerts, Help, archive and admin headers against their studies. Check landing/account and onboarding as supporting surfaces.
4. Exercise sidebar/account menus, logout, filters, job/back/forward, save/Applied/restore, Scout/PDF interactions and Advanced preferences on desktop and mobile.
5. Inspect console errors, image delivery, pause/reduced-motion/hidden-document behaviour, and report printing. Fix observed P0/P1/P2 issues and compare revised captures before changing this result to passed.
