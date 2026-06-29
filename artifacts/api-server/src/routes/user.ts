import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, documentsTable, userDailyCheckinsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth-middleware";

const router = Router();
const DAILY_REWARD_POINTS = 2;

router.get("/user/profile", requireAuth, async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!)).limit(1);
    if (!user) { res.status(401).json({ error: "Unauthorized." }); return; }
    res.json({ user: { id: user.id, email: user.email, role: user.role, membershipType: user.membershipType, credits: user.credits } });
  } catch (err) {
    req.log.error({ err }, "getUserProfile error");
    res.status(500).json({ error: "Internal server error." });
  }
});

router.get("/user/workspace", requireAuth, async (req, res) => {
  try {
    const [user, docs] = await Promise.all([
      db.select({ email: usersTable.email, credits: usersTable.credits, membershipType: usersTable.membershipType, createdAt: usersTable.createdAt })
        .from(usersTable).where(eq(usersTable.id, req.session.userId!)).limit(1),
      db.select({
        id: documentsTable.id, title: documentsTable.title, totalPages: documentsTable.totalPages,
        pointsRequired: documentsTable.pointsRequired, viewCount: documentsTable.viewCount,
        downloadCount: documentsTable.downloadCount, status: documentsTable.status,
        rejectionReason: documentsTable.rejectionReason, createdAt: documentsTable.createdAt,
      }).from(documentsTable).where(eq(documentsTable.userId, req.session.userId!)).orderBy(desc(documentsTable.createdAt)),
    ]);
    if (!user[0]) { res.status(401).json({ error: "Unauthorized." }); return; }
    res.json({
      user: { ...user[0], createdAt: user[0].createdAt.toISOString() },
      documents: docs.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() })),
    });
  } catch (err) {
    req.log.error({ err }, "getWorkspace error");
    res.status(500).json({ error: "Internal server error." });
  }
});

router.get("/user/daily-checkin", requireAuth, async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const rows = await db.select().from(userDailyCheckinsTable)
      .where(eq(userDailyCheckinsTable.userId, req.session.userId!));
    const checkedInToday = rows.some((r) => r.checkedInDate === today);
    res.json({ checkedInToday });
  } catch (err) {
    req.log.error({ err }, "getCheckinStatus error");
    res.status(500).json({ error: "Internal server error." });
  }
});

router.post("/user/daily-checkin", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const today = new Date().toISOString().slice(0, 10);

    const rows = await db.select().from(userDailyCheckinsTable).where(eq(userDailyCheckinsTable.userId, userId));
    const alreadyCheckedIn = rows.some((r) => r.checkedInDate === today);
    if (alreadyCheckedIn) {
      res.status(400).json({ error: "Hôm nay bạn đã nhận điểm rồi, quay lại vào ngày mai nhé!" });
      return;
    }

    const [updatedUser] = await db.transaction(async (tx) => {
      await tx.insert(userDailyCheckinsTable).values({ userId, checkedInDate: today });
      return tx.update(usersTable)
        .set({ credits: sql`${usersTable.credits} + ${DAILY_REWARD_POINTS}` })
        .where(eq(usersTable.id, userId))
        .returning({ credits: usersTable.credits });
    });

    const newCredits = updatedUser?.credits ?? (req.session.credits ?? 0) + DAILY_REWARD_POINTS;
    req.session.credits = newCredits;

    res.json({ message: "Điểm danh thành công!", newCredits, pointsEarned: DAILY_REWARD_POINTS });
  } catch (err) {
    req.log.error({ err }, "dailyCheckin error");
    res.status(500).json({ error: "Lỗi máy chủ. Vui lòng thử lại sau." });
  }
});

export default router;
