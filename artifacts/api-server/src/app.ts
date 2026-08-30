import express, { type Request, type Response } from "express";
import multer from "multer";
import { pinoHttp } from "pino-http";
import geminiRouter from "./routes/gemini.js";
import healthRouter from "./routes/health.js";
import { logger } from "./lib/logger.js";

const app = express();

type ErrorResponse = {
  status: (code: number) => ErrorResponse;
  json: (body: unknown) => void;
};

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", healthRouter);
app.use("/api", geminiRouter);

app.use("/api", (req: Request, res: Response) => {
  if (req.method !== "POST" && req.method !== "GET") {
    res.status(405).json({ success: false, error: `Method ${req.method} is not allowed for this endpoint.` });
    return;
  }

  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.originalUrl}` });
});

const errorHandler = (
  error: unknown,
  req: { url?: string },
  res: ErrorResponse,
  next: (error?: unknown) => void,
): void => {
  if (error instanceof multer.MulterError) {
    const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    res.status(status).json({
      success: false,
      error: status === 413 ? "The file is too large. Maximum size is 4 MB." : "The uploaded file could not be processed.",
    });
    return;
  }

  if (req.url?.startsWith("/api/") || req.url === "/api") {
    res.status(500).json({ success: false, error: "The request could not be processed." });
    return;
  }

  next(error);
};

app.use(errorHandler);

export default app;
