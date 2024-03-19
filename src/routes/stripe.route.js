import { Router } from "express";
import { stripeWebhook } from "../controllers/stripe.controller.js";

const router = Router();

router.route("/").post(stripeWebhook);

export default router;
