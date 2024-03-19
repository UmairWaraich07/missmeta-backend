import { Router } from "express";
import { sendVerificationCode, verifyOtp } from "../controllers/verification.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/send-otp").post(verifyJWT, sendVerificationCode);
router.route("/verify-otp").post(verifyJWT, verifyOtp);

export default router;
