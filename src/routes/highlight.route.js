import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  createProfileHighlight,
  deleteProfileHighlight,
  editProfileHighlight,
  getProfileHighlightById,
  getProfileHighlights,
} from "../controllers/highlight.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.use(verifyJWT);

router.route("/create").post(verifyJWT, upload.single("cover"), createProfileHighlight);
router.route("/:highlightId/edit").patch(verifyJWT, upload.single("cover"), editProfileHighlight);
router.route("/:highlightId/delete").delete(verifyJWT, deleteProfileHighlight);
router.route("/").get(verifyJWT, getProfileHighlights);
router.route("/:highlightId").get(verifyJWT, getProfileHighlightById);

export default router;
