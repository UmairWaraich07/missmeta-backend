import { Router } from "express";
import { registerVoter, registerContestant, validateUser } from "../controllers/user.controller.js";

const router = Router();

router.route("/validate-register").post(validateUser);
router.route("/register-voter").post(registerVoter);
router.route("/register-voter").post(registerContestant);

export default router;
