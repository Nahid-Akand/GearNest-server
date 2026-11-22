
import { Response } from "express";
import { ObjectId } from "mongodb";

import { getDatabase } from "../../config/database.js";
import { IUser, UserRole } from "../../types/user.types.js";
import { AuthRequest } from "../../middlewares/auth.middleware.js";

// ==========================================
// GET MY PROFILE
// ==========================================

export const getMyProfile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Please login first.",
      });
      return;
    }

    const usersCollection = getDatabase().collection<IUser>("users");

    const user = await usersCollection.findOne(
      { _id: new ObjectId(userId) },
      { projection: { password: 0 } }
    );

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Profile retrieved successfully!",
      user,
    });
  } catch (error) {
    console.error("Get profile error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve profile.",
    });
  }
};

// ==========================================
// UPDATE MY PROFILE
// ==========================================

export const updateMyProfile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Please login first.",
      });
      return;
    }

    const { name, photo, phone, address } = req.body;

    const updateData: {
      name?: string;
      photo?: string;
      phone?: string;
      address?: string;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (photo !== undefined) updateData.photo = photo;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;

    if (Object.keys(updateData).length === 1) {
      res.status(400).json({
        success: false,
        message: "Please provide at least one field to update.",
      });
      return;
    }

    if (
      updateData.name !== undefined &&
      (typeof updateData.name !== "string" ||
        !updateData.name.trim())
    ) {
      res.status(400).json({
        success: false,
        message: "Name cannot be empty.",
      });
      return;
    }

    const usersCollection = getDatabase().collection<IUser>("users");

    const result = await usersCollection.findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $set: updateData },
      {
        returnDocument: "after",
        projection: { password: 0 },
      }
    );

    if (!result) {
      res.status(404).json({
        success: false,
        message: "User not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully!",
      user: result,
    });
  } catch (error) {
    console.error("Update profile error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update profile.",
    });
  }
};

// ==========================================
// ADMIN: GET ALL USERS
// ==========================================

export const getAllUsers = async (
  _req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const usersCollection = getDatabase().collection<IUser>("users");

    const users = await usersCollection
      .find({}, { projection: { password: 0 } })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      message: "Users retrieved successfully!",
      totalUsers: users.length,
      users,
    });
  } catch (error) {
    console.error("Get all users error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve users.",
    });
  }
};

// ==========================================
// ADMIN: UPDATE USER ROLE
// ==========================================

export const updateUserRole = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id;

if (typeof id !== "string" || !ObjectId.isValid(id)) {
  res.status(400).json({
    success: false,
    message: "Invalid user ID.",
  });
  return;
}
    const { role } = req.body;

    const allowedRoles: UserRole[] = [
      "customer",
      "owner",
      "admin",
    ];

    if (!ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
      return;
    }

    if (!allowedRoles.includes(role)) {
      res.status(400).json({
        success: false,
        message: "Invalid user role.",
      });
      return;
    }

    const usersCollection = getDatabase().collection<IUser>("users");

    const result = await usersCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { role, updatedAt: new Date() } },
      {
        returnDocument: "after",
        projection: { password: 0 },
      }
    );

    if (!result) {
      res.status(404).json({
        success: false,
        message: "User not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "User role updated successfully!",
      user: result,
    });
  } catch (error) {
    console.error("Update user role error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update user role.",
    });
  }
};
