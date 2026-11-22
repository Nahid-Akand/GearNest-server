
import { ObjectId } from "mongodb";

export type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded";

export interface IPayment {
  _id?: ObjectId;

  bookingId: ObjectId;
  customerId: ObjectId;

  stripeSessionId: string;
  stripePaymentIntentId?: string;

  amount: number;
  currency: string;

  status: PaymentStatus;

  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCheckoutInput {
  bookingId: string;
}
