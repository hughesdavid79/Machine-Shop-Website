CREATE TABLE IF NOT EXISTS barrel_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  color TEXT NOT NULL,
  threshold INTEGER NOT NULL DEFAULT 5,
  decrementOnFill BOOLEAN NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS barrels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type_id INTEGER NOT NULL,
  filled BOOLEAN NOT NULL DEFAULT 0,
  FOREIGN KEY (type_id) REFERENCES barrel_types(id)
);

CREATE TABLE IF NOT EXISTS announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS replies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  announcement_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (announcement_id) REFERENCES announcements(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_replies_announcement_id ON replies (announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcements_timestamp ON announcements (timestamp DESC); 