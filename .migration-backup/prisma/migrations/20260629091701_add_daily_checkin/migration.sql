-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'Daily_Reward';

-- CreateTable
CREATE TABLE "user_daily_checkins" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "checked_in_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_daily_checkins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_daily_checkins_user_id_checked_in_date_key" ON "user_daily_checkins"("user_id", "checked_in_date");

-- AddForeignKey
ALTER TABLE "user_daily_checkins" ADD CONSTRAINT "user_daily_checkins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
