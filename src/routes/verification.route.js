import { Router } from "express";
import { sendVerificationCode, verifyOtp } from "../controllers/verification.controller.js";

const router = Router();

router.route("/send-otp").get(sendVerificationCode);
router.route("/verify-otp").post(verifyOtp);

export default router;
