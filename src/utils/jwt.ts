
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export const generateToken = (
  userId: ObjectId,
  email: string,
  role: string
): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is missing from environment variables");
  }

  const payload: JwtPayload = {
    userId: userId.toString(),
    email,
    role,
  };

  return jwt.sign(payload, secret, {
    expiresIn: "7d",
  });
};
