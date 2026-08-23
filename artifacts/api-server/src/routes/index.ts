import { Router } from "express";
import healthRouter from "./health.js";
import geminiRouter from "./gemini.js";

const router = Router();

router.use(healthRouter);
router.use(geminiRouter);

export default router;
