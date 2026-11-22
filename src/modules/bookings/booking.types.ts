
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
  quantity: number;
  totalPrice: number;

  contactNumber: string;
  deliveryAddress: string;
  additionalNotes?: string;

  status: BookingStatus;
  paymentStatus: "unpaid" | "paid" | "refunded";

  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBookingInput {
  equipmentId: string;
  startDate: string;
  endDate: string;
  quantity: number;
  contactNumber: string;
  deliveryAddress: string;
  additionalNotes?: string;
}
