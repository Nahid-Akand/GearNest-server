
import { Request, Response } from "express";
import Stripe from "stripe";
import { ObjectId } from "mongodb";

import { getDatabase } from "../../config/database.js";
import { AuthRequest } from "../../middlewares/auth.middleware.js";

// ============================================
// STRIPE CONFIGURATION
// ============================================

const getStripe = (): Stripe => {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  return new Stripe(secretKey);
};

// ============================================
// CREATE STRIPE CHECKOUT SESSION
// ============================================

export const createCheckoutSession = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const customerId = req.user?.userId;
    const { bookingId } = req.body;

    if (!customerId || !ObjectId.isValid(customerId)) {
      return res.status(401).json({
        success: false,
        message: "Please login first.",
      });
    }

    if (!bookingId || !ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Valid booking ID is required.",
      });
    }

    if (!process.env.CLIENT_URL) {
      throw new Error("CLIENT_URL is not configured.");
    }

    const db = getDatabase();

    const booking = await db.collection("bookings").findOne({
      _id: new ObjectId(bookingId),
      customerId: new ObjectId(customerId),
      paymentStatus: "unpaid",
      status: "pending",
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Pending booking not found.",
      });
    }

    // Prevent another checkout session for this booking.
    if (booking.stripeSessionId) {
      return res.status(409).json({
        success: false,
        message: "A checkout session already exists for this booking.",
      });
    }

    const equipment = await db.collection("equipment").findOne({
      _id: booking.equipmentId,
    });

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: "Equipment not found.",
      });
    }

    const amount = Number(booking.totalPrice);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking amount.",
      });
    }

    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",

      line_items: [
        {
          price_data: {
            currency: "bdt",

            product_data: {
              name: equipment.name,
              description: `Equipment rental for ${booking.totalDays} day(s), quantity: ${booking.quantity ?? 1}`,
            },

            // BDT amount converted to poisha.
            unit_amount: Math.round(amount * 100),
          },

          quantity: 1,
        },
      ],

      metadata: {
        bookingId: booking._id!.toString(),
        customerId: customerId.toString(),
      },

      success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,

      cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,
    });

    // Attach the Stripe session to the booking.
    const updateResult = await db.collection("bookings").updateOne(
      {
        _id: booking._id,
        customerId: new ObjectId(customerId),
        paymentStatus: "unpaid",
        status: "pending",
        stripeSessionId: { $exists: false },
      },
      {
        $set: {
          stripeSessionId: session.id,
          updatedAt: new Date(),
        },
      }
    );

    if (updateResult.modifiedCount !== 1) {
      await stripe.checkout.sessions.expire(session.id);

      return res.status(409).json({
        success: false,
        message: "Could not attach the checkout session to this booking. Please try again.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Checkout session created successfully.",
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("Checkout session error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create checkout session.",
    });
  }
};

// ============================================
// GET CHECKOUT SESSION PAYMENT STATUS
// ============================================

export const getCheckoutSessionStatus = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const customerId = req.user?.userId;
    const sessionId = req.params.sessionId;

if (typeof sessionId !== "string" || !sessionId.startsWith("cs_")) {
  return res.status(400).json({
    success: false,
    message: "Invalid Checkout Session ID.",
  });
}

    if (!customerId || !ObjectId.isValid(customerId)) {
      return res.status(401).json({
        success: false,
        message: "Please login first.",
      });
    }

    if (!sessionId || !sessionId.startsWith("cs_")) {
      return res.status(400).json({
        success: false,
        message: "Invalid Checkout Session ID.",
      });
    }

    const stripe = getStripe();

    // Retrieve the actual session from Stripe.
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const bookingId = session.metadata?.bookingId;
    const sessionCustomerId = session.metadata?.customerId;

    if (
      !bookingId ||
      !sessionCustomerId ||
      !ObjectId.isValid(bookingId) ||
      sessionCustomerId !== customerId
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this payment.",
      });
    }

    const db = getDatabase();

    const booking = await db.collection("bookings").findOne({
      _id: new ObjectId(bookingId),
      customerId: new ObjectId(customerId),
      stripeSessionId: session.id,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Associated booking not found.",
      });
    }

    const payment = await db.collection("payments").findOne({
      stripeSessionId: session.id,
      customerId: new ObjectId(customerId),
    });

    return res.status(200).json({
      success: true,
      sessionId: session.id,
      checkoutStatus: session.status,
      stripePaymentStatus: session.payment_status,
      paymentStatus: booking.paymentStatus,
      bookingStatus: booking.status,
      paymentConfirmed:
        session.payment_status === "paid" &&
        booking.paymentStatus === "paid" &&
        booking.status === "confirmed",
      payment,
      bookingId: booking._id,
    });
  } catch (error) {
    console.error("Payment status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to check payment status.",
    });
  }
};

// ============================================
// STRIPE WEBHOOK
// ============================================

export const handleStripeWebhook = async (
  req: Request,
  res: Response
) => {
  const signature = req.headers["stripe-signature"];

  if (
    typeof signature !== "string" ||
    !Buffer.isBuffer(req.body)
  ) {
    return res.status(400).send("Invalid webhook request.");
  }

  let event: Stripe.Event;

  // Verify Stripe webhook signature.
  try {
    const stripe = getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET is not configured.");
    }

    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      webhookSecret
    );
  } catch (error) {
    console.error("Webhook signature verification failed:", error);

    return res.status(400).send("Invalid Stripe signature.");
  }

  try {
    // Handle completed Checkout Session.
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.payment_status !== "paid") {
        return res.status(200).json({
          received: true,
          message: "Payment is not completed yet.",
        });
      }

      const bookingId = session.metadata?.bookingId;
      const customerId = session.metadata?.customerId;

      if (
        !bookingId ||
        !customerId ||
        !ObjectId.isValid(bookingId) ||
        !ObjectId.isValid(customerId)
      ) {
        return res.status(400).send("Invalid booking metadata.");
      }

      const db = getDatabase();

      // Find the associated booking.
      const booking = await db.collection("bookings").findOne({
        _id: new ObjectId(bookingId),
        customerId: new ObjectId(customerId),
        stripeSessionId: session.id,
      });

      if (!booking) {
        return res.status(404).send("Associated booking not found.");
      }

      // Prevent payment confirmation for cancelled bookings.
      if (
        booking.status === "cancelled" ||
        !["pending", "confirmed"].includes(booking.status)
      ) {
        return res.status(400).send(
          "Booking is not eligible for payment."
        );
      }

      // Verify payment amount and currency.
      const expectedAmount = Math.round(
        Number(booking.totalPrice) * 100
      );

      if (
        !Number.isFinite(expectedAmount) ||
        session.amount_total !== expectedAmount ||
        session.currency !== "bdt"
      ) {
        return res.status(400).send("Payment amount mismatch.");
      }

      // Confirm booking after successful payment.
      await db.collection("bookings").updateOne(
        {
          _id: new ObjectId(bookingId),
          customerId: new ObjectId(customerId),
          stripeSessionId: session.id,
          paymentStatus: "unpaid",
          status: "pending",
        },
        {
          $set: {
            paymentStatus: "paid",
            status: "confirmed",
            updatedAt: new Date(),
          },
        }
      );

      // Save payment record idempotently.
      await db.collection("payments").updateOne(
        {
          stripeSessionId: session.id,
        },
        {
          $set: {
            bookingId: new ObjectId(bookingId),
            customerId: new ObjectId(customerId),

            stripeSessionId: session.id,

            stripePaymentIntentId:
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : null,

            amount: session.amount_total / 100,
            currency: session.currency ?? "bdt",
            status: "paid",
            updatedAt: new Date(),
          },

          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        {
          upsert: true,
        }
      );
    }

    return res.status(200).json({
      received: true,
    });
  } catch (error) {
    console.error("Stripe webhook processing error:", error);

    return res.status(500).json({
      success: false,
      message: "Webhook processing failed.",
    });
  }
};
