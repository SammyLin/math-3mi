-- 排行榜:k = 題型|位數|進借位|題數,每個 k 只留前 10 名
-- npx wrangler d1 execute math-3mi --remote --file schema.sql
CREATE TABLE IF NOT EXISTS board (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  k TEXT NOT NULL,
  name TEXT NOT NULL,
  secs INTEGER NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS board_k ON board (k, secs, at);
