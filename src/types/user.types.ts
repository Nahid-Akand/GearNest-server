
import { ObjectId } from "mongodb";

export type UserRole = "customer" | "owner" | "admin";

export type AuthProvider = "credentials" | "google";

export interface IUser {
  _id?: ObjectId;
  name: string;
  email: string;
  password?: string;
  photo?: string;
  phone?: string;
  address?: string;
  role: UserRole;
  provider: AuthProvider;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegisterUserInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginUserInput {
  email: string;
  password: string;
}

export interface AuthenticatedUser {
  _id: ObjectId;
  name: string;
  email: string;
  photo?: string;
  role: UserRole;
}
