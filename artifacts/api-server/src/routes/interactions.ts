import { Router } from "express";
import { db } from "@workspace/db";
import {
  commentsTable,
  ratingsTable,
  reportsTable,
  documentsTable,
} from "@workspace/db";
import { eq, desc, sql, and, count } from "drizzle-orm";
import { requireAuth } from "../lib/auth-middleware";

const router = Router();
const AUTO_PENDING_THRESHOLD = 5;

router.get("/documents/:id/comments", async (req, res) => {
  try {
    const docId = String(req.params.id);
    const comments = await db
      .select()
      .from(commentsTable)
      .where(eq(commentsTable.documentId, docId))
      .orderBy(desc(commentsTable.createdAt))
      .limit(100);
    res.json({ comments });
  } catch (err) {
    req.log.error({ err }, "list comments error");
    res.status(500).json({ error: "Internal server error." });
  }
});

router.post("/documents/:id/comments", requireAuth, async (req, res) => {
  try {
    const docId = String(req.params.id);
    const content =
      typeof req.body.content === "string" ? req.body.content.trim() : "";
    if (!content || content.length > 2000) {
      res
        .status(400)
        .json({ error: "Nội dung bình luận không hợp lệ (1-2000 ký tự)." });
      return;
    }

    const [doc] = await db
      .select({ id: documentsTable.id })
      .from(documentsTable)
      .where(eq(documentsTable.id, docId))
      .limit(1);
    if (!doc) {
      res.status(404).json({ error: "Tài liệu không tồn tại." });
      return;
    }

    const [comment] = await db
      .insert(commentsTable)
      .values({
        documentId: docId,
        userId: req.session.userId!,
        userEmail: req.session.userEmail!,
        content,
      })
      .returning();
    res.status(201).json({ comment });
  } catch (err) {
    req.log.error({ err }, "post comment error");
    res.status(500).json({ error: "Internal server error." });
  }
});

router.get("/documents/:id/rating", async (req, res) => {
  try {
    const docId = String(req.params.id);
    const [agg] = await db
      .select({
        avg: sql<number>`round(avg(${ratingsTable.stars})::numeric, 1)`,
        total: count(),
      })
      .from(ratingsTable)
      .where(eq(ratingsTable.documentId, docId));

    let userRating: number | null = null;
    if (req.session.userId) {
      const [existing] = await db
        .select({ stars: ratingsTable.stars })
        .from(ratingsTable)
        .where(
          and(
            eq(ratingsTable.documentId, docId),
            eq(ratingsTable.userId, req.session.userId),
          ),
        )
        .limit(1);
      userRating = existing?.stars ?? null;
    }

    res.json({ avg: agg.avg ?? 0, total: agg.total, userRating });
  } catch (err) {
    req.log.error({ err }, "get rating error");
    res.status(500).json({ error: "Internal server error." });
  }
});

router.post("/documents/:id/rate", requireAuth, async (req, res) => {
  try {
    const docId = String(req.params.id);
    const stars = Number(req.body.stars);
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      res.status(400).json({ error: "Số sao phải từ 1 đến 5." });
      return;
    }

    const [doc] = await db
      .select({ id: documentsTable.id })
      .from(documentsTable)
      .where(eq(documentsTable.id, docId))
      .limit(1);
    if (!doc) {
      res.status(404).json({ error: "Tài liệu không tồn tại." });
      return;
    }

    const [existing] = await db
      .select({ id: ratingsTable.id })
      .from(ratingsTable)
      .where(
        and(
          eq(ratingsTable.documentId, docId),
          eq(ratingsTable.userId, req.session.userId!),
        ),
      )
      .limit(1);

    if (existing) {
      await db
        .update(ratingsTable)
        .set({ stars })
        .where(eq(ratingsTable.id, existing.id));
    } else {
      await db.insert(ratingsTable).values({
        documentId: docId,
        userId: req.session.userId!,
        stars,
      });
    }

    const [agg] = await db
      .select({
        avg: sql<number>`round(avg(${ratingsTable.stars})::numeric, 1)`,
        total: count(),
      })
      .from(ratingsTable)
      .where(eq(ratingsTable.documentId, docId));

    res.json({ avg: agg.avg ?? stars, total: agg.total, userRating: stars });
  } catch (err) {
    req.log.error({ err }, "rate error");
    res.status(500).json({ error: "Internal server error." });
  }
});

router.post("/documents/:id/report", requireAuth, async (req, res) => {
  try {
    const docId = String(req.params.id);
    const validReasons = [
      "Bản quyền",
      "File lỗi",
      "Nội dung sai lệch",
      "Nội dung không phù hợp",
      "Khác",
    ] as const;
    const reason = req.body.reason as string;
    const note =
      typeof req.body.note === "string" ? req.body.note.trim().slice(0, 500) : undefined;

    if (!validReasons.includes(reason as any)) {
      res.status(400).json({ error: "Lý do báo cáo không hợp lệ." });
      return;
    }

    const [doc] = await db
      .select({ id: documentsTable.id, status: documentsTable.status })
      .from(documentsTable)
      .where(eq(documentsTable.id, docId))
      .limit(1);
    if (!doc) {
      res.status(404).json({ error: "Tài liệu không tồn tại." });
      return;
    }

    await db.insert(reportsTable).values({
      documentId: docId,
      userId: req.session.userId!,
      reason: reason as (typeof validReasons)[number],
      note: note || undefined,
      status: "Pending",
    });

    const [pendingCount] = await db
      .select({ total: count() })
      .from(reportsTable)
      .where(
        and(
          eq(reportsTable.documentId, docId),
          eq(reportsTable.status, "Pending"),
        ),
      );

    if (
      pendingCount.total >= AUTO_PENDING_THRESHOLD &&
      doc.status === "Approved"
    ) {
      await db
        .update(documentsTable)
        .set({ status: "Pending" })
        .where(eq(documentsTable.id, docId));
      req.log.warn(
        { docId, reports: pendingCount.total },
        "document auto-pending due to reports",
      );
    }

    res.status(201).json({
      message: "Báo cáo đã được ghi nhận. Cảm ơn bạn đã phản hồi!",
    });
  } catch (err) {
    req.log.error({ err }, "report error");
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
