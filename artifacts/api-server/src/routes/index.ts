import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import documentsRouter from "./documents";
import userRouter from "./user";
import adminRouter from "./admin";
import interactionsRouter from "./interactions";
import libraryRouter from "./library";
import notificationsRouter from "./notifications";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(documentsRouter);
router.use(userRouter);
router.use(adminRouter);
router.use(interactionsRouter);
router.use(libraryRouter);
router.use(notificationsRouter);

export default router;
