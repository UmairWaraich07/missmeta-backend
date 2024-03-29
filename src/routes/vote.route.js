import { Router } from "express";
import { getContestantVotersList, toggleContestantVote } from "../controllers/vote.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.route("/toggle/:contestantId").post(toggleContestantVote);
router.route("/:contestantId").get(getContestantVotersList);

export default router;
