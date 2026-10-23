# Trail implementation — design QA

final result: blocked

## Release decision — 23 October 2026

After the review draft and browser limitation were disclosed, the owner asked to proceed. Publication is proceeding under that instruction; the visual QA result remains blocked. A further supported preview start reported running, but the supervised HTTP port was unreachable. No browser policy was bypassed and no successful visual check is claimed. Deployment/API health checks are separate release evidence.

## Comparison target and evidence

- Source visual truth: `docs/design/trail-refined-jobs.webp`; overall direction: `docs/design/trail-selected-board.webp`.
- Intended viewport: 1440 × 1024 CSS px, desktop Jobs, light theme; 390 px mobile follow-up.
- Refined source dimensions: 1487 × 1058 px; whole-product board: 1024 × 1536 px. The desktop source has essentially the target viewport ratio and can be uniformly normalized to 1440 × 1024 for comparison. No implementation density normalization or side-by-side comparison is possible without an implementation capture.
- Implementation screenshot: unavailable.
- State: local development fixture with synthetic profile/jobs; no production account is impersonated.

## Blocker and comparison history

1. The supported preview supervisor reported a running app, but the cloud browser returned `net::ERR_CONNECTION_REFUSED` for its HTTP preview URL.
2. A concrete local setup defect was identified: a portable execution profile in the managed environment. The provided Sites helper changed the checkout-local profile to managed Linux and the supervised preview was restarted.
3. The supervisor again reported running. The browser then rejected observation of the error tab under its URL/security policy. No raw browser commands, alternate browser surface or other access workaround was attempted.
4. The preview was stopped. A browser-rendered capture, console inspection and reference/implementation comparison remain unavailable. This is not a passed visual iteration.

## Fidelity surfaces awaiting browser evidence

- Fonts/typography: Trail uses serif display headings and the existing sans UI stack; actual rendering, wraps and font fallback are unverified.
- Spacing/layout: the source implements the narrow navigation, header artwork, flat job rows and expanded-filter state; desktop/mobile geometry and overflow need captures.
- Colours/tokens: ivory/tangerine/teal are implemented, with a darker primary button colour for readable labels. Computed contrast and semantic states need browser inspection.
- Images: separate generated formal Scout, running Scout and landscape assets are integrated and mechanically optimized for web delivery. Actual crop, halos, scaling and motion need rendered review.
- Copy/content: fictional data remains confined to the development fixture and labelled admin demonstration. Real eligibility/source fields remain in the authenticated product. Visual density and short labels still need review in context.

## Interactions and console

Primary interactions tested in browser: none. Browser console errors checked: unavailable. Isolated code checks, PDF tests and a successful build do not substitute for these checks.

## Implementation checklist

1. Restore supported preview/browser access.
2. Capture Jobs at the target viewport and combine it with the reference in one comparison image.
3. Capture focused header, job row and composer comparisons; inspect the other selected product surfaces.
4. Test filters, sidebar/account menu, job/back navigation, saved/applied history, chat/PDF flow and reduced motion at desktop and mobile widths.
5. Fix any P0/P1/P2 findings, repeat the comparison, and change the result to passed only when that evidence exists.

No visual match, responsive pass or production readiness is claimed for this draft.
