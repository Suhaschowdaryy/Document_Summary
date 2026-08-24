import { Router } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router = Router();

const healthResponse = (res: { json: (body: unknown) => void }) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json({ ...data, geminiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()) });
};

router.get("/healthz", (_req: unknown, res: { json: (body: unknown) => void }) => healthResponse(res));
router.get("/health", (_req: unknown, res: { json: (body: unknown) => void }) => healthResponse(res));

export default router;
