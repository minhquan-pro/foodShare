-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "bio" TEXT,
    "location" TEXT,
    "birthday" DATETIME,
    "show_birth_year" BOOLEAN NOT NULL DEFAULT true,
    "avatar_url" TEXT,
    "facebook" TEXT,
    "instagram" TEXT,
    "twitter" TEXT,
    "tiktok" TEXT,
    "youtube" TEXT,
    "github" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_users" ("avatar_url", "bio", "birthday", "created_at", "email", "facebook", "github", "id", "instagram", "location", "name", "password", "role", "tiktok", "twitter", "updated_at", "youtube") SELECT "avatar_url", "bio", "birthday", "created_at", "email", "facebook", "github", "id", "instagram", "location", "name", "password", "role", "tiktok", "twitter", "updated_at", "youtube" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
