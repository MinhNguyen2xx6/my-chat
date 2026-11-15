import express from "express";
import { signUp, signIn, signOut, refreshToken } from "../controllers/authController.js";
import { forgotPassword, resetPassword } from "../controllers/passwordController.js";

const router = express.Router();

router.post("/signup", signUp);
router.post("/signin", signIn);
router.post("/signout", signOut);
router.post("/refresh", refreshToken);

// Quen mat khau
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;