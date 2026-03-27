import { Router, type IRouter, type Request, type Response } from "express";
import { createProxyMiddleware, type RequestHandler } from "http-proxy-middleware";

const router: IRouter = Router();

const SHOPEE_SERVICE_PORT = process.env["SHOPEE_SERVICE_PORT"] ?? "5000";
const SHOPEE_SERVICE_URL = `http://localhost:${SHOPEE_SERVICE_PORT}`;

export const shopeeProxyMiddleware: RequestHandler = createProxyMiddleware({
  target: SHOPEE_SERVICE_URL,
  changeOrigin: false,
  on: {
    error: (err, _req, res) => {
      (res as Response).status(503).json({
        status: "error",
        message: "Shopee Checker service sedang tidak tersedia, coba lagi dalam beberapa detik",
      });
    },
  },
});

router.use("/shopee", shopeeProxyMiddleware);

export default router;
