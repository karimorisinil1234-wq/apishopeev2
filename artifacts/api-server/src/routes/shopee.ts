import { Router, type IRouter, type Request, type Response } from "express";
import { createProxyMiddleware, type RequestHandler } from "http-proxy-middleware";
import { requireToken } from "../lib/tokenMiddleware";

const router: IRouter = Router();

const SHOPEE_SERVICE_PORT = process.env["SHOPEE_SERVICE_PORT"] ?? "5000";
const SHOPEE_SERVICE_URL = `http://localhost:${SHOPEE_SERVICE_PORT}`;

// Health check — simple proxy, no auth
const healthProxy: RequestHandler = createProxyMiddleware({
  target: SHOPEE_SERVICE_URL,
  changeOrigin: false,
  on: {
    error: (_err, _req, res) => {
      (res as Response).status(503).json({
        status: "error",
        message: "Shopee Checker service sedang tidak tersedia",
      });
    },
  },
});

// Check — use direct fetch so we can capture the error reason for logging
async function checkHandler(req: Request, res: Response) {
  const phone = req.query.phone as string | undefined;

  try {
    const url = new URL(`${SHOPEE_SERVICE_URL}/check`);
    if (phone) url.searchParams.set("phone", phone);

    const upstream = await fetch(url.toString(), {
      signal: AbortSignal.timeout(60_000),
    });

    const data = await upstream.json() as Record<string, unknown>;

    // Store error reason in res.locals so middleware can log it
    if (!upstream.ok || data.status === "error" || data.error) {
      const msg = (data.message || data.error || `HTTP ${upstream.status}`) as string;
      res.locals.errorReason = msg;
    }

    res.status(upstream.status).json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Tidak dapat terhubung ke Shopee service";
    res.locals.errorReason = msg;
    res.status(503).json({
      status: "error",
      message: "Shopee Checker service sedang tidak tersedia, coba lagi dalam beberapa detik",
    });
  }
}

router.get("/health", healthProxy);
router.get("/check", requireToken, checkHandler);

export default router;
