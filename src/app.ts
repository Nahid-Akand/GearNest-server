
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDatabase } from "./config/database.js";

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

// Ensure MongoDB is connected before handling API requests
app.use(async (_req, res, next) => {
  try {
    await connectDatabase();
    next();
  } catch (error) {
    console.error("Database connection failed:", error);

    res.status(503).json({
      success: false,
      message: "Database connection failed.",
    });
  }
});

// Authentication routes
app.use("/api/v1/auth", authRoutes);

// User management routes
app.use("/api/v1/users", usersRoutes);

// Equipment routes
app.use("/api/v1/equipment", equipmentRoutes);

// Booking routes
app.use("/api/v1/bookings", bookingRoutes);

// Favorites routes
app.use("/api/v1/favorites", favoritesRoutes);

// Payment routes
app.use("/api/v1/payments", paymentRoutes);

export default app;
