-- CreateTable
CREATE TABLE "comment_likes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "comment_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "comment_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "comment_likes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "message_reactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "emoji" TEXT NOT NULL DEFAULT '❤️',
    "user_id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "message_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "message_reactions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "comment_likes_comment_id_idx" ON "comment_likes"("comment_id");

-- CreateIndex
CREATE UNIQUE INDEX "comment_likes_user_id_comment_id_key" ON "comment_likes"("user_id", "comment_id");

-- CreateIndex
CREATE INDEX "message_reactions_message_id_idx" ON "message_reactions"("message_id");

-- CreateIndex
CREATE UNIQUE INDEX "message_reactions_user_id_message_id_emoji_key" ON "message_reactions"("user_id", "message_id", "emoji");
