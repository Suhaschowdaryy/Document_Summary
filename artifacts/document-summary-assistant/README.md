# Briefly — Document Summary Assistant

Briefly turns uploaded PDFs, Word documents, spreadsheets, CSVs, and images into a clear, useful document brief using Gemini. It is designed for technical-assessment review: upload a file, choose how much detail you need, and get a summary, key points, and practical improvement suggestions.

## Run locally

```bash
pnpm install
pnpm --filter @workspace/document-summary-assistant run dev
```

The browser sends the selected file to the server-side Gemini analyzer. Set `GEMINI_API_KEY` as a Replit Secret before running the full pipeline.

## Approach

The API accepts a multipart upload, validates the file type and size, and sends the file inline to Gemini 3.6 Flash with a strict JSON analysis prompt. Gemini handles OCR for images and scanned pages, understands Word and spreadsheet structure, and returns summaries, key points, important details, data findings, action items, risks, suggestions, processing notes, and confidence. Users can copy the brief, download it as text, and reopen recent documents stored in local storage.

The interface provides visible loading and error states, clearly explains the Gemini handoff, and uses responsive layout behavior for smaller screens. The app does not persist uploaded file bytes.

## Submission checklist

- Source-only project; do not commit `node_modules`, `dist`, `.env`, editor folders, or temporary files.
- Use the `main` branch when publishing to a public repository.
- Include the hosted application URL and repository link with the submission.