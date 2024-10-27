/*
  Warnings:

  - You are about to drop the column `errandId` on the `UserReadNotification` table. All the data in the column will be lost.
  - Added the required column `itemId` to the `UserReadNotification` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UserReadNotification" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    CONSTRAINT "UserReadNotification_username_fkey" FOREIGN KEY ("username") REFERENCES "UserSettings" ("username") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_UserReadNotification" ("id", "username") SELECT "id", "username" FROM "UserReadNotification";
DROP TABLE "UserReadNotification";
ALTER TABLE "new_UserReadNotification" RENAME TO "UserReadNotification";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
