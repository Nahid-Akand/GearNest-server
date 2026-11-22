
import { Response } from "express";
import { ObjectId } from "mongodb";
import { getDatabase } from "../../config/database.js";
import { AuthRequest } from "../../middlewares/auth.middleware.js";
import { CreateBookingInput, IBooking } from "./booking.types.js";

const DAY_IN_MS = 1000 * 60 * 60 * 24;

// ============================================
// CREATE BOOKING - CUSTOMER
// ============================================

export const createBooking = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const customerId = req.user?.userId;

    if (!customerId || !ObjectId.isValid(customerId)) {
      return res.status(401).json({
        success: false,
        message: "Please login first.",
      });
    }

    const {
      equipmentId,
      startDate,
      endDate,
      quantity,
      contactNumber,
      deliveryAddress,
      additionalNotes,
    } = req.body as CreateBookingInput;

    // Validate required fields
    if (
      !equipmentId ||
      !startDate ||
      !endDate ||
      !ObjectId.isValid(equipmentId) ||
      !Number.isInteger(Number(quantity)) ||
      Number(quantity) < 1 ||
      !contactNumber?.trim() ||
      !deliveryAddress?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required booking information.",
      });
    }

    const requestedQuantity = Number(quantity);
    const cleanContactNumber = contactNumber.trim();
    const cleanDeliveryAddress = deliveryAddress.trim();
    const cleanAdditionalNotes = additionalNotes?.trim() || "";

    if (
      cleanContactNumber.length > 20 ||
      !/^[+()\-\s\d]{7,20}$/.test(cleanContactNumber)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid contact number.",
      });
    }

    if (
      cleanDeliveryAddress.length > 500 ||
      cleanAdditionalNotes.length > 1000
    ) {
      return res.status(400).json({
        success: false,
        message: "Address or additional notes are too long.",
      });
    }

    // Validate rental dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start
    ) {
      return res.status(400).json({
        success: false,
        message: "End date must be after the start date.",
      });
    }

    const totalDays = Math.ceil(
      (end.getTime() - start.getTime()) / DAY_IN_MS
    );

    const db = getDatabase();

    // Find approved equipment
    const equipment = await db.collection("equipment").findOne({
      _id: new ObjectId(equipmentId),
      status: "approved",
    });

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: "Equipment not found or not approved.",
      });
    }

    // Prevent owners from booking their own equipment
    if (equipment.ownerId.toString() === customerId) {
      return res.status(400).json({
        success: false,
        message: "You cannot book your own equipment.",
      });
    }

    // Check equipment availability
    const availableQuantity = Number(
      equipment.availableQuantity ?? 1
    );

    if (
      equipment.isAvailable === false ||
      !Number.isFinite(availableQuantity) ||
      availableQuantity < 1
    ) {
      return res.status(409).json({
        success: false,
        message: "This equipment is currently unavailable.",
      });
    }

    // Find bookings that overlap with the requested dates
    const overlappingBookings = await db
      .collection("bookings")
      .find({
        equipmentId: new ObjectId(equipmentId),
        status: { $in: ["pending", "confirmed"] },
        startDate: { $lt: end },
        endDate: { $gt: start },
      })
      .project({ quantity: 1 })
      .toArray();

    // Old bookings without quantity count as one unit
    const alreadyBookedQuantity = overlappingBookings.reduce(
      (total, booking) => total + Number(booking.quantity ?? 1),
      0
    );

    const remainingQuantity =
      availableQuantity - alreadyBookedQuantity;

    if (requestedQuantity > remainingQuantity) {
      return res.status(409).json({
        success: false,
        message: `Only ${Math.max(remainingQuantity, 0)} unit(s) are available for those dates.`,
      });
    }

    // Calculate total price on the server
    const pricePerDay = Number(equipment.pricePerDay);

    if (!Number.isFinite(pricePerDay) || pricePerDay <= 0) {
      return res.status(400).json({
        success: false,
        message: "Equipment rental price is invalid.",
      });
    }

    const totalPrice =
      pricePerDay * totalDays * requestedQuantity;

    // Create booking
    const booking: IBooking = {
      customerId: new ObjectId(customerId),
      ownerId: new ObjectId(equipment.ownerId),
      equipmentId: new ObjectId(equipmentId),

      startDate: start,
      endDate: end,

      totalDays,
      pricePerDay,
      quantity: requestedQuantity,
      totalPrice,

      contactNumber: cleanContactNumber,
      deliveryAddress: cleanDeliveryAddress,
      additionalNotes: cleanAdditionalNotes,

      status: "pending",
      paymentStatus: "unpaid",

      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db
      .collection<IBooking>("bookings")
      .insertOne(booking);

    return res.status(201).json({
      success: true,
      message: "Booking created successfully. Please complete payment.",
      booking: {
        ...booking,
        _id: result.insertedId,
      },
    });
  } catch (error) {
    console.error("Create booking error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create booking.",
    });
  }
};

// ============================================
// GET MY BOOKINGS - CUSTOMER
// ============================================

export const getMyBookings = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const customerId = req.user?.userId;

    if (!customerId || !ObjectId.isValid(customerId)) {
      return res.status(401).json({
        success: false,
        message: "Please login first.",
      });
    }

    const db = getDatabase();

    const bookings = await db
      .collection("bookings")
      .aggregate([
        {
          $match: {
            customerId: new ObjectId(customerId),
          },
        },
        {
          $lookup: {
            from: "equipment",
            localField: "equipmentId",
            foreignField: "_id",
            as: "equipment",
          },
        },
        {
          $unwind: {
            path: "$equipment",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $sort: {
            createdAt: -1,
          },
        },
      ])
      .toArray();

    return res.status(200).json({
      success: true,
      message: "Your bookings retrieved successfully.",
      bookings,
    });
  } catch (error) {
    console.error("Get customer bookings error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve your bookings.",
    });
  }
};

// ============================================
// GET OWNER BOOKINGS - OWNER
// ============================================

export const getOwnerBookings = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const ownerId = req.user?.userId;

    if (!ownerId || !ObjectId.isValid(ownerId)) {
      return res.status(401).json({
        success: false,
        message: "Please login first.",
      });
    }

    const db = getDatabase();

    const bookings = await db
      .collection("bookings")
      .aggregate([
        {
          $match: {
            ownerId: new ObjectId(ownerId),
          },
        },
        {
          $lookup: {
            from: "equipment",
            localField: "equipmentId",
            foreignField: "_id",
            as: "equipment",
          },
        },
        {
          $unwind: {
            path: "$equipment",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "customerId",
            foreignField: "_id",
            as: "customer",
          },
        },
        {
          $unwind: {
            path: "$customer",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            "customer.password": 0,
          },
        },
        {
          $sort: {
            createdAt: -1,
          },
        },
      ])
      .toArray();

    return res.status(200).json({
      success: true,
      message: "Owner bookings retrieved successfully.",
      bookings,
    });
  } catch (error) {
    console.error("Get owner bookings error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve owner bookings.",
    });
  }
};
