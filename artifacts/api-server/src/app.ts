import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
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

initDb().catch((err) => logger.error({ err }, "DB init failed"));

export default app;
