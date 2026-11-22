
import dotenv from "dotenv";
import "dotenv/config";
dotenv.config();

import app from "./app.js";
import { connectDatabase } from "./config/database.js";

const PORT = Number(process.env.PORT) || 5001;

const startServer = async (): Promise<void> => {
  try {
    console.log("1. Starting GearNest server...");
    console.log("2. MongoDB URI exists:", !!process.env.MONGODB_URI);

    await connectDatabase();

    console.log("3. MongoDB connection completed!");

    app.listen(PORT, () => {
      console.log(`GearNest server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start GearNest server:", error);
    process.exit(1);
  }
};

startServer();
