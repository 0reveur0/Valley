import { db, notificationsTable } from "@workspace/db";

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  link: string,
): Promise<void> {
  try {
    await db.insert(notificationsTable).values({ userId, title, message, link });
  } catch {
  }
}
