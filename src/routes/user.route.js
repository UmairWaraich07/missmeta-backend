import { Router } from "express";
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  updatePhoneVerification,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// router.route("/validate-register").post(validateUser);
router.route("/register-voter").post(registerUser);
router.route("/register-contestant").post(registerUser);
router.route("/update-phone").patch(verifyJWT, updatePhoneVerification);
router.route("/login").post(loginUser);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/logout").post(verifyJWT, logoutUser);

export default router;
