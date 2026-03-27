import { Router, type IRouter } from "express";
import healthRouter from "./health";
import shopeeRouter from "./shopee";

const router: IRouter = Router();

router.use(healthRouter);
router.use(shopeeRouter);

export default router;
