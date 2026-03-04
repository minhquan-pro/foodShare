-- Add deleted flag and reply-to support to messages table
ALTER TABLE messages ADD COLUMN deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE messages ADD COLUMN reply_to_id TEXT REFERENCES messages(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id ON messages(reply_to_id);