import { Router } from "express";
import {
  createAdvertisement,
  deleteAContestant,
  deleteAdvertisement,
  editAdvertisement,
  getAdvertisements,
  getAllContestants,
  toggleActiveContestant,
  toggleAdvertisementStatus,
} from "../controllers/dashboard/dashboard.controller.js";
import { verifyAdmin } from "../middlewares/admin.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router
  .route("/ads/create-advertisement")
  .post(verifyAdmin, upload.array("images", 3), createAdvertisement);
router.route("/ads/edit/:advertisementId").patch(verifyAdmin, editAdvertisement);
router.route("/ads/delete/:advertisementId").post(verifyAdmin, deleteAdvertisement);
router.route("/ads/toggle/:advertisementId").post(verifyAdmin, toggleAdvertisementStatus);
router.route("/ads").get(verifyAdmin, getAdvertisements);

router.route("/contestants").get(verifyAdmin, getAllContestants);
router.route("/contestants/toggle/:contestantId").patch(verifyAdmin, toggleActiveContestant);
router.route("/contestants/delete/:contestantId").post(verifyAdmin, deleteAContestant);

export default router;
