import { pgTable, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const documentStatusEnum = pgEnum("document_status", ["Pending", "Approved", "Rejected"]);

export const categoriesTable = pgTable("categories", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
});

export const documentsTable = pgTable("documents", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  description: text("description"),
  slug: text("slug").notNull().unique(),
  fileUrl: text("file_url").notNull(),
  previewPattern: text("preview_pattern"),
  totalPages: integer("total_pages").notNull().default(0),
  status: documentStatusEnum("status").notNull().default("Pending"),
  viewCount: integer("view_count").notNull().default(0),
  downloadCount: integer("download_count").notNull().default(0),
  pointsRequired: integer("points_required").notNull().default(0),
  rejectionReason: text("rejection_reason"),
  userId: text("user_id").notNull(),
  categoryId: text("category_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userDailyCheckinsTable = pgTable("user_daily_checkins", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  checkedInDate: text("checked_in_date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDocumentSchema = createInsertSchema(documentsTable).omit({ id: true, createdAt: true });
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documentsTable.$inferSelect;
export type Category = typeof categoriesTable.$inferSelect;
