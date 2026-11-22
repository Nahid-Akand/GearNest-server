
import { Request, Response } from "express";
import Stripe from "stripe";
import { ObjectId } from "mongodb";

import { getDatabase } from "../../config/database.js";
import { AuthRequest } from "../../middlewares/auth.middleware.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

// ============================================
// Create Stripe Checkout Session
// ============================================

export const createCheckoutSession = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const customerId = req.user?.userId;
    const { bookingId } = req.body;

    if (!customerId) {
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

    const db = getDatabase();

    // Find the customer's pending and unpaid booking
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

    // Get equipment details
    const equipment = await db.collection("equipment").findOne({
      _id: booking.equipmentId,
    });

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: "Equipment not found.",
      });
    }

    // Validate the booking amount
    const amount = Number(booking.totalPrice);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking amount.",
      });
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",

      line_items: [
        {
          price_data: {
            currency: "bdt",
            product_data: {
              name: equipment.name,
              description: `Equipment rental for ${booking.totalDays} day(s)`,
            },
            // BDT to paisa
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

    return res.status(200).json({
      success: true,
      message: "Checkout session created successfully.",
      url: session.url,
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
// Stripe Webhook
// ============================================

export const handleStripeWebhook = async (
  req: Request,
  res: Response
) => {
  const signature = req.headers["stripe-signature"];

  if (!signature || !Buffer.isBuffer(req.body)) {
    return res.status(400).send("Invalid webhook request.");
  }

  let event: Stripe.Event;

  try {
    // Verify Stripe webhook signature
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (error) {
    console.error("Webhook signature verification failed:", error);

    return res.status(400).send("Invalid Stripe signature.");
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.payment_status !== "paid") {
        return res.status(200).json({
          received: true,
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

      // Confirm only an unpaid booking belonging to this customer
      const result = await db.collection("bookings").updateOne(
        {
          _id: new ObjectId(bookingId),
          customerId: new ObjectId(customerId),
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

      // Store payment record after successful confirmation
      if (result.modifiedCount === 1) {
        await db.collection("payments").updateOne(
          {
            stripeSessionId: session.id,
          },
          {
            $setOnInsert: {
              bookingId: new ObjectId(bookingId),
              customerId: new ObjectId(customerId),
              stripeSessionId: session.id,

              stripePaymentIntentId:
                typeof session.payment_intent === "string"
                  ? session.payment_intent
                  : undefined,

              amount: (session.amount_total ?? 0) / 100,
              currency: session.currency ?? "bdt",
              status: "paid",
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
          {
            upsert: true,
          }
        );
      }
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
