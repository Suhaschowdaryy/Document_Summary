# Briefly — Document Summary Assistant

Briefly turns uploaded PDFs and images into a clear, useful document brief. It is designed for technical-assessment review: upload a file, choose how much detail you need, and get a summary, key points, and practical improvement suggestions.

## Run locally

```bash
pnpm install
pnpm --filter @workspace/document-summary-assistant run dev
```

The app runs entirely in the browser. It does not upload documents to a server or require an API key.

## Approach

PDF files are read in the browser using the platform's available PDF text extraction support, with a graceful fallback when a scanned PDF has no text layer. Image files enter an OCR-ready flow and explain when browser OCR is unavailable rather than pretending the extraction succeeded. Summaries are generated locally with a lightweight heuristic that prioritizes sentence-level content, headings, and repeated terms. Users can switch between short, medium, and long output, copy the brief, download it as text, and reopen recent documents stored in local storage.

The interface intentionally keeps the source document local for privacy, provides visible loading and error states, and uses responsive layout behavior for smaller screens.

## Submission checklist

- Source-only project; do not commit `node_modules`, `dist`, `.env`, editor folders, or temporary files.
- Use the `main` branch when publishing to a public repository.
- Include the hosted application URL and repository link with the submission.