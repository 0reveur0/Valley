import path from "path";
import { Router } from "express";
import multer from "multer";
import { db } from "@workspace/db";
import { documentsTable, categoriesTable, usersTable, transactionsTable } from "@workspace/db";
import { eq, desc, or, ilike, and, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth-middleware";
import { cloudinary } from "../lib/cloudinary";
import { moderateContentWithAI } from "../lib/ai-moderation";
import { createNotification } from "../lib/notifications";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
const PAGE_SIZE = 12;
const UPLOAD_REWARD_CREDITS = 10;
const MAX_UPLOAD_COUNT_PER_HOUR = 3;
const ALLOWED_UPLOAD_EXTENSIONS = [".pdf", ".docx", ".pptx", ".epub"];
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/epub+zip",
];

function multerUploadMiddleware(req: any, res: any, next: any) {
  upload.single("file")(req, res, (err) => {
    if (!err) return next();

    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "Tài liệu vượt quá 15MB. Hãy nén file hoặc chia nhỏ tài liệu để chia sẻ thong thả nhé!" });
    }

    return res.status(400).json({ error: err.message || "Không thể tải tệp lên." });
  });
}

async function getOrCreateDefaultCategory(txDb: typeof db) {
  const [existing] = await txDb.select().from(categoriesTable).limit(1);
  if (existing) return existing.id;
  const [cat] = await txDb.insert(categoriesTable).values({ name: "General", slug: "general" }).returning();
  return cat.id;
}

function isAllowedUploadFile(fileName: string, mimeType: string) {
  const extension = path.extname(fileName).toLowerCase();
  return ALLOWED_UPLOAD_EXTENSIONS.includes(extension) && ALLOWED_MIME_TYPES.includes(mimeType);
}

async function countRecentUploads(userId: string) {
  const oneHourAgo = new Date(Date.now() - 1000 * 60 * 60);
  const [result] = await db.select({ count: sql<number>`cast(count(*) as int)` })
    .from(documentsTable)
    .where(and(eq(documentsTable.userId, userId), sql`${documentsTable.createdAt} >= ${oneHourAgo}`));
  return result.count;
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

router.post("/documents/upload", requireAuth, multerUploadMiddleware, async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No file uploaded." });
      return;
    }

    const [currentUser] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!)).limit(1);
    if (!currentUser) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    if (currentUser.membershipType !== "Premium") {
      const oneHourAgo = new Date(Date.now() - 1000 * 60 * 60);
      const [uploadCount] = await db.select({ count: sql<number>`cast(count(*) as int)` })
        .from(documentsTable)
        .where(and(eq(documentsTable.userId, currentUser.id), sql`${documentsTable.createdAt} >= ${oneHourAgo}`));

      if (uploadCount.count >= MAX_UPLOAD_COUNT_PER_HOUR) {
        res.status(429).json({ error: "Bạn đang chia sẻ hơi nhanh rồi. Hãy nghỉ tay uống tách trà và quay lại sau ít phút nhé." });
        return;
      }
    }

    const extension = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_UPLOAD_EXTENSIONS.includes(extension) || !ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
      res.status(415).json({ error: "Định dạng tệp không hợp lệ. Vui lòng chọn PDF, DOCX, PPTX hoặc EPUB." });
      return;
    }

    const titleRaw = req.body.title;
    const descRaw = req.body.description;
    const title = typeof titleRaw === "string" && titleRaw.trim() ? titleRaw.trim() : file.originalname.replace(/\.[^.]+$/i, "");
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
      await createNotification(
        req.session.userId!,
        "Tài liệu của bạn đã được xuất bản!",
        `Tài liệu "${title}" đã được AI kiểm duyệt và xuất bản. Bạn nhận được +${UPLOAD_REWARD_CREDITS} điểm.`,
        `/documents/${slug}`,
      );
      res.status(201).json({ message: `Tài liệu đã được duyệt! Bạn nhận +${UPLOAD_REWARD_CREDITS} điểm.`, document: { id: slug, title, status: "Approved" }, creditsAwarded: UPLOAD_REWARD_CREDITS });
      return;
    }

    if (moderation.status === "Rejected") {
      await db.insert(documentsTable).values({ ...baseDoc, status: "Rejected", rejectionReason: moderation.reason || "Nội dung không phù hợp." });
      await createNotification(
        req.session.userId!,
        "Tài liệu bị từ chối",
        `Tài liệu "${title}" bị từ chối: ${moderation.reason || "Nội dung không phù hợp."}`,
        "/workspace",
      );
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

    let hasUnlocked = doc.pointsRequired === 0 || isOwner || isPremium;
    if (isAuthenticated && !hasUnlocked) {
      const [unlockTx] = await db.select({ id: transactionsTable.id })
        .from(transactionsTable)
        .where(
          and(
            eq(transactionsTable.userId, req.session.userId!),
            eq(transactionsTable.documentId, doc.id),
            eq(transactionsTable.type, "Download_Cost"),
            eq(transactionsTable.status, "Completed"),
          ),
        )
        .limit(1);
      hasUnlocked = !!unlockTx;
    }

    res.json({ ...doc, isAuthenticated, isOwner, isPremium, hasUnlocked });
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
        await tx.insert(transactionsTable).values({
          userId: currentUser.id,
          documentId: doc.id,
          type: "Download_Cost",
          points: doc.pointsRequired,
          status: "Completed",
        });
        return updated[0];
      });

      res.json({
        message: "Download request processed successfully.",
        downloadUrl: doc.fileUrl,
        document: { id: doc.id, title: doc.title, pointsRequired: doc.pointsRequired },
      });
    }
  } catch (err) {
    req.log.error({ err }, "downloadRequest error");
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
