import app from "../artifacts/api-server/src/app";

export default function handler(req: any, res: any) {
	try {
		if (typeof req.url === "string" && !req.url.startsWith("/api")) {
			req.url = `/api${req.url.startsWith("/") ? "" : "/"}${req.url}`;
		}

		return app(req, res);
	} catch (error) {
		console.error("[API ERROR] Serverless handler failed", error);
		return res.status(500).json({ success: false, error: "Internal server error" });
	}
}