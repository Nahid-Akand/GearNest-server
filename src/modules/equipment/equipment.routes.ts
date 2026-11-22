import { Router } from "express";

import {
  createEquipment,
  getAllApprovedEquipment,
  getPendingEquipment,
  updateEquipmentStatus,
  getMyEquipment,
  getEquipmentById,
  updateMyEquipment,
} from "./equipment.controller.js";



import { verifyToken } from "../../middlewares/auth.middleware.js";
import { authorizeRoles } from "../../middlewares/role.middleware.js";

const router = Router();

router.get("/", (req, res, next) => {
  getAllApprovedEquipment(req, res).catch(next);
});

// ADMIN: Get pending equipment
router.get(
  "/pending",
  verifyToken,
  authorizeRoles("admin"),
  getPendingEquipment
);

// OWNER: Get my equipment
router.get(
  "/my-equipment",
  verifyToken,
  authorizeRoles("owner"),
  getMyEquipment
);
router.patch(
  "/my-equipment/:id",
  verifyToken,
  authorizeRoles("owner"),
  updateMyEquipment
);

// PUBLIC: Get equipment details
// PRIVATE: Get equipment details (authenticated users)
router.get("/:id", verifyToken, getEquipmentById);

// ADMIN: Approve or reject equipment
router.patch(
  "/:id/status",
  verifyToken,
  authorizeRoles("admin"),
  updateEquipmentStatus
);

// OWNER: Create equipment
router.post(
  "/",
  verifyToken,
  authorizeRoles("owner"),
  createEquipment
);

export default router;
