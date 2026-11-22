
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

  connectionPromise = (async () => {
    try {
      const mongoUri = process.env.MONGODB_URI;
      const dbName = process.env.DB_NAME || "gearnest";

      if (!mongoUri) {
        throw new Error("MONGODB_URI is missing");
      }

      if (!client) {
        client = new MongoClient(mongoUri);
      }

      await client.connect();

      const db = client.db(dbName);

      await db.command({ ping: 1 });

      await db.collection("payments").createIndex(
        { stripeSessionId: 1 },
        {
          unique: true,
          partialFilterExpression: {
            stripeSessionId: { $type: "string" },
          },
        }
      );

      database = db;

      console.log(`MongoDB connected successfully: ${dbName}`);

      return db;
    } catch (error) {
      console.error("MongoDB connection failed:", error);

      if (client) {
        await client.close().catch(() => {});
        client = null;
      }

      database = null;
      throw error;
    } finally {
      connectionPromise = null;
    }
  })();

  return connectionPromise;
};

export const getDatabase = (): Db => {
  if (!database) {
    throw new Error("Database is not connected yet");
  }

  return database;
};
