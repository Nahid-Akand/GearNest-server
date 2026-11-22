
import { ObjectId } from "mongodb";

export type EquipmentStatus = "pending" | "approved" | "rejected";

export type EquipmentCondition = "new" | "like-new" | "good" | "fair";

export type RentalType = "daily" | "weekly" | "monthly";

export interface IEquipment {
  _id?: ObjectId;
  ownerId: ObjectId;

  name: string;
  description: string;
  category: string;
  brand?: string;

  condition: EquipmentCondition;

  // Rental pricing
  pricePerDay: number;
  pricePerWeek?: number;
  pricePerMonth?: number;
  rentalTypes?: RentalType[];

  // Availability and rental information
  availableQuantity?: number;
  rentalTerms?: string;

  location: string;
  images: string[];

  status: EquipmentStatus;
  isAvailable: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEquipmentInput {
  name: string;
  description: string;
  category: string;
  brand?: string;
  condition: EquipmentCondition;

  pricePerDay: number;
  pricePerWeek?: number;
  pricePerMonth?: number;
  rentalTypes?: RentalType[];

  availableQuantity?: number;
  rentalTerms?: string;

  location: string;
  images: string[];
}

export interface EquipmentOwner {
  _id: ObjectId;
  name: string;
  photo?: string;
}
