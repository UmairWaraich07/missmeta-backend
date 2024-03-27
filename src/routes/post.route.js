import { Router } from "express";
import {
  createPost,
  deletePost,
  editPost,
  getGuestFeedPosts,
  getMorePostsOfUser,
  getPostById,
  getUserFeedPosts,
} from "../controllers/post.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/create").post(verifyJWT, upload.array("media", 3), createPost);
router.route("/edit/:postId").patch(verifyJWT, editPost);
router.route("/delete/:postId").post(verifyJWT, deletePost);
router.route("/p/:postId").get(verifyJWT, getPostById);
router.route("/feed-posts").get(verifyJWT, getUserFeedPosts);
router.route("/feed-posts").get(verifyJWT, getUserFeedPosts);
router.route("/guest-posts").get(getGuestFeedPosts);
router.route("/more-posts/:userId").get(getMorePostsOfUser);

export default router;
