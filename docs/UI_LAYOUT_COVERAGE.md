# Product layout coverage — 21 September 2026

## Changes

- Shared dashboard system (`app/dashboard/design-system.css`): job details and matching main/sidebar grids, pipeline spacing, search toolbar, growing buttons, candidate forms/profile sections, settings and scheduling form grids, hiring-desk cards, screening and discovery controls. This is imported by the dashboard layout, not only overview.
- Overview (`components/DashboardOverview.jsx`, `workspace-overview.css`): separate primary pipeline/roles and secondary next-step/interview columns, using existing values.
- Interview presentation (`app/interview/[token]/page.jsx`, `VoiceInterview.jsx`, `interview-premium.css`): compact title/details disclosure, viewport-height desktop workspace and compact mobile Ava panel with `/1102496.jpg`. Question generation and submission bindings retained.
- Removed conflicting legacy interview presentation rules in `mobile.css` and `theme.css`.
- Fixed landing footer CSS leaking into application form footers: bare landing footer rules now scoped to `#top footer` in `globals.css` and `theme.css`.
- Removed forced tiny button fonts in screening/discovery stylesheets.

## Verified locally

`tests/workspace-layout-browser.cjs` uses actual presentation components, full global CSS, isolated sample records and mocked actions. External network is blocked. Overview, job form, candidate form, candidate-search markup fixture, workspace settings forms, scheduling form and active interview checked at 390, 768 and 1440px. No page-level horizontal overflow or browser page errors. Desktop interview fits the 900px-high test viewport. Ava image confirmed. Mobile inputs retain 16px text to avoid focus zoom.

`tests/ui-interactions.cjs`: 11 checks passed, including field preservation, validation errors, typed interview draft recovery/submission, scheduling selection, settings submission and search routing. These are mocked interactions, not live backend tests.

Screenshots: `D:/Temp/recruit-job-1440.png`, `D:/Temp/recruit-settings-390.png`, `D:/Temp/recruit-candidate-1440.png`, `D:/Temp/recruit-interview-compact-1440.png` (plus other widths).

## Limitations

- Shared CSS reaches other dashboard routes, but every authenticated route/state has not been individually browser verified. Discovery, billing, full job-detail/pipeline and live report data need authenticated visual acceptance.
- No production build rerun for this continuation. No paid services or shared databases accessed.
- Existing real-data loading/login issue is not established as resolved by UI fixture tests.
- Working tree already contains extensive unrelated modifications, including protected files; do not interpret the repository-wide diff as only these UI changes or reset protection baselines.

## View

Run `npm run dev`, open localhost:3000, sign in and navigate through Jobs, Candidates, Interviews and Settings. Refresh once if the existing dev tab retains stale CSS. No deployment was performed.
