
import { ObjectId } from "mongodb";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed";

export interface IBooking {
  _id?: ObjectId;
  customerId: ObjectId;
  ownerId: ObjectId;
  equipmentId: ObjectId;

  startDate: Date;
  endDate: Date;

  totalDays: number;
  pricePerDay: number;
  totalPrice: number;

  status: BookingStatus;
  paymentStatus: "unpaid" | "paid" | "refunded";

  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBookingInput {
  equipmentId: string;
  startDate: string;
  endDate: string;
}
