import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import geminiRouter from "./gemini.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(geminiRouter);

export default router;
