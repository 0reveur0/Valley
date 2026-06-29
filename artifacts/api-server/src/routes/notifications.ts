import { Router } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth-middleware";

const router = Router();

router.get("/notifications", requireAuth, async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.userId, req.session.userId!))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(10);
    res.json({ notifications: rows });
  } catch (err) {
    req.log.error({ err }, "getNotifications error");
    res.status(500).json({ error: "Internal server error." });
  }
});

router.put("/notifications/read-all", requireAuth, async (req, res) => {
  try {
    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(eq(notificationsTable.userId, req.session.userId!));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "markNotificationsRead error");
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
