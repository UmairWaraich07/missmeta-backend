import { Router } from "express";
import { initializeAdmin, loginAdmin } from "../controllers/dashboard/admin.controller.js";

const router = Router();

router.route("/create-admins").post(initializeAdmin);
router.route("/login").post(loginAdmin);

export default router;
