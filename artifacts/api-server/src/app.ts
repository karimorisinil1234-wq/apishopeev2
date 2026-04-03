import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";
import adminRouter from "./routes/admin";
import shopeeRouter from "./routes/shopee";
import { logger } from "./lib/logger";
import { initDb } from "./lib/db";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "shopee-checker-dev-secret-2025",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3 * 60 * 60 * 1000 },
  }),
);

app.use("/api", router);
app.use("/shopee", shopeeRouter);
app.use("/", adminRouter);

// Serve React frontend static files (production Railway deployment)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const staticPath = process.env["STATIC_FILES_PATH"] || path.resolve(__dirname, "../../public");
app.use(express.static(staticPath, { index: "index.html" }));

// SPA fallback — serve index.html for all non-API routes
app.get("*", (_req, res) => {
  res.sendFile(path.join(staticPath, "index.html"));
});

initDb().catch((err) => logger.error({ err }, "DB init failed"));

export default app;
