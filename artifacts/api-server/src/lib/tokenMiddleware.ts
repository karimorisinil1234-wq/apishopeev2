import type { Request, Response, NextFunction } from "express";
import { validateToken, logApiCall } from "./db";

export async function requireToken(req: Request, res: Response, next: NextFunction) {
  const apikey =
    (req.query.apikey as string) ||
    (req.headers["x-api-key"] as string) ||
    req.headers["authorization"]?.replace("Bearer ", "");

  if (!apikey) {
    return res.status(401).json({
      error: "API key diperlukan",
      detail: "Sertakan apikey di query parameter atau header X-Api-Key",
    });
  }

  try {
    const { valid, tokenId, reason } = await validateToken(apikey);
    if (!valid) {
      return res.status(401).json({ error: reason });
    }

    const phone = req.query.phone as string | undefined;
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ||
      req.socket.remoteAddress ||
      "unknown";

    res.on("finish", () => {
      if (!tokenId) return;
      const httpStatus = res.statusCode;
      const status = httpStatus < 400 ? "success" : "error";

      // Use detailed error reason from route handler if available
      const errorReason =
        status === "error"
          ? (res.locals.errorReason as string | undefined) || `HTTP ${httpStatus}`
          : null;

      logApiCall(tokenId, phone, status, errorReason, httpStatus, ip).catch(() => {});
    });

    next();
  } catch {
    return res.status(500).json({ error: "Gagal memvalidasi token" });
  }
}
