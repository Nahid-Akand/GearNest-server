
import { MongoClient, Db } from "mongodb";

let client: MongoClient | null = null;
let database: Db | null = null;
let connectionPromise: Promise<Db> | null = null;

export const connectDatabase = async (): Promise<Db> => {
  if (database) {
    return database;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async (): Promise<Db> => {
    const mongoUri = process.env.MONGODB_URI;
    const dbName = process.env.DB_NAME || "gearnest";

    if (!mongoUri) {
      throw new Error("MONGODB_URI is missing from environment variables");
    }

    const mongoClient = new MongoClient(mongoUri);

    await mongoClient.connect();

    const db = mongoClient.db(dbName);

    await db.command({ ping: 1 });

    await db.collection("payments").createIndex(
      { stripeSessionId: 1 },
      { unique: true }
    );

    client = mongoClient;
    database = db;

    console.log(`MongoDB connected successfully: ${dbName}`);

    return db;
  })();

  try {
    return await connectionPromise;
  } catch (error) {
    connectionPromise = null;
    client = null;
    database = null;

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
