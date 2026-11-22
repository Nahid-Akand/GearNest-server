
import { Router } from "express";

import {
  createBooking,
  getMyBookings,
  getOwnerBookings,
} from "./booking.controller.js";

import { verifyToken } from "../../middlewares/auth.middleware.js";
import { authorizeRoles } from "../../middlewares/role.middleware.js";

const router = Router();

// CUSTOMER: Create booking
router.post(
  "/",
  verifyToken,
  authorizeRoles("customer"),
  createBooking
);

// CUSTOMER: Get my bookings
router.get(
  "/my-bookings",
  verifyToken,
  authorizeRoles("customer"),
  getMyBookings
);

// OWNER: Get bookings for my equipment
router.get(
  "/owner-bookings",
  verifyToken,
  authorizeRoles("owner"),
  getOwnerBookings
);

export default router;
