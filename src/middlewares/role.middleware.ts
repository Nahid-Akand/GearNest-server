
import { Response, NextFunction } from "express";
import { UserRole } from "../types/user.types.js";
import { AuthRequest } from "./auth.middleware.js";

export const authorizeRoles = (...allowedRoles: UserRole[]) => {
  return (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): void => {
    // Check whether the user is authenticated
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Please login first.",
      });
      return;
    }

    // Check whether the user's role is allowed
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource.",
      });
      return;
    }

    next();
  };
};
