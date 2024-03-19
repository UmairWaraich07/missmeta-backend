import { Router } from "express";
import {
  SubscribeAsContestant,
  checkSubscription,
} from "../controllers/subscription.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/check").get(verifyJWT, checkSubscription);
router.route("/subscribe").post(verifyJWT, SubscribeAsContestant);

export default router;
