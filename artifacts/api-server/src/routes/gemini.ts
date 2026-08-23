import { Router } from "express";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";

const router = Router();

type AnalyzeRequest = {
  file?: {
    mimetype: string;
    originalname: string;
    buffer: Buffer;
    size: number;
  };
  body: Record<string, unknown>;
  log: { error: (context: unknown, message: string) => void };
};

type AnalyzeResponse = {
  status: (code: number) => AnalyzeResponse;
  json: (body: unknown) => void;
};

const upload = multer({
  storage: multer.memoryStorage(),
  // Vercel serverless requests are limited to roughly 4.5 MB on Hobby.
  limits: { fileSize: 4 * 1024 * 1024 },
});

const ANALYSIS_PROMPT = `You are a precise document analysis assistant. Analyze the attached file and return a trustworthy structured brief that can be rendered directly in a web application.

The file may be a PDF, Microsoft Word document, Excel spreadsheet, CSV, or image. Use OCR for images and scanned documents. For spreadsheets, inspect all relevant sheets and identify headers, meaningful totals, trends, anomalies, and missing values. Preserve exact names, dates, numbers, formulas, and other important values.

Rules:
1. Never invent facts, numbers, names, dates, or conclusions.
2. If information is missing, unclear, unreadable, or ambiguous, say so explicitly.
3. Separate facts found in the document from interpretations.
4. Include source references such as page, section, sheet, cell range, or image region whenever possible.
5. Do not provide generic advice unrelated to the file.
6. Return valid JSON only. Do not wrap it in Markdown.

Return exactly this shape:
{
  "document": {
    "title": "Best available document title",
    "fileType": "pdf | word | excel | csv | image | unknown",
    "language": "Detected language",
    "pageCount": null,
    "sheetNames": [],
    "processingStatus": "complete | partial | unreadable",
    "processingNotes": []
  },
  "executiveSummary": "A clear summary in the requested length.",
  "keyPoints": [
    { "point": "Important point", "importance": "high | medium | low", "source": "Reference or null" }
  ],
  "importantDetails": [
    { "label": "Topic or detail", "value": "Exact value", "source": "Reference or null" }
  ],
  "tablesAndData": [
    { "name": "Table or dataset", "description": "What it represents", "headers": [], "notableFindings": [], "source": "Reference or null" }
  ],
  "actionItems": [
    { "action": "Action", "owner": null, "deadline": null, "priority": "high | medium | low", "source": "Reference or null" }
  ],
  "risksAndIssues": [
    { "issue": "Issue", "severity": "high | medium | low", "explanation": "Why it matters", "source": "Reference or null" }
  ],
  "improvementSuggestions": ["Specific suggestion"],
  "confidence": { "overall": "high | medium | low", "reason": "Short explanation" }
}`;

function inferType(mimeType: string, filename: string) {
  const name = filename.toLowerCase();
  if (mimeType === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (mimeType.includes("word") || /\.(doc|docx)$/.test(name)) return "word";
  if (mimeType.includes("spreadsheet") || /\.(xls|xlsx)$/.test(name)) return "excel";
  if (mimeType === "text/csv" || name.endsWith(".csv")) return "csv";
  if (mimeType.startsWith("image/") || /\.(png|jpe?g|webp|gif|tiff?)$/.test(name)) return "image";
  return "unknown";
}

router.post("/gemini/analyze", upload.single("file"), async (req: AnalyzeRequest, res: AnalyzeResponse) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "Attach a PDF, Word document, spreadsheet, CSV, or image." });
    return;
  }

  const fileType = inferType(file.mimetype, file.originalname);
  if (fileType === "unknown") {
    res.status(400).json({ error: "That file type is not supported." });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    res.status(503).json({ error: "Gemini is not configured. Add GEMINI_API_KEY to continue." });
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
    const length = typeof req.body.summaryLength === "string" ? req.body.summaryLength : "medium";
    const userInstruction = typeof req.body.userInstruction === "string" ? req.body.userInstruction : "";
    const prompt = `${ANALYSIS_PROMPT}\n\nRequested summary length: ${length}\nAdditional user instruction: ${userInstruction || "None"}`;
    const response = await ai.models.generateContent({
      model,
      contents: [{
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType: file.mimetype || "application/octet-stream", data: file.buffer.toString("base64") } },
        ],
      }],
      config: { responseMimeType: "application/json", maxOutputTokens: 8192 },
    });

    const text = response.text ?? "";
    const parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, "").trim());
    res.json({ ...parsed, fileName: file.originalname, fileSize: file.size, fileType });
  } catch (error) {
    req.log.error({ err: error }, "Gemini document analysis failed");
    res.status(502).json({ error: "Gemini could not analyze this document. Try a smaller or clearer file." });
  }
});

export default router;