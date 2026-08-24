# Briefly — Document Summary Assistant

Briefly turns uploaded PDFs, Word documents, spreadsheets, CSVs, and images into a clear, useful document brief using Gemini. It is designed for technical-assessment review: upload a file, choose how much detail you need, and get a summary, key points, and practical improvement suggestions.

## Run locally

```bash
pnpm install
pnpm dlx vercel dev
```

Vercel's local runtime serves both the Vite frontend and the `/api` function. Set `GEMINI_API_KEY` in your local environment before running the full pipeline. To work on the frontend only, use `pnpm --filter @workspace/document-summary-assistant run dev`.

## Deploy to Vercel

This repository is configured for Vercel with a static Vite frontend and a serverless Express function at `/api/gemini/analyze`.

1. Push the repository to GitHub.
2. In Vercel, select **Add New → Project**, import the repository, and keep the repository root as the project root.
3. Vercel will use the committed `vercel.json` settings:
   - Install command: `pnpm install --frozen-lockfile`
   - Build command: `pnpm --filter @workspace/document-summary-assistant run build`
   - Output directory: `artifacts/document-summary-assistant/dist/public`
4. In **Project Settings → Environment Variables**, add `GEMINI_API_KEY` for **Production**, **Preview**, and **Development** as needed. Add the value without committing it to Git.
5. Click **Deploy**.
6. Test the deployed app by uploading a small PDF or image. The maximum upload is 4 MB because of Vercel serverless request limits.

For local Vercel-style testing, install the Vercel CLI and run `vercel dev` from the repository root after setting `GEMINI_API_KEY` in your shell.

## Approach

The API accepts a multipart upload, validates the file type and size, and sends the file inline to Gemini 2.5 Flash with a strict JSON analysis prompt. Gemini handles OCR for images and scanned pages, understands Word and spreadsheet structure, and returns summaries, key points, important details, data findings, action items, risks, suggestions, processing notes, and confidence. Users can copy the brief, download it as text, and reopen recent documents stored in local storage.

The interface provides visible loading and error states, clearly explains the Gemini handoff, and uses responsive layout behavior for smaller screens. The app does not persist uploaded file bytes.

## Submission checklist

- Source-only project; do not commit `node_modules`, `dist`, `.env`, editor folders, or temporary files.
- Use the `main` branch when publishing to a public repository.
- Include the hosted application URL and repository link with the submission.