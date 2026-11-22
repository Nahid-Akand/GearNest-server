
import { Response } from "express";
import { ObjectId } from "mongodb";
import { getDatabase } from "../../config/database.js";
import { AuthRequest } from "../../middlewares/auth.middleware.js";

// ADD EQUIPMENT TO FAVORITES
export const addFavorite = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.user?.userId;
    const { equipmentId } = req.body;

    if (!userId || !ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: "Please login first.",
      });
    }

    if (!equipmentId || !ObjectId.isValid(equipmentId)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid equipment ID.",
      });
    }

    const db = getDatabase();

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

    const favoritesCollection = db.collection("favorites");

    const existingFavorite = await favoritesCollection.findOne({
      userId: new ObjectId(userId),
      equipmentId: new ObjectId(equipmentId),
    });

    if (existingFavorite) {
      return res.status(409).json({
        success: false,
        message: "Equipment is already in your favorites.",
      });
    }

    await favoritesCollection.insertOne({
      userId: new ObjectId(userId),
      equipmentId: new ObjectId(equipmentId),
      createdAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: "Equipment added to favorites successfully.",
    });
  } catch (error) {
    console.error("Add favorite error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add equipment to favorites.",
    });
  }
};

// GET MY FAVORITES
export const getMyFavorites = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.user?.userId;

    if (!userId || !ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: "Please login first.",
      });
    }

    const db = getDatabase();

    const favorites = await db
      .collection("favorites")
      .aggregate([
        {
          $match: {
            userId: new ObjectId(userId),
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
          $unwind: "$equipment",
        },
        {
          $match: {
            "equipment.status": "approved",
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
      message: "Your favorites retrieved successfully.",
      favorites,
    });
  } catch (error) {
    console.error("Get favorites error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve favorites.",
    });
  }
};

// REMOVE EQUIPMENT FROM FAVORITES
export const removeFavorite = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.user?.userId;
    const { equipmentId } = req.params;

    if (!userId || !ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: "Please login first.",
      });
    }

    if (
      typeof equipmentId !== "string" ||
      !ObjectId.isValid(equipmentId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid equipment ID.",
      });
    }

    const db = getDatabase();

    const result = await db.collection("favorites").deleteOne({
      userId: new ObjectId(userId),
      equipmentId: new ObjectId(equipmentId),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Favorite not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Equipment removed from favorites successfully.",
    });
  } catch (error) {
    console.error("Remove favorite error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to remove favorite.",
    });
  }
};
