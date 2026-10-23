# Navigation and account access — 17 October 2026

The fixed sidebar previously contained all navigation, the Scout card and the account footer in one non-scrolling column. On short/mobile viewports its footer could fall outside the visible screen. The header avatar was a decorative span with no action.

The sidebar now has a viewport-height container, a separate touch/keyboard-scrollable navigation region, a fixed heading and a persistent labelled Log out link. Mobile navigation has an explicit Close control, an Escape path, a keyboard focus boundary and resize cleanup that releases the body scroll lock when returning to desktop. Short screens can scroll the middle content without losing the account actions.

The top-right account button opens the existing Radix menu primitive with keyboard navigation, Escape/outside dismissal, collision-aware placement, bounded popup scrolling and focus return. It contains Search profile, AI connections, Alerts & account, Help & feedback with unread reply count, Privacy & data, and Log out. Only an authenticated account whose server-loaded role is host gets the Host workspace shortcut. Server authorization remains in the existing API boundary.

Logout uses the existing top-level platform sign-out link and clears the current account's tab-scoped drafts through the same callback as the prior sign-out controls. It does not submit job applications or change saved job statuses. The menu remains available while the workspace loads or onboarding is incomplete. Monthly survey prompts wait while it is open.

Help and settings shortcuts now navigate directly to the requested section in one history entry. Manage alerts opens Alerts & account. Choosing Preferences consistently opens the profile section. Mobile header styles keep the account control reachable at narrow widths and allow long breadcrumb text to truncate.

## Validation

TypeScript and the existing isolated integration suite (247 checks, without the optional synthetic scale scenario) passed during implementation. The final packaging flow runs TypeScript and the production build against the final source. Integration checks cover the preserved authentication, ownership, tracking, personal-key, source, feedback and host boundaries; they do not simulate a browser clicking the new menu.

Real browser control was unavailable in this workspace. Before a broader rollout, verify the following on actual desktop and mobile devices: scroll the sidebar on a short viewport, reach Log out without scrolling the page, dismiss/reopen mobile navigation, rotate/resize while it is open, operate the account menu by touch and keyboard, follow Help/Profile/Alerts and browser Back, and confirm platform logout with a test account. Check text zoom, keyboard focus and a screen reader as part of that pass.

No database migration, runtime secret rotation, source schedule change or sharing change is required by this update. The public deployment retains its existing origin. A custom hostname requires an owner-controlled domain and verified DNS; a display link labelled NextRole does not change the address bar's hostname.
