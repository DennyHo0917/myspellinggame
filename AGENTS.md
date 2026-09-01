# Repository Instructions

These instructions apply to the entire repository.

## Localization

- Any user-facing copy change must be applied to every supported language at the same time.
- Do not translate mechanically or word for word. Write natural phrasing that matches each locale's language habits, tone, and product context.
- When localized pages are generated, update the generation source first and regenerate the output pages.
- The `/admin` page is a Chinese-only internal page; all visible Admin copy and Admin-specific status/error messages must use natural Simplified Chinese.

## Shared Page Layout

- Every new page must reuse the existing shared header and footer templates, including their button styles, spacing, responsive behavior, and localized labels.
- New pages must preserve the shared header and footer's structure, visible copy, link set and order, typography, colors, and interaction behavior so every page keeps one consistent visual style.
- Do not create page-specific copies of header or footer styles. When a change is needed, update the shared template or shared stylesheet so all pages remain consistent.

## Visual Harmony And Copy Fit

- Prioritize a coherent, balanced, and comfortable interface over exhaustive wording. Keep related controls aligned, symmetrical where appropriate, and consistent in height, spacing, and visual weight across languages and responsive layouts.
- User-facing copy must not wrap, overflow, or push neighboring elements out of alignment. When a translation is too long, shorten it with a natural, unambiguous abbreviation or a concise label (for example, `mo` for "month" when the billing context is clear); use the normal conventions of each language rather than preserving the full wording mechanically.
- Preserve meaning and accessibility, but allow copy length to yield when needed to keep the page visually polished.

## Change Workflow

- After completing any modification, report the changes, checks performed, and anything not yet verified, then stop and wait for user confirmation.
- Do not commit, push, deploy, or create a pull request unless the user explicitly asks for that action.

## Database Migrations

- Whenever a change adds or modifies a database migration, execute the remote D1 migrations with `npm run db:migrate:remote` before reporting the work complete.

## Push Destination

- When the user explicitly asks to push, do not use the `gh` CLI or a pull-request workflow.
- Push with Git directly to `https://github.com/DennyHo0917/myspellinggame` using the current intended branch.
- After a successful branch push, merge that branch into `main` and push `main` to the same repository unless the user explicitly says not to merge.
- Ignore any unrelated GitHub repository or default `gh` context.
