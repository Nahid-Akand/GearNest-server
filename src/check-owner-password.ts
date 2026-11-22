import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

dotenv.config();

const checkPassword = async () => {
  const client = new MongoClient(process.env.MONGODB_URI!);

  try {
    await client.connect();

    const db = client.db(process.env.DB_NAME || "gearnest");

    const user = await db.collection("users").findOne({
      email: "testowner@example.com",
    });

    if (!user || !user.password) {
      console.log("Owner account or password hash not found.");
      return;
    }

    const password = "YOUR_ORIGINAL_PASSWORD";

    const isMatch = await bcrypt.compare(password, user.password);

    console.log("Password matches:", isMatch);
    console.log("Account role:", user.role);
    console.log("Provider:", user.provider);
  } catch (error) {
    console.error(error);
  } finally {
    await client.close();
  }
};

checkPassword();