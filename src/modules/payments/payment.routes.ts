import { Router } from "express";

import {
  createCheckoutSession,
  handleStripeWebhook,
  getCheckoutSessionStatus,
} from "./payment.controller.js";

import { verifyToken } from "../../middlewares/auth.middleware.js";
import { authorizeRoles } from "../../middlewares/role.middleware.js";

const router = Router();

// Customer creates a Stripe Checkout session
router.post(
  "/checkout",
  verifyToken,
  authorizeRoles("customer"),
  createCheckoutSession
);

// Check the status of a specific Checkout Session
router.get(
  "/status/:sessionId",
  verifyToken,
  authorizeRoles("customer"),
  getCheckoutSessionStatus
);

// Stripe sends payment notifications here
router.post("/webhook", handleStripeWebhook);

export default router;