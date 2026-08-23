# Briefly — Document Summary Assistant

Briefly lets users send PDFs, Word documents, spreadsheets, CSVs, and images to Gemini for concise summaries, key points, and practical next steps.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/document-summary-assistant/src/App.tsx` — main application experience and local document processing.
- `artifacts/document-summary-assistant/src/index.css` — visual theme and responsive layout.
- `artifacts/document-summary-assistant/README.md` — setup, approach, and submission notes.

## Architecture decisions

- Uploaded files are analyzed server-side by Gemini so the API key never reaches the browser.
- The analyzer returns strict structured JSON so the UI can render each document section safely.
- Local storage is used only for recent-document metadata and generated briefs.

## Product

- Drag-and-drop or file-picker uploads for PDFs, Word documents, spreadsheets, CSVs, and common image formats.
- Loading, unsupported-file, size-limit, API-error, and OCR processing states.
- Short, medium, and long summaries with key points and improvement suggestions.
- Copy, text download, recent-document reopen, delete, and clear-all actions.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
