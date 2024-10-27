/*
  Warnings:

  - You are about to drop the column `userId` on the `UserSettings` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `UserReadNotification` table. All the data in the column will be lost.
  - Added the required column `username` to the `UserSettings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `UserReadNotification` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UserSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "readNotificationsClearedDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_UserSettings" ("id", "readNotificationsClearedDate") SELECT "id", "readNotificationsClearedDate" FROM "UserSettings";
DROP TABLE "UserSettings";
ALTER TABLE "new_UserSettings" RENAME TO "UserSettings";
CREATE UNIQUE INDEX "UserSettings_username_key" ON "UserSettings"("username");
CREATE TABLE "new_UserReadNotification" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    CONSTRAINT "UserReadNotification_username_fkey" FOREIGN KEY ("username") REFERENCES "UserSettings" ("username") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_UserReadNotification" ("id") SELECT "id" FROM "UserReadNotification";
DROP TABLE "UserReadNotification";
ALTER TABLE "new_UserReadNotification" RENAME TO "UserReadNotification";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
