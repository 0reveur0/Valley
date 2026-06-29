import { pgTable, text, integer, timestamp, pgEnum, decimal } from "drizzle-orm/pg-core";

export const transactionTypeEnum = pgEnum("transaction_type", [
  "Upload_Reward",
  "Download_Cost",
  "Subscription_Purchase",
  "Daily_Reward",
]);
export const transactionStatusEnum = pgEnum("transaction_status", ["Pending", "Completed", "Failed"]);

export const transactionsTable = pgTable("transactions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  type: transactionTypeEnum("type").notNull(),
  points: integer("points").notNull().default(0),
  amount: decimal("amount", { precision: 10, scale: 2 }),
  status: transactionStatusEnum("status").notNull().default("Pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Transaction = typeof transactionsTable.$inferSelect;
