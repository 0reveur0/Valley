import { Router } from "express";
import { db } from "@workspace/db";
import {
  savedDocumentsTable,
  collectionsTable,
  collectionDocumentsTable,
  documentsTable,
} from "@workspace/db";
import { eq, and, desc, inArray } from "drizzle-orm";
import { requireAuth } from "../lib/auth-middleware";

const router = Router();

/* ───────── SAVE / UNSAVE ───────── */

router.get("/documents/:id/save-status", requireAuth, async (req, res) => {
  try {
    const docId = String(req.params.id);
    const [existing] = await db
      .select({ id: savedDocumentsTable.id })
      .from(savedDocumentsTable)
      .where(
        and(
          eq(savedDocumentsTable.userId, req.session.userId!),
          eq(savedDocumentsTable.documentId, docId),
        ),
      )
      .limit(1);
    res.json({ saved: !!existing });
  } catch (err) {
    req.log.error({ err }, "save-status error");
    res.status(500).json({ error: "Internal server error." });
  }
});

router.post("/documents/:id/save", requireAuth, async (req, res) => {
  try {
    const docId = String(req.params.id);
    const uid = req.session.userId!;

    const [existing] = await db
      .select({ id: savedDocumentsTable.id })
      .from(savedDocumentsTable)
      .where(
        and(eq(savedDocumentsTable.userId, uid), eq(savedDocumentsTable.documentId, docId)),
      )
      .limit(1);

    if (existing) {
      await db.delete(savedDocumentsTable).where(eq(savedDocumentsTable.id, existing.id));
      res.json({ saved: false, message: "Đã bỏ lưu tài liệu." });
    } else {
      await db.insert(savedDocumentsTable).values({ userId: uid, documentId: docId });
      res.json({ saved: true, message: "Đã lưu tài liệu!" });
    }
  } catch (err) {
    req.log.error({ err }, "save toggle error");
    res.status(500).json({ error: "Internal server error." });
  }
});

/* ───────── COLLECTIONS ───────── */

router.get("/collections", requireAuth, async (req, res) => {
  try {
    const cols = await db
      .select()
      .from(collectionsTable)
      .where(eq(collectionsTable.userId, req.session.userId!))
      .orderBy(desc(collectionsTable.createdAt));
    res.json({ collections: cols });
  } catch (err) {
    req.log.error({ err }, "list collections error");
    res.status(500).json({ error: "Internal server error." });
  }
});

router.post("/collections", requireAuth, async (req, res) => {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const description =
      typeof req.body.description === "string" ? req.body.description.trim() : undefined;
    const isPublic = req.body.isPublic ? 1 : 0;
    if (!name || name.length > 100) {
      res.status(400).json({ error: "Tên bộ sưu tập không hợp lệ (1-100 ký tự)." });
      return;
    }
    const [col] = await db
      .insert(collectionsTable)
      .values({ userId: req.session.userId!, name, description, isPublic })
      .returning();
    res.status(201).json({ collection: col });
  } catch (err) {
    req.log.error({ err }, "create collection error");
    res.status(500).json({ error: "Internal server error." });
  }
});

router.delete("/collections/:colId", requireAuth, async (req, res) => {
  try {
    const colId = String(req.params.colId);
    const [col] = await db
      .select({ userId: collectionsTable.userId })
      .from(collectionsTable)
      .where(eq(collectionsTable.id, colId))
      .limit(1);
    if (!col || col.userId !== req.session.userId) {
      res.status(404).json({ error: "Không tìm thấy bộ sưu tập." });
      return;
    }
    await db.delete(collectionDocumentsTable).where(eq(collectionDocumentsTable.collectionId, colId));
    await db.delete(collectionsTable).where(eq(collectionsTable.id, colId));
    res.json({ message: "Đã xoá bộ sưu tập." });
  } catch (err) {
    req.log.error({ err }, "delete collection error");
    res.status(500).json({ error: "Internal server error." });
  }
});

router.get("/collections/:colId/documents", requireAuth, async (req, res) => {
  try {
    const colId = String(req.params.colId);
    const [col] = await db
      .select()
      .from(collectionsTable)
      .where(eq(collectionsTable.id, colId))
      .limit(1);
    if (!col || col.userId !== req.session.userId) {
      res.status(404).json({ error: "Không tìm thấy bộ sưu tập." });
      return;
    }
    const links = await db
      .select({ documentId: collectionDocumentsTable.documentId })
      .from(collectionDocumentsTable)
      .where(eq(collectionDocumentsTable.collectionId, colId));
    const docIds = links.map((l) => l.documentId);
    const docs =
      docIds.length > 0
        ? await db.select().from(documentsTable).where(inArray(documentsTable.id, docIds))
        : [];
    res.json({ collection: col, documents: docs });
  } catch (err) {
    req.log.error({ err }, "collection docs error");
    res.status(500).json({ error: "Internal server error." });
  }
});

router.post("/collections/:colId/documents", requireAuth, async (req, res) => {
  try {
    const colId = String(req.params.colId);
    const docId = typeof req.body.documentId === "string" ? req.body.documentId : "";
    if (!docId) {
      res.status(400).json({ error: "documentId là bắt buộc." });
      return;
    }
    const [col] = await db
      .select({ userId: collectionsTable.userId })
      .from(collectionsTable)
      .where(eq(collectionsTable.id, colId))
      .limit(1);
    if (!col || col.userId !== req.session.userId) {
      res.status(404).json({ error: "Không tìm thấy bộ sưu tập." });
      return;
    }
    const [existing] = await db
      .select({ id: collectionDocumentsTable.id })
      .from(collectionDocumentsTable)
      .where(
        and(
          eq(collectionDocumentsTable.collectionId, colId),
          eq(collectionDocumentsTable.documentId, docId),
        ),
      )
      .limit(1);
    if (existing) {
      res.json({ message: "Tài liệu đã có trong bộ sưu tập." });
      return;
    }
    await db.insert(collectionDocumentsTable).values({ collectionId: colId, documentId: docId });
    res.status(201).json({ message: "Đã thêm vào bộ sưu tập!" });
  } catch (err) {
    req.log.error({ err }, "add to collection error");
    res.status(500).json({ error: "Internal server error." });
  }
});

router.delete("/collections/:colId/documents/:docId", requireAuth, async (req, res) => {
  try {
    const colId = String(req.params.colId);
    const docId = String(req.params.docId);
    const [col] = await db
      .select({ userId: collectionsTable.userId })
      .from(collectionsTable)
      .where(eq(collectionsTable.id, colId))
      .limit(1);
    if (!col || col.userId !== req.session.userId) {
      res.status(404).json({ error: "Không tìm thấy bộ sưu tập." });
      return;
    }
    await db
      .delete(collectionDocumentsTable)
      .where(
        and(
          eq(collectionDocumentsTable.collectionId, colId),
          eq(collectionDocumentsTable.documentId, docId),
        ),
      );
    res.json({ message: "Đã xoá khỏi bộ sưu tập." });
  } catch (err) {
    req.log.error({ err }, "remove from collection error");
    res.status(500).json({ error: "Internal server error." });
  }
});

/* ───────── SAVED ITEMS (for workspace) ───────── */

router.get("/user/saved-items", requireAuth, async (req, res) => {
  try {
    const uid = req.session.userId!;

    const saved = await db
      .select({ documentId: savedDocumentsTable.documentId, savedAt: savedDocumentsTable.savedAt })
      .from(savedDocumentsTable)
      .where(eq(savedDocumentsTable.userId, uid))
      .orderBy(desc(savedDocumentsTable.savedAt));

    const docIds = saved.map((s) => s.documentId);
    const docs =
      docIds.length > 0
        ? await db
            .select()
            .from(documentsTable)
            .where(inArray(documentsTable.id, docIds))
        : [];

    const collections = await db
      .select()
      .from(collectionsTable)
      .where(eq(collectionsTable.userId, uid))
      .orderBy(desc(collectionsTable.createdAt));

    res.json({ savedDocuments: docs, collections });
  } catch (err) {
    req.log.error({ err }, "saved-items error");
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
