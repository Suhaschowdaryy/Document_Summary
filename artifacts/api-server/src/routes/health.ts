import { Router } from "express";

const router = Router();

const healthResponse = (res: { json: (body: unknown) => void }) => {
  res.json({ status: "ok", geminiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()) });
};

router.get("/healthz", (_req: unknown, res: { json: (body: unknown) => void }) => healthResponse(res));
router.get("/health", (_req: unknown, res: { json: (body: unknown) => void }) => healthResponse(res));
router.get("/debug", (_req: unknown, res: { json: (body: unknown) => void }) => {
  res.json({ status: "ok", service: "document-summary-api" });
});

export default router;
