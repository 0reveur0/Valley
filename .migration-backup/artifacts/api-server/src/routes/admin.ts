import { Router } from "express";
import { db } from "@workspace/db";
import { documentsTable, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAdmin } from "../lib/auth-middleware";

const router = Router();
const APPROVE_CREDIT_REWARD = 10;

router.get("/admin/stats", requireAdmin, async (req, res) => {
  try {
    const [total, pending, approved, users] = await Promise.all([
      db.select({ count: sql<number>`cast(count(*) as int)` }).from(documentsTable),
      db.select({ count: sql<number>`cast(count(*) as int)` }).from(documentsTable).where(eq(documentsTable.status, "Pending")),
      db.select({ count: sql<number>`cast(count(*) as int)` }).from(documentsTable).where(eq(documentsTable.status, "Approved")),
      db.select({ count: sql<number>`cast(count(*) as int)` }).from(usersTable),
    ]);
    res.json({
      totalDocuments: total[0].count,
      pendingDocuments: pending[0].count,
      approvedDocuments: approved[0].count,
      totalUsers: users[0].count,
    });
  } catch (err) {
    req.log.error({ err }, "getAdminStats error");
    res.status(500).json({ error: "Internal server error." });
  }
});

router.get("/admin/pending-documents", requireAdmin, async (req, res) => {
  try {
    const docs = await db.select({
      id: documentsTable.id,
      title: documentsTable.title,
      totalPages: documentsTable.totalPages,
      pointsRequired: documentsTable.pointsRequired,
      previewPattern: documentsTable.previewPattern,
      createdAt: documentsTable.createdAt,
      uploaderEmail: usersTable.email,
    })
      .from(documentsTable)
      .innerJoin(usersTable, eq(documentsTable.userId, usersTable.id))
      .where(eq(documentsTable.status, "Pending"))
      .orderBy(documentsTable.createdAt);

    res.json({ documents: docs.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() })) });
  } catch (err) {
    req.log.error({ err }, "getPendingDocuments error");
    res.status(500).json({ error: "Internal server error." });
  }
});

router.post("/admin/documents/:id/review", requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    const { action } = req.body as { action?: string };

    if (action !== "APPROVE" && action !== "REJECT") {
      res.status(400).json({ error: 'Invalid action. Must be "APPROVE" or "REJECT".' });
      return;
    }

    const [doc] = await db.select().from(documentsTable).where(eq(documentsTable.id, id)).limit(1);
    if (!doc) {
      res.status(404).json({ error: "Document not found." });
      return;
    }

    if (action === "APPROVE") {
      const result = await db.update(documentsTable)
        .set({ status: "Approved" })
        .where(eq(documentsTable.id, doc.id))
        .returning();

      if (result.length > 0) {
        await db.update(usersTable)
          .set({ credits: sql`${usersTable.credits} + ${APPROVE_CREDIT_REWARD}` })
          .where(eq(usersTable.id, doc.userId));
      }

      res.json({ message: `Document "${doc.title}" approved. Author rewarded +${APPROVE_CREDIT_REWARD} credits.`, status: "Approved" });
      return;
    }

    await db.update(documentsTable).set({ status: "Rejected" }).where(eq(documentsTable.id, doc.id));
    res.json({ message: `Document "${doc.title}" rejected.`, status: "Rejected" });
  } catch (err) {
    req.log.error({ err }, "reviewDocument error");
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
