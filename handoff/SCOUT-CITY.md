# Scout city and page actions

The owner approved these designs on 23 October 2026, with the foreground company named NEXT JOB. The source implements that revision. Publication receipts identify the released version; browser visual QA remains blocked in [design-qa.md](../design-qa.md).

## Surfaces

| Page | Scout action |
| --- | --- |
| Jobs and landing | Formal Scout carries his file along a modern office street towards NEXT JOB; ORBIT TECH is in the distance |
| Saved | Peeks over a file stack and adds an orange bookmark |
| Applications / next steps | Checks a clipboard |
| Job details / companies / sources | Examines the job description with a magnifying glass |
| Progress | Celebrates beside an upward arrow and small bars |
| Preferences / setup | Adjusts sliders |
| Résumé & profile | Straightens a single résumé page |
| Alerts & account | Holds a bell |
| Help | Wears a headset and waves |
| Not interested | Places an intact document in a recoverable archive |
| Admin | Reviews a clipboard and abstract charts |

The running Scout loader and its track/keyframes are removed. Pending work uses a small spinner with an honest status label. The sidebar ScoutX entry is removed; the floating assistant and direct full-page conversation remain available.

`app/trail-scout.tsx` contains the shared artwork/header/status components. `app/scout-pages.css` keeps artwork inset, separates reading/control space, adds mobile layouts and excludes decorations from printed reports. Production artwork lives in `public/art/scout-pages/`; the existing formal Scout is reused. The three approved reference boards are retained in `docs/design/`.

## Motion and product behaviour

Each page action is a brief entrance animation. Saved/Applied/preferences-save events can replay a short reaction. The city character takes a few steps once and responds to a greeting; the city stays still. There is no perpetual mascot run. The existing motion preference, reduced-motion setting and document visibility control remain effective.

All status changes still use the existing authenticated handlers. Opening an application link remains distinct from confirming Applied. Existing application stages, notes/history, preferences, Advanced controls, résumé/PDF workflow, analytics consent, owner access and mail/push settings are preserved. No new student data, credentials, opt-ins, messages or applications are created by this visual update.

## Verification

Source type checking, the native build, the generated Next.js production build and 10 existing navigation-hook checks passed. Generated raster assets and CSS syntax were inspected. Supported preview reported running, but its HTTP port was unreachable; browser screenshots, console inspection and device interactions remain unverified. See the exact remaining review steps in [design QA](../design-qa.md).

Vercel publication uses the generated frontend, with the existing Render backend unchanged. The last Vercel write attempt was rejected for missing team authorization. A source/build handoff is ready, but that denial must not be bypassed and a new Vercel release must not be claimed without a successful deployment result.
