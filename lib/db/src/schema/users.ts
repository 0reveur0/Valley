import { pgTable, text, integer, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userRoleEnum = pgEnum("user_role", ["Admin", "User"]);
export const membershipTypeEnum = pgEnum("membership_type", ["Free", "Premium"]);

export const usersTable = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  role: userRoleEnum("role").notNull().default("User"),
  membershipType: membershipTypeEnum("membership_type").notNull().default("Free"),
  credits: integer("credits").notNull().default(0),
  referralCode: text("referral_code").unique(),
  referredBy: text("referred_by"),
  registrationIp: text("registration_ip"),
  registrationUserAgent: text("registration_user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const referralFraudLogsTable = pgTable("referral_fraud_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  newUserId: text("new_user_id").notNull(),
  referrerId: text("referrer_id").notNull(),
  referralCode: text("referral_code").notNull(),
  reason: text("reason").notNull(),
  newUserIp: text("new_user_ip"),
  referrerIp: text("referrer_ip"),
  newUserAgent: text("new_user_agent"),
  referrerUserAgent: text("referrer_user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
