import { Router } from "express";
import { getUserSavedPosts, toggleSaved } from "../controllers/saved.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/toggle/:postId").post(verifyJWT, toggleSaved);
router.route("/user-saveds").get(verifyJWT, getUserSavedPosts);

export default router;
