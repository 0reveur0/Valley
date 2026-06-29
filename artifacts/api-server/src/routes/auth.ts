import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth-middleware";

const router = Router();

router.post("/auth/register", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    const emailStr = typeof email === "string" ? email.trim().toLowerCase() : "";
    const passwordStr = typeof password === "string" ? password : "";

    if (!emailStr || !passwordStr) {
      res.status(400).json({ error: "Email and password are required." });
      return;
    }
    if (passwordStr.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters." });
      return;
    }

    const existing = await db.select().from(usersTable).where(eq(usersTable.email, emailStr)).limit(1);
    if (existing.length > 0) {
      res.status(400).json({ error: "Email already registered." });
      return;
    }

    const passwordHash = await bcrypt.hash(passwordStr, 12);
    const [user] = await db.insert(usersTable).values({
      email: emailStr,
      passwordHash,
      role: "User",
      membershipType: "Free",
      credits: 10,
    }).returning();

    req.session.userId = user.id;
    req.session.userEmail = user.email;
    req.session.userRole = user.role;
    req.session.membershipType = user.membershipType;
    req.session.credits = user.credits;

    res.status(201).json({
      message: "User registered successfully.",
      user: { id: user.id, email: user.email, role: user.role, membershipType: user.membershipType, credits: user.credits },
    });
  } catch (err) {
    req.log.error({ err }, "register error");
    res.status(500).json({ error: "Internal server error." });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    const emailStr = typeof email === "string" ? email.trim().toLowerCase() : "";
    const passwordStr = typeof password === "string" ? password : "";

    if (!emailStr || !passwordStr) {
      res.status(400).json({ error: "Email and password are required." });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, emailStr)).limit(1);
    if (!user?.passwordHash) {
      res.status(401).json({ error: "Invalid credentials." });
      return;
    }

    const isValid = await bcrypt.compare(passwordStr, user.passwordHash);
    if (!isValid) {
      res.status(401).json({ error: "Invalid credentials." });
      return;
    }

    req.session.userId = user.id;
    req.session.userEmail = user.email;
    req.session.userRole = user.role;
    req.session.membershipType = user.membershipType;
    req.session.credits = user.credits;

    res.json({
      message: "Login successful.",
      user: { id: user.id, email: user.email, role: user.role, membershipType: user.membershipType, credits: user.credits },
    });
  } catch (err) {
    req.log.error({ err }, "login error");
    res.status(500).json({ error: "Internal server error." });
  }
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: "Failed to logout." });
      return;
    }
    res.clearCookie("connect.sid");
    res.json({ message: "Logged out successfully." });
  });
});

router.get("/auth/me", requireAuth, async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!)).limit(1);
    if (!user) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    req.session.credits = user.credits;
    req.session.membershipType = user.membershipType;
    res.json({ user: { id: user.id, email: user.email, role: user.role, membershipType: user.membershipType, credits: user.credits } });
  } catch (err) {
    req.log.error({ err }, "getMe error");
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
