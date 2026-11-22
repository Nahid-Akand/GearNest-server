
import { Router } from "express";

import {
  addFavorite,
  getMyFavorites,
  removeFavorite,
} from "./favorites.controller.js";

import { verifyToken } from "../../middlewares/auth.middleware.js";
import { authorizeRoles } from "../../middlewares/role.middleware.js";

const router = Router();

// CUSTOMER: Add equipment to favorites
router.post(
  "/",
  verifyToken,
  authorizeRoles("customer"),
  addFavorite
);

// CUSTOMER: Get my favorites
router.get(
  "/",
  verifyToken,
  authorizeRoles("customer"),
  getMyFavorites
);

// CUSTOMER: Remove equipment from favorites
router.delete(
  "/:equipmentId",
  verifyToken,
  authorizeRoles("customer"),
  removeFavorite
);

export default router;
