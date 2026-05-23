import express from "express";
import {
  isAuthenticated,
  login,
  logout,
  register,
  resetPassword,
  sendResetOtp,
  sendVerifyOtp,
  verifyEmail
} from "../controllers/authController.js";

import userAuth from "../middleware/userAuth.js";

const authRouter = express.Router();

// ================= AUTH ROUTES =================
authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/logout", logout);

// ================= EMAIL VERIFICATION =================
authRouter.post("/send-verify-otp", userAuth, sendVerifyOtp);
authRouter.post("/verify-account", userAuth, verifyEmail);

// ================= AUTH CHECK =================
authRouter.get("/is-auth", userAuth, isAuthenticated);

// ================= PASSWORD RESET =================
// ⚠️ usually these should NOT require login
authRouter.post("/send-reset-otp", sendResetOtp);
authRouter.post("/reset-password", resetPassword);

export default authRouter;