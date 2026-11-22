
import { Router, Response } from "express";
import {
  registerUser,
  loginUser,
  googleLogin,
} from "./auth.controller.js";
import {
  verifyToken,
  AuthRequest,
} from "../../middlewares/auth.middleware.js";

const router = Router();

// Register new user
router.post("/register", registerUser);

// Login existing user
router.post("/login", loginUser);

// Google login
router.post("/google", googleLogin);

// Get currently authenticated user
router.get(
  "/me",
  verifyToken,
  (req: AuthRequest, res: Response): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Please login first.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "User profile retrieved successfully!",
      user: {
        id: req.user.userId,
        email: req.user.email,
        role: req.user.role,
      },
    });
  }
);

export default router;
