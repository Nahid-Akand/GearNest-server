
import { MongoClient, Db } from "mongodb";

let client: MongoClient | null = null;
let database: Db | null = null;

export const connectDatabase = async (): Promise<Db> => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    const dbName = process.env.DB_NAME || "gearnest";

    if (!mongoUri) {
      throw new Error("MONGODB_URI is missing from .env");
    }

    client = new MongoClient(mongoUri);

    await client.connect();

    database = client.db(dbName);

    await database.command({ ping: 1 });

    console.log(`MongoDB connected successfully: ${dbName}`);

    return database;
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    throw error;
  }
};

export const getDatabase = (): Db => {
  if (!database) {
    throw new Error("Database is not connected yet");
  }

  return database;
};
