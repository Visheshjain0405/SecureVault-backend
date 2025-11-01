// src/routes/auth.routes.js
import { Router } from "express";
import { auth } from "../middleware/auth.js";
import {
  signup,
  verify,
  resendOtp,
  login,
  me,
} from "../controllers/authController.js";

const router = Router();

router.post("/signup", signup);
router.post("/verify", verify);
router.post("/resend-otp", resendOtp);
router.post("/login", login);
router.get("/me", auth, me);

export default router;
