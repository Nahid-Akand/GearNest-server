
import { Request, Response } from "express";
import { getDatabase } from "../../config/database.js";
import { IUser, UserRole } from "../../types/user.types.js";
import { OAuth2Client } from "google-auth-library";
import {
  hashPassword,
  comparePassword,
} from "../../utils/password.js";
import { generateToken } from "../../utils/jwt.js";

// ==========================================
// REGISTER USER
// ==========================================

export const registerUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, email, password, role } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      res.status(400).json({
        success: false,
        message: "Name, email, and password are required.",
      });
      return;
    }

    // Validate password
    if (
      typeof password !== "string" ||
      password.length < 6 ||
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password)
    ) {
      res.status(400).json({
        success: false,
        message:
          "Password must contain uppercase and lowercase letters and at least 6 characters.",
      });
      return;
    }

    // Validate role
   const userRole: UserRole = "customer";

    // Connect to users collection
    const usersCollection =
      getDatabase().collection<IUser>("users");

    const normalizedEmail = String(email).trim().toLowerCase();

    // Check duplicate email
    const existingUser = await usersCollection.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
      return;
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Prepare user
    const newUser: IUser = {
      name: String(name).trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: userRole,
      provider: "credentials",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save user
    const result = await usersCollection.insertOne(newUser);

    res.status(201).json({
      success: true,
      message: "Registration successful!",
      user: {
        id: result.insertedId,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    res.status(500).json({
      success: false,
      message: "Something went wrong during registration.",
    });
  }
};

// ==========================================
// LOGIN USER
// ==========================================

export const loginUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
      return;
    }

    // Normalize email
    const normalizedEmail = String(email).trim().toLowerCase();

    // Find user in MongoDB
    const usersCollection =
      getDatabase().collection<IUser>("users");

    const user = await usersCollection.findOne({
      email: normalizedEmail,
    });

    // Check user and password existence
    if (!user || !user.password || !user._id) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
      return;
    }

    // Check account status
    if (!user.isActive) {
      res.status(403).json({
        success: false,
        message: "Your account has been deactivated.",
      });
      return;
    }

    // Compare password with hashed password
    const isPasswordCorrect = await comparePassword(
      password,
      user.password
    );

    if (!isPasswordCorrect) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
      return;
    }

    // Generate JWT token
    const token = generateToken(
      user._id,
      user.email,
      user.role
    );

    // Send successful response
    res.status(200).json({
      success: true,
      message: "Login successful!",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        photo: user.photo,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: "Something went wrong during login.",
    });
  }
};
// ==========================================
// GOOGLE LOGIN
// ==========================================

export const googleLogin = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { credential } = req.body;

    if (!credential) {
      res.status(400).json({
        success: false,
        message: "Google credential is required.",
      });
      return;
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (!clientId) {
      res.status(500).json({
        success: false,
        message: "Google authentication is not configured.",
      });
      return;
    }

    // Verify Google's ID token
    const googleClient = new OAuth2Client(clientId);

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });

    const googleUser = ticket.getPayload();

    if (
      !googleUser ||
      !googleUser.email ||
      googleUser.email_verified !== true
    ) {
      res.status(401).json({
        success: false,
        message: "Google account verification failed.",
      });
      return;
    }

    const usersCollection =
      getDatabase().collection<IUser>("users");

    const email = googleUser.email.trim().toLowerCase();

    // Check whether the user already exists
    let user = await usersCollection.findOne({ email });

    if (user && !user.isActive) {
      res.status(403).json({
        success: false,
        message: "Your account has been deactivated.",
      });
      return;
    }

    // Create a new customer account if necessary
    if (!user) {
      const newUser: IUser = {
        name: googleUser.name || email.split("@")[0],
        email,
        photo: googleUser.picture,
        role: "customer",
        provider: "google",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await usersCollection.insertOne(newUser);

      user = {
        ...newUser,
        _id: result.insertedId,
      };
    }

    if (!user._id) {
      res.status(500).json({
        success: false,
        message: "Unable to identify your account.",
      });
      return;
    }

    // Generate GearNest JWT
    const token = generateToken(
      user._id,
      user.email,
      user.role
    );

    res.status(200).json({
      success: true,
      message: "Google login successful!",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        photo: user.photo || googleUser.picture,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Google login error:", error);

    res.status(401).json({
      success: false,
      message: "Google authentication failed. Please try again.",
    });
  }
};
