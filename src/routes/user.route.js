import { Router } from "express";
import {
  changeCurrentPassword,
  getAllContestants,
  getCurrentUser,
  getUserProfileInfo,
  loginUser,
  logoutUser,
  registerUser,
  updatePhoneVerification,
  updateProfileDetails,
  updateUserProfilePhoto,
  upgradeToContestant,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/register-voter").post(registerUser);
router.route("/register-contestant").post(registerUser);
router.route("/update-phone").patch(verifyJWT, updatePhoneVerification);
router.route("/login").post(loginUser);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/change-password").patch(verifyJWT, changeCurrentPassword);
router.route("/upgrade-contestant").patch(verifyJWT, upgradeToContestant);

router
  .route("/update-profile-photo")
  .patch(verifyJWT, upload.single("photo"), updateUserProfilePhoto);
router.route("/update-profile").patch(verifyJWT, updateProfileDetails);
router.route("/p/:username").get(getUserProfileInfo);
router.route("/contestants").get(getAllContestants);

export default router;
