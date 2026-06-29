import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable, referralFraudLogsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth-middleware";
import { generateReferralCode, getClientIp, checkFraud } from "../lib/referral";

const router = Router();

const REGISTER_BONUS = 10;
const REFERRAL_BONUS_EACH = 20;

router.post("/auth/register", async (req, res) => {
  try {
    const { email, password, referralCode } = req.body as {
      email?: string;
      password?: string;
      referralCode?: string;
    };

    const emailStr = typeof email === "string" ? email.trim().toLowerCase() : "";
    const passwordStr = typeof password === "string" ? password : "";
    const refCode = typeof referralCode === "string" ? referralCode.trim().toUpperCase() : "";

    if (!emailStr || !passwordStr) {
      res.status(400).json({ error: "Email và mật khẩu là bắt buộc." });
      return;
    }
    if (passwordStr.length < 8) {
      res.status(400).json({ error: "Mật khẩu phải có ít nhất 8 ký tự." });
      return;
    }

    const existing = await db.select().from(usersTable).where(eq(usersTable.email, emailStr)).limit(1);
    if (existing.length > 0) {
      res.status(400).json({ error: "Email này đã được đăng ký." });
      return;
    }

    const newUserIp = getClientIp(req as any);
    const newUserAgent = String(req.headers["user-agent"] ?? "");
    const passwordHash = await bcrypt.hash(passwordStr, 12);
    const newReferralCode = generateReferralCode(emailStr);

    let referrer: typeof usersTable.$inferSelect | null = null;
    let fraudResult: ReturnType<typeof checkFraud> = { fraudulent: false };

    if (refCode) {
      const [found] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.referralCode, refCode))
        .limit(1);
      referrer = found ?? null;

      if (referrer) {
        const timeDiffMs = Date.now() - referrer.createdAt.getTime();
        fraudResult = checkFraud({
          newUserIp,
          referrerIp: referrer.registrationIp ?? null,
          newUserAgent,
          referrerUserAgent: referrer.registrationUserAgent ?? null,
          newUserEmail: emailStr,
          referrerEmail: referrer.email,
          timeDiffMs,
        });
      }
    }

    const isFraud = fraudResult.fraudulent;
    const initialCredits = REGISTER_BONUS;

    const [user] = await db
      .insert(usersTable)
      .values({
        email: emailStr,
        passwordHash,
        role: "User",
        membershipType: "Free",
        credits: initialCredits,
        referralCode: newReferralCode,
        referredBy: referrer && !isFraud ? referrer.id : undefined,
        registrationIp: newUserIp,
        registrationUserAgent: newUserAgent.slice(0, 500),
      })
      .returning();

    if (referrer && isFraud) {
      await db.insert(referralFraudLogsTable).values({
        newUserId: user.id,
        referrerId: referrer.id,
        referralCode: refCode,
        reason: (fraudResult as { fraudulent: true; reason: string }).reason,
        newUserIp,
        referrerIp: referrer.registrationIp,
        newUserAgent: newUserAgent.slice(0, 500),
        referrerUserAgent: referrer.registrationUserAgent,
      });
      req.log.warn(
        { newUserId: user.id, referrerId: referrer.id, reason: (fraudResult as any).reason },
        "referral_fraud_detected"
      );
    } else if (referrer && !isFraud) {
      await db
        .update(usersTable)
        .set({ credits: sql`${usersTable.credits} + ${REFERRAL_BONUS_EACH}` })
        .where(eq(usersTable.id, referrer.id));
      await db
        .update(usersTable)
        .set({ credits: sql`${usersTable.credits} + ${REFERRAL_BONUS_EACH}` })
        .where(eq(usersTable.id, user.id));
    }

    req.session.userId = user.id;
    req.session.userEmail = user.email;
    req.session.userRole = user.role;
    req.session.membershipType = user.membershipType;
    req.session.credits = referrer && !isFraud
      ? user.credits + REFERRAL_BONUS_EACH
      : user.credits;

    const responseMsg = referrer && !isFraud
      ? `Đăng ký thành công! Bạn nhận +${REGISTER_BONUS + REFERRAL_BONUS_EACH} điểm (chào mừng + giới thiệu).`
      : "Đăng ký thành công!";

    res.status(201).json({
      message: responseMsg,
      referralApplied: !!(referrer && !isFraud),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        membershipType: user.membershipType,
        credits: req.session.credits,
        referralCode: user.referralCode,
      },
    });
  } catch (err) {
    req.log.error({ err }, "register error");
    res.status(500).json({ error: "Lỗi máy chủ. Vui lòng thử lại." });
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
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        membershipType: user.membershipType,
        credits: user.credits,
        referralCode: user.referralCode,
      },
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
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.session.userId!))
      .limit(1);
    if (!user) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    req.session.credits = user.credits;
    req.session.membershipType = user.membershipType;
    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        membershipType: user.membershipType,
        credits: user.credits,
        referralCode: user.referralCode,
      },
    });
  } catch (err) {
    req.log.error({ err }, "getMe error");
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
