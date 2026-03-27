import type { Request, Response, NextFunction } from "express";
import { validateToken } from "./db";

export async function requireToken(req: Request, res: Response, next: NextFunction) {
  const apikey =
    (req.query.apikey as string) ||
    req.headers["x-api-key"] as string ||
    req.headers["authorization"]?.replace("Bearer ", "");

  if (!apikey) {
    return res.status(401).json({
      error: "API key diperlukan",
      detail: "Sertakan apikey di query parameter atau header X-Api-Key",
    });
  }

  try {
    const { valid, reason } = await validateToken(apikey);
    if (!valid) {
      return res.status(401).json({ error: reason });
    }
    next();
  } catch (err) {
    return res.status(500).json({ error: "Gagal memvalidasi token" });
  }
}
