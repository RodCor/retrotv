-- Fix: this MS4 build's user-save UPDATE references background_border_id, which
-- the bundled dump lacked. The missing column made EVERY user write fail
-- (look/clothes, online status, credits earned never persisted). Add it.
ALTER TABLE users ADD COLUMN IF NOT EXISTS background_border_id INT(11) NOT NULL DEFAULT 0;
