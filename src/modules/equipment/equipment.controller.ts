
import type { Request, Response } from "express";
import { ObjectId } from "mongodb";

import { getDatabase } from "../../config/database.js";
import type {
  IEquipment,
  EquipmentStatus,
  RentalType,
} from "./equipment.types.js";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";

// ============================================
// CREATE EQUIPMENT
// ============================================

export const createEquipment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId || !ObjectId.isValid(userId)) {
      res.status(401).json({
        success: false,
        message: "Unauthorized. Please login again.",
      });
      return;
    }

    const {
      name,
      description,
      category,
      brand,
      condition,
      pricePerDay,
      pricePerWeek,
      pricePerMonth,
      rentalTypes,
      availableQuantity,
      rentalTerms,
      location,
      images,
    } = req.body;

    if (
      !name ||
      !description ||
      !category ||
      !condition ||
      !location
    ) {
      res.status(400).json({
        success: false,
        message: "Please provide all required equipment information.",
      });
      return;
    }

    if (
      !["new", "like-new", "good", "fair"].includes(condition)
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid equipment condition.",
      });
      return;
    }

    const dailyPrice = Number(pricePerDay);
    const weeklyPrice =
      pricePerWeek !== undefined && pricePerWeek !== ""
        ? Number(pricePerWeek)
        : undefined;
    const monthlyPrice =
      pricePerMonth !== undefined && pricePerMonth !== ""
        ? Number(pricePerMonth)
        : undefined;

    if (!Number.isFinite(dailyPrice) || dailyPrice <= 0) {
      res.status(400).json({
        success: false,
        message: "Daily rental price must be greater than zero.",
      });
      return;
    }

    const selectedRentalTypes: RentalType[] =
      Array.isArray(rentalTypes) && rentalTypes.length > 0
        ? rentalTypes
        : ["daily"];

    if (
      selectedRentalTypes.some(
        (type: string) =>
          !["daily", "weekly", "monthly"].includes(type)
      )
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid rental type.",
      });
      return;
    }

    if (
      selectedRentalTypes.includes("weekly") &&
      (!weeklyPrice ||
        !Number.isFinite(weeklyPrice) ||
        weeklyPrice <= 0)
    ) {
      res.status(400).json({
        success: false,
        message: "Please provide a valid weekly rental price.",
      });
      return;
    }

    if (
      selectedRentalTypes.includes("monthly") &&
      (!monthlyPrice ||
        !Number.isFinite(monthlyPrice) ||
        monthlyPrice <= 0)
    ) {
      res.status(400).json({
        success: false,
        message: "Please provide a valid monthly rental price.",
      });
      return;
    }

    const quantity =
      availableQuantity === undefined || availableQuantity === ""
        ? 1
        : Number(availableQuantity);

    if (!Number.isInteger(quantity) || quantity < 1) {
      res.status(400).json({
        success: false,
        message: "Available quantity must be at least 1.",
      });
      return;
    }

    if (!Array.isArray(images) || images.length === 0 || !images[0]) {
      res.status(400).json({
        success: false,
        message: "Please provide at least one equipment image.",
      });
      return;
    }

    const db = getDatabase();

    const newEquipment: IEquipment = {
      ownerId: new ObjectId(userId),
      name: String(name).trim(),
      description: String(description).trim(),
      category: String(category).trim(),
      brand: brand ? String(brand).trim() : "",
      condition,
      pricePerDay: dailyPrice,
      ...(selectedRentalTypes.includes("weekly") && {
        pricePerWeek: weeklyPrice,
      }),
      ...(selectedRentalTypes.includes("monthly") && {
        pricePerMonth: monthlyPrice,
      }),
      rentalTypes: selectedRentalTypes,
      availableQuantity: quantity,
      rentalTerms: rentalTerms ? String(rentalTerms).trim() : "",
      location: String(location).trim(),
      images: images
        .filter((image: unknown) => typeof image === "string")
        .map((image: string) => image.trim())
        .filter(Boolean)
        .slice(0, 5),
      status: "pending",
      isAvailable: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db
      .collection<IEquipment>("equipment")
      .insertOne(newEquipment);

    res.status(201).json({
      success: true,
      message: "Equipment submitted for admin approval.",
      equipment: {
        ...newEquipment,
        _id: result.insertedId,
      },
    });
  } catch (error) {
    console.error("Create equipment error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create equipment.",
    });
  }
};

// ============================================
// GET ALL APPROVED EQUIPMENT
// ============================================

export const getAllApprovedEquipment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const db = getDatabase();

    const {
      search,
      category,
      location,
      condition,
      minPrice,
      maxPrice,
      sort,
      limit,
    } = req.query;

    const filter: Record<string, unknown> = {
      status: "approved",
      isAvailable: true,
    };

    if (typeof search === "string" && search.trim()) {
      const escapedSearch = search.trim().replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      filter.$or = [
        { name: { $regex: escapedSearch, $options: "i" } },
        { description: { $regex: escapedSearch, $options: "i" } },
        { brand: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    if (typeof category === "string" && category !== "all") {
      filter.category = category;
    }

    if (typeof location === "string" && location.trim()) {
      filter.location = {
        $regex: location.trim().replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        ),
        $options: "i",
      };
    }

    if (typeof condition === "string" && condition !== "all") {
      filter.condition = condition;
    }

    const priceFilter: Record<string, number> = {};

    if (minPrice !== undefined && Number.isFinite(Number(minPrice))) {
      priceFilter.$gte = Number(minPrice);
    }

    if (maxPrice !== undefined && Number.isFinite(Number(maxPrice))) {
      priceFilter.$lte = Number(maxPrice);
    }

    if (Object.keys(priceFilter).length > 0) {
      filter.pricePerDay = priceFilter;
    }

    let sortOption: Record<string, 1 | -1> = {
      createdAt: -1,
    };

    if (sort === "price-low") {
      sortOption = { pricePerDay: 1 };
    } else if (sort === "price-high") {
      sortOption = { pricePerDay: -1 };
    } else if (sort === "oldest") {
      sortOption = { createdAt: 1 };
    }

    const parsedLimit = Number(limit);
    const equipmentLimit =
      Number.isInteger(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 100)
        : 0;

    let cursor = db
      .collection<IEquipment>("equipment")
      .find(filter)
      .sort(sortOption);

    if (equipmentLimit > 0) {
      cursor = cursor.limit(equipmentLimit);
    }

    const equipment = await cursor.toArray();

    res.status(200).json({
      success: true,
      message: "Equipment retrieved successfully.",
      total: equipment.length,
      equipment,
    });
  } catch (error) {
    console.error("Get equipment error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve equipment.",
    });
  }
};

// ============================================
// GET PENDING EQUIPMENT (ADMIN)
// ============================================

export const getPendingEquipment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const db = getDatabase();

    const equipment = await db
      .collection<IEquipment>("equipment")
      .find({ status: "pending" })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      total: equipment.length,
      equipment,
    });
  } catch (error) {
    console.error("Get pending equipment error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve pending equipment.",
    });
  }
};

// ============================================
// UPDATE EQUIPMENT STATUS (ADMIN)
// ============================================

export const updateEquipmentStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (typeof id !== "string" || !ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid equipment ID.",
      });
      return;
    }

    if (!["approved", "rejected"].includes(status)) {
      res.status(400).json({
        success: false,
        message: "Status must be approved or rejected.",
      });
      return;
    }

    const db = getDatabase();

    const result = await db
      .collection<IEquipment>("equipment")
      .updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            status: status as EquipmentStatus,
            updatedAt: new Date(),
          },
        }
      );

    if (result.matchedCount === 0) {
      res.status(404).json({
        success: false,
        message: "Equipment not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Equipment ${status} successfully.`,
    });
  } catch (error) {
    console.error("Update equipment status error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update equipment status.",
    });
  }
};

// ============================================
// GET OWNER'S EQUIPMENT
// ============================================

export const getMyEquipment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId || !ObjectId.isValid(userId)) {
      res.status(401).json({
        success: false,
        message: "Unauthorized. Please login again.",
      });
      return;
    }

    const db = getDatabase();

    const equipment = await db
      .collection<IEquipment>("equipment")
      .find({ ownerId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      total: equipment.length,
      equipment,
    });
  } catch (error) {
    console.error("Get my equipment error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve your equipment.",
    });
  }
};

// ============================================
// GET SINGLE EQUIPMENT (ROLE-BASED ACCESS)
// ============================================

export const getEquipmentById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id;
    const userId = req.user?.userId;
    const role = String(req.user?.role || "").toLowerCase();

    if (!userId || !role) {
      res.status(401).json({
        success: false,
        message: "Unauthorized. Please login again.",
      });
      return;
    }

    if (typeof id !== "string" || !ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid equipment ID.",
      });
      return;
    }

    if (!["customer", "owner", "admin"].includes(role)) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to view this equipment.",
      });
      return;
    }

    const db = getDatabase();

    const equipment = await db
      .collection<IEquipment>("equipment")
      .findOne({ _id: new ObjectId(id) });

    if (!equipment) {
      res.status(404).json({
        success: false,
        message: "Equipment not found in the database.",
      });
      return;
    }

    // Customers can only see approved equipment.
    if (role === "customer" && equipment.status !== "approved") {
      res.status(404).json({
        success: false,
        message: "This equipment is not available.",
      });
      return;
    }

    // Owners can see approved equipment and their own listings.
    if (role === "owner") {
      const isOwner = equipment.ownerId.toString() === userId;

      if (equipment.status !== "approved" && !isOwner) {
        res.status(404).json({
          success: false,
          message: "This equipment is not available.",
        });
        return;
      }
    }

    // Admins can see equipment regardless of its status.
    const owner = await db.collection("users").findOne(
      { _id: equipment.ownerId },
      {
        projection: {
          name: 1,
          photo: 1,
        },
      }
    );

    res.status(200).json({
      success: true,
      message: "Equipment details retrieved successfully.",
      equipment: {
        ...equipment,
        owner: owner
          ? {
              _id: owner._id,
              name: owner.name,
              photo: owner.photo || "",
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Get equipment by ID error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve equipment details.",
    });
  }
};

// ============================================
// UPDATE OWNER'S EQUIPMENT
// ============================================

export const updateMyEquipment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const id = req.params.id;

    if (!userId || !ObjectId.isValid(userId)) {
      res.status(401).json({
        success: false,
        message: "Unauthorized. Please login again.",
      });
      return;
    }

    if (typeof id !== "string" || !ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid equipment ID.",
      });
      return;
    }

    const {
      name,
      description,
      category,
      brand,
      condition,
      pricePerDay,
      pricePerWeek,
      pricePerMonth,
      rentalTypes,
      availableQuantity,
      rentalTerms,
      location,
      images,
    } = req.body;

    if (
      !name ||
      !description ||
      !category ||
      !condition ||
      !location
    ) {
      res.status(400).json({
        success: false,
        message: "Please provide all required equipment information.",
      });
      return;
    }

    if (
      !["new", "like-new", "good", "fair"].includes(condition)
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid equipment condition.",
      });
      return;
    }

    const dailyPrice = Number(pricePerDay);
    const weeklyPrice =
      pricePerWeek !== undefined && pricePerWeek !== ""
        ? Number(pricePerWeek)
        : undefined;
    const monthlyPrice =
      pricePerMonth !== undefined && pricePerMonth !== ""
        ? Number(pricePerMonth)
        : undefined;

    if (!Number.isFinite(dailyPrice) || dailyPrice <= 0) {
      res.status(400).json({
        success: false,
        message: "Daily rental price must be greater than zero.",
      });
      return;
    }

    const selectedRentalTypes: RentalType[] =
      Array.isArray(rentalTypes) && rentalTypes.length > 0
        ? rentalTypes
        : ["daily"];

    if (
      selectedRentalTypes.some(
        (type: string) =>
          !["daily", "weekly", "monthly"].includes(type)
      )
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid rental type.",
      });
      return;
    }

    if (
      selectedRentalTypes.includes("weekly") &&
      (!weeklyPrice ||
        !Number.isFinite(weeklyPrice) ||
        weeklyPrice <= 0)
    ) {
      res.status(400).json({
        success: false,
        message: "Please provide a valid weekly rental price.",
      });
      return;
    }

    if (
      selectedRentalTypes.includes("monthly") &&
      (!monthlyPrice ||
        !Number.isFinite(monthlyPrice) ||
        monthlyPrice <= 0)
    ) {
      res.status(400).json({
        success: false,
        message: "Please provide a valid monthly rental price.",
      });
      return;
    }

    const quantity = Number(availableQuantity);

    if (!Number.isInteger(quantity) || quantity < 1) {
      res.status(400).json({
        success: false,
        message: "Available quantity must be at least 1.",
      });
      return;
    }

    if (!Array.isArray(images) || images.length === 0 || !images[0]) {
      res.status(400).json({
        success: false,
        message: "Please provide at least one equipment image.",
      });
      return;
    }

    const db = getDatabase();
    const equipmentCollection =
      db.collection<IEquipment>("equipment");

    const equipment = await equipmentCollection.findOne({
      _id: new ObjectId(id),
      ownerId: new ObjectId(userId),
    });

    if (!equipment) {
      res.status(404).json({
        success: false,
        message: "Equipment not found or you are not its owner.",
      });
      return;
    }

    const updatedFields: Partial<IEquipment> = {
      name: String(name).trim(),
      description: String(description).trim(),
      category: String(category).trim(),
      brand: brand ? String(brand).trim() : "",
      condition,
      pricePerDay: dailyPrice,
      rentalTypes: selectedRentalTypes,
      availableQuantity: quantity,
      rentalTerms: rentalTerms ? String(rentalTerms).trim() : "",
      location: String(location).trim(),
      images: images
        .filter((image: unknown) => typeof image === "string")
        .map((image: string) => image.trim())
        .filter(Boolean)
        .slice(0, 5),
      status: "pending",
      updatedAt: new Date(),
    };

    const unsetFields: Record<string, ""> = {};

    if (selectedRentalTypes.includes("weekly")) {
      updatedFields.pricePerWeek = weeklyPrice;
    } else {
      unsetFields.pricePerWeek = "";
    }

    if (selectedRentalTypes.includes("monthly")) {
      updatedFields.pricePerMonth = monthlyPrice;
    } else {
      unsetFields.pricePerMonth = "";
    }

    const updateOperation: {
      $set: Partial<IEquipment>;
      $unset?: Record<string, "">;
    } = {
      $set: updatedFields,
    };

    if (Object.keys(unsetFields).length > 0) {
      updateOperation.$unset = unsetFields;
    }

    await equipmentCollection.updateOne(
      {
        _id: new ObjectId(id),
        ownerId: new ObjectId(userId),
      },
      updateOperation
    );

    res.status(200).json({
      success: true,
      message: "Equipment updated and submitted for admin approval.",
    });
  } catch (error) {
    console.error("Update my equipment error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update equipment.",
    });
  }
};
