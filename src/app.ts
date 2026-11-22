
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./modules/auth/auth.routes.js";
import usersRoutes from "./modules/users/users.routes.js";
import equipmentRoutes from "./modules/equipment/equipment.routes.js";
import bookingRoutes from "./modules/bookings/booking.routes.js";
import favoritesRoutes from "./modules/favorites/favorites.routes.js";
import paymentRoutes from "./modules/payments/payment.routes.js";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Preserve the raw body for Stripe webhook signature verification
app.use(
  "/api/v1/payments/webhook",
  express.raw({ type: "application/json" })
);

app.use(express.json());
app.use(cookieParser());

// Welcome route
app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to GearNest API!",
  });
});

// Health check
app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "GearNest server is healthy!",
  });
});

// Authentication routes
app.use("/api/v1/auth", authRoutes);
// User management routes
app.use("/api/v1/users", usersRoutes);

app.use("/api/v1/equipment", equipmentRoutes);
app.use("/api/v1/bookings", bookingRoutes);
app.use("/api/v1/favorites", favoritesRoutes);
app.use("/api/v1/payments", paymentRoutes);

export default app;
