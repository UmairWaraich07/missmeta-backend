import { Router } from "express";
import {
  getFollowersList,
  getFollowingList,
  toggleFollow,
} from "../controllers/follow.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.route("/toggle/:profileId").post(toggleFollow);
router.route("/followers/:profileId").get(getFollowersList);
router.route("/following/:profileId").get(getFollowingList);

export default router;
