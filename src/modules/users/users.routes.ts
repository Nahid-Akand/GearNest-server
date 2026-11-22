
import { Router } from "express";

import {
  getMyProfile,
  updateMyProfile,
  getAllUsers,
  updateUserRole,
} from "./users.controller.js";

import { verifyToken } from "../../middlewares/auth.middleware.js";
import { authorizeRoles } from "../../middlewares/role.middleware.js";

const router = Router();

// Get logged-in user's profile
router.get("/me", verifyToken, getMyProfile);

// Update logged-in user's profile
router.patch("/me", verifyToken, updateMyProfile);

// Admin: Get all users
router.get(
  "/",
  verifyToken,
  authorizeRoles("admin"),
  getAllUsers
);

// Admin: Update a user's role
router.patch(
  "/:id/role",
  verifyToken,
  authorizeRoles("admin"),
  updateUserRole
);

export default router;
