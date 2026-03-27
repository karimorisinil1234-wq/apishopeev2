import { Router } from "express";
import type { Request, Response } from "express";
import { validateToken } from "../lib/db";

const router = Router();

router.get("/auth/verify", async (req: Request, res: Response) => {
  const apikey =
    (req.query.apikey as string) ||
    (req.headers["x-api-key"] as string) ||
    req.headers["authorization"]?.replace("Bearer ", "");

  if (!apikey) {
    return res.status(400).json({ valid: false, reason: "Tidak ada API key" });
  }

  try {
    const result = await validateToken(apikey);
    return res.json(result);
  } catch {
    return res.status(500).json({ valid: false, reason: "Gagal cek token" });
  }
});

export default router;
