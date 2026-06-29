import { Router } from "express";
import multer from "multer";
import { db } from "@workspace/db";
import { documentsTable, categoriesTable, usersTable } from "@workspace/db";
import { eq, desc, or, ilike, and, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth-middleware";
import { cloudinary } from "../lib/cloudinary";
import { moderateContentWithAI } from "../lib/ai-moderation";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const PAGE_SIZE = 12;
const UPLOAD_REWARD_CREDITS = 10;

async function getOrCreateDefaultCategory(txDb: typeof db) {
  const [existing] = await txDb.select().from(categoriesTable).limit(1);
  if (existing) return existing.id;
  const [cat] = await txDb.insert(categoriesTable).values({ name: "General", slug: "general" }).returning();
  return cat.id;
}

router.get("/stats", async (req, res) => {
  try {
    const [docsResult] = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(documentsTable).where(eq(documentsTable.status, "Approved"));
    const [usersResult] = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(usersTable);
    res.json({ totalDocs: docsResult.count, totalUsers: usersResult.count });
  } catch (err) {
    req.log.error({ err }, "stats error");
    res.status(500).json({ error: "Internal server error." });
  }
});

router.get("/documents", async (req, res) => {
  try {
    const docs = await db.select({
      id: documentsTable.id,
      title: documentsTable.title,
      slug: documentsTable.slug,
      totalPages: documentsTable.totalPages,
      pointsRequired: documentsTable.pointsRequired,
      viewCount: documentsTable.viewCount,
      downloadCount: documentsTable.downloadCount,
      uploaderEmail: usersTable.email,
    })
      .from(documentsTable)
      .innerJoin(usersTable, eq(documentsTable.userId, usersTable.id))
      .where(eq(documentsTable.status, "Approved"))
      .orderBy(desc(documentsTable.viewCount))
      .limit(6);
    res.json({ documents: docs });
  } catch (err) {
    req.log.error({ err }, "listDocuments error");
    res.status(500).json({ error: "Internal server error." });
  }
});

router.get("/documents/search", async (req, res) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const category = typeof req.query.category === "string" ? req.query.category.trim() : "";
    const sort = req.query.sort === "most_viewed" ? "most_viewed" : "latest";
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));

    const baseWhere = eq(documentsTable.status, "Approved");
    const textFilter = q ? or(ilike(documentsTable.title, `%${q}%`), ilike(documentsTable.description, `%${q}%`)) : undefined;
    const catFilter = category ? eq(categoriesTable.slug, category) : undefined;
    const whereClause = and(baseWhere, textFilter, catFilter);

    const orderByClause = sort === "most_viewed" ? desc(documentsTable.viewCount) : desc(documentsTable.createdAt);

    const [docs, totalResult, cats] = await Promise.all([
      db.select({
        id: documentsTable.id,
        title: documentsTable.title,
        slug: documentsTable.slug,
        previewPattern: documentsTable.previewPattern,
        totalPages: documentsTable.totalPages,
        viewCount: documentsTable.viewCount,
        downloadCount: documentsTable.downloadCount,
        pointsRequired: documentsTable.pointsRequired,
        createdAt: documentsTable.createdAt,
        categoryName: categoriesTable.name,
        categorySlug: categoriesTable.slug,
        uploaderEmail: usersTable.email,
        uploaderId: usersTable.id,
      })
        .from(documentsTable)
        .innerJoin(usersTable, eq(documentsTable.userId, usersTable.id))
        .innerJoin(categoriesTable, eq(documentsTable.categoryId, categoriesTable.id))
        .where(whereClause as any)
        .orderBy(orderByClause)
        .limit(PAGE_SIZE)
        .offset((page - 1) * PAGE_SIZE),
      db.select({ count: sql<number>`cast(count(*) as int)` }).from(documentsTable).innerJoin(categoriesTable, eq(documentsTable.categoryId, categoriesTable.id)).where(whereClause as any),
      db.select().from(categoriesTable).orderBy(categoriesTable.name),
    ]);

    const total = totalResult[0].count;
    const serialized = docs.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() }));
    const categories = cats.map((c) => ({ id: c.id, name: c.name, slug: c.slug }));

    res.json({
      documents: serialized,
      categories,
      pagination: { page, pageSize: PAGE_SIZE, total, totalPages: Math.ceil(total / PAGE_SIZE) },
    });
  } catch (err) {
    req.log.error({ err }, "searchDocuments error");
    res.status(500).json({ error: "Internal server error." });
  }
});

router.post("/documents/upload", requireAuth, upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No file uploaded." });
      return;
    }
    if (!file.originalname.toLowerCase().endsWith(".pdf")) {
      res.status(400).json({ error: "Only PDF files are allowed." });
      return;
    }

    const titleRaw = req.body.title;
    const descRaw = req.body.description;
    const title = typeof titleRaw === "string" && titleRaw.trim() ? titleRaw.trim() : file.originalname.replace(/\.pdf$/i, "");
    const description = typeof descRaw === "string" ? descRaw.trim() : "";

    let uploadResult: { secure_url: string; pages?: number };
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      uploadResult = await new Promise((resolve, reject) => {
        // @ts-ignore
        const stream = cloudinary.uploader.upload_stream(
          { folder: "valley_documents/originals", resource_type: "raw", format: "pdf" },
          (error: any, result: any) => {
            if (error || !result) { reject(error ?? new Error("Cloudinary upload failed.")); return; }
            resolve({ secure_url: result.secure_url, pages: result.pages });
          }
        );
        stream.end(file.buffer);
      });
    } else {
      res.status(503).json({ error: "File storage is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET." });
      return;
    }

    const previewPattern = process.env.CLOUDINARY_CLOUD_NAME
      ? `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/valley_documents/previews/{{page}}.jpg`
      : "";

    const moderation = await moderateContentWithAI(title, description, file.originalname);
    const categoryId = await getOrCreateDefaultCategory(db);
    const slug = `${Date.now()}-${file.originalname.replace(/\s+/g, "-").toLowerCase()}`;

    const baseDoc = {
      title, description: description || "Uploaded via Valley", slug,
      fileUrl: uploadResult.secure_url, previewPattern,
      totalPages: uploadResult.pages ?? 0,
      userId: req.session.userId!,
      categoryId,
    };

    if (moderation.status === "Approved") {
      await db.transaction(async (tx) => {
        await tx.insert(documentsTable).values({ ...baseDoc, status: "Approved" });
        await tx.update(usersTable).set({ credits: sql`${usersTable.credits} + ${UPLOAD_REWARD_CREDITS}` }).where(eq(usersTable.id, req.session.userId!));
      });
      req.session.credits = (req.session.credits ?? 0) + UPLOAD_REWARD_CREDITS;
      res.status(201).json({ message: `Tài liệu đã được duyệt! Bạn nhận +${UPLOAD_REWARD_CREDITS} điểm.`, document: { id: slug, title, status: "Approved" }, creditsAwarded: UPLOAD_REWARD_CREDITS });
      return;
    }

    if (moderation.status === "Rejected") {
      await db.insert(documentsTable).values({ ...baseDoc, status: "Rejected", rejectionReason: moderation.reason || "Nội dung không phù hợp." });
      res.status(422).json({ error: "Tài liệu bị từ chối bởi hệ thống kiểm duyệt.", rejectionReason: moderation.reason, document: { id: slug, title, status: "Rejected" } });
      return;
    }

    await db.insert(documentsTable).values({ ...baseDoc, status: "Pending" });
    res.status(202).json({ message: "Tài liệu đang chờ kiểm duyệt thủ công.", document: { id: slug, title, status: "Pending" } });
  } catch (err) {
    req.log.error({ err }, "uploadDocument error");
    res.status(500).json({ error: "Internal server error." });
  }
});

router.get("/documents/:id", async (req, res) => {
  try {
    const id = String(req.params.id);
    const [doc] = await db.select({
      id: documentsTable.id,
      title: documentsTable.title,
      slug: documentsTable.slug,
      previewPattern: documentsTable.previewPattern,
      totalPages: documentsTable.totalPages,
      viewCount: documentsTable.viewCount,
      downloadCount: documentsTable.downloadCount,
      pointsRequired: documentsTable.pointsRequired,
      status: documentsTable.status,
      userId: documentsTable.userId,
      uploaderEmail: usersTable.email,
      uploaderId: usersTable.id,
    })
      .from(documentsTable)
      .innerJoin(usersTable, eq(documentsTable.userId, usersTable.id))
      .where(or(eq(documentsTable.id, id), eq(documentsTable.slug, id)))
      .limit(1);

    if (!doc) {
      res.status(404).json({ error: "Document not found." });
      return;
    }

    await db.update(documentsTable).set({ viewCount: sql`${documentsTable.viewCount} + 1` }).where(eq(documentsTable.id, doc.id));

    const isAuthenticated = !!req.session.userId;
    const isOwner = isAuthenticated && req.session.userId === doc.userId;
    const isPremium = req.session.membershipType === "Premium";

    res.json({ ...doc, isAuthenticated, isOwner, isPremium });
  } catch (err) {
    req.log.error({ err }, "getDocument error");
    res.status(500).json({ error: "Internal server error." });
  }
});

router.post("/documents/:id/download-request", requireAuth, async (req, res) => {
  try {
    const id = String(req.params.id);
    const [doc] = await db.select().from(documentsTable)
      .where(or(eq(documentsTable.id, id), eq(documentsTable.slug, id)))
      .limit(1);
    if (!doc) {
      res.status(404).json({ error: "Document not found." });
      return;
    }

    const [currentUser] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!)).limit(1);
    if (!currentUser) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    const isAdmin = currentUser.role === "Admin";
    const isAuthor = doc.userId === currentUser.id;

    if (doc.status !== "Approved" && !isAdmin && !isAuthor) {
      res.status(403).json({ error: "Tài liệu này chưa được phê duyệt." });
      return;
    }

    const isPremium = currentUser.membershipType === "Premium";

    if (!isPremium && !isAuthor) {
      if (currentUser.credits < doc.pointsRequired) {
        res.status(402).json({ error: "Bạn không đủ điểm để tải tài liệu này", code: "INSUFFICIENT_CREDITS" });
        return;
      }
      const [debitResult] = await db.transaction(async (tx) => {
        const updated = await tx.update(usersTable)
          .set({ credits: sql`${usersTable.credits} - ${doc.pointsRequired}` })
          .where(and(eq(usersTable.id, currentUser.id), sql`${usersTable.credits} >= ${doc.pointsRequired}`))
          .returning({ credits: usersTable.credits });
        if (updated.length === 0) {
          throw new Error("CONCURRENT_CREDIT_DEBIT_FAILED");
        }
        await tx.update(usersTable)
          .set({ credits: sql`${usersTable.credits} + 2` })
          .where(eq(usersTable.id, doc.userId));
        return updated;
      });
      req.session.credits = debitResult.credits;
    }

    await db.update(documentsTable).set({ downloadCount: sql`${documentsTable.downloadCount} + 1` }).where(eq(documentsTable.id, doc.id));

    res.json({
      message: "Download request processed successfully.",
      downloadUrl: doc.fileUrl,
      document: { id: doc.id, title: doc.title, pointsRequired: doc.pointsRequired },
    });
  } catch (err) {
    req.log.error({ err }, "downloadRequest error");
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
