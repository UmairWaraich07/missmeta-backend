import { Router } from "express";
import {
  changeCurrentPassword,
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  updatePhoneVerification,
  upgradeToContestant,
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
router.route("/change-password").patch(verifyJWT, changeCurrentPassword);
router.route("/upgrade-contestant").patch(verifyJWT, upgradeToContestant);

export default router;
