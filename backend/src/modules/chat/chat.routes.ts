import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { getRideMessagesController } from "./chat.controller";

const router = Router();

router.use(requireAuth);

router.get("/:rideId/messages", getRideMessagesController as any);

export const chatRouter = router;
