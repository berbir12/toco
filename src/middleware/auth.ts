/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from "express";
import { adminAuth } from "../lib/firebase-admin.ts";
import { db } from "../db/index.ts";
import { users } from "../db/schema.ts";
import { eq } from "drizzle-orm";

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email: string;
    role: string;
    dbId: number;
  };
}

export async function getOrCreateUser(uid: string, email: string, role?: string) {
  // Determine role: user from metadata berbir901@gmail.com becomes 'admin' automatically
  const defaultRole = role || (email.toLowerCase() === "berbir901@gmail.com" ? "admin" : "customer");

  try {
    // Check if user already exists
    const existing = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (existing.length > 0) {
      // If email or role should be adjusted, we can do it, otherwise return
      const userRecord = existing[0];
      const targetRole = role || (email.toLowerCase() === "berbir901@gmail.com" ? "admin" : userRecord.role);
      if (userRecord.email !== email || userRecord.role !== targetRole) {
        const updated = await db
          .update(users)
          .set({
            email,
            role: targetRole,
          })
          .where(eq(users.uid, uid))
          .returning();
        return updated[0];
      }
      return userRecord;
    }

    // Insert new user
    const inserted = await db
      .insert(users)
      .values({
        uid,
        email,
        role: defaultRole,
      })
      .returning();
    return inserted[0];
  } catch (error) {
    console.error("Error in getOrCreateUser:", error);
    throw error;
  }
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }

  const token = authHeader.split("Bearer ")[1];

  // 1. Handle Passcode Auth for Staff / Admin
  if (token === "passcode_888888") {
    try {
      const dbUser = await getOrCreateUser("admin_passcode", "admin@tocospeciality.com", "admin");
      req.user = {
        uid: "admin_passcode",
        email: "admin@tocospeciality.com",
        role: "admin",
        dbId: dbUser.id,
      };
      return next();
    } catch (e) {
      console.error("Error securing passcode session:", e);
      return res.status(500).json({ error: "Failed to initialize staff session" });
    }
  }

  if (token === "passcode_222222") {
    try {
      const dbUser = await getOrCreateUser("staff_passcode", "staff@tocospeciality.com", "staff");
      req.user = {
        uid: "staff_passcode",
        email: "staff@tocospeciality.com",
        role: "staff",
        dbId: dbUser.id,
      };
      return next();
    } catch (e) {
      console.error("Error securing passcode session:", e);
      return res.status(500).json({ error: "Failed to initialize staff session" });
    }
  }

  // 2. Handle Guest Sessions for scanning customers
  if (token.startsWith("guest_")) {
    try {
      const dbUser = await getOrCreateUser(token, "guest@tocospeciality.com", "customer");
      req.user = {
        uid: token,
        email: "guest@tocospeciality.com",
        role: "customer",
        dbId: dbUser.id,
      };
      return next();
    } catch (e) {
      console.error("Error securing guest session:", e);
      return res.status(500).json({ error: "Failed to initialize guest session" });
    }
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const email = decodedToken.email || "";
    const uid = decodedToken.uid;

    const dbUser = await getOrCreateUser(uid, email);

    req.user = {
      uid,
      email,
      role: dbUser.role,
      dbId: dbUser.id,
    };
    next();
  } catch (error) {
    console.error("Error verifying Firebase ID token:", error);
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
    }
    next();
  };
};
