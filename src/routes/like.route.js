import { Router } from "express";
import {
  getPostLikes,
  getPostLikesCount,
  getUserLikedPosts,
  togglePostLike,
} from "../controllers/like.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/toggle/:postId").post(verifyJWT, togglePostLike);
router.route("/user-liked").get(verifyJWT, getUserLikedPosts);
router.route("/p/:postId").get(verifyJWT, getPostLikes);
router.route("/p/likes/:postId").get(getPostLikesCount);

export default router;
