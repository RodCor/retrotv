-- Multi-account owners: one website identity ("owner") owns several native
-- Arcturus avatars (users rows). Idempotent / re-runnable.

-- 1) The owner identity (website login credential lives here, not on users).
CREATE TABLE IF NOT EXISTS account_owners (
  id              INT(11)      NOT NULL AUTO_INCREMENT,
  username        VARCHAR(64)  NOT NULL,
  email           VARCHAR(190) NULL,
  password        VARCHAR(64)  NOT NULL,
  primary_user_id INT(11)      NULL,
  max_avatars     INT(11)      NULL,
  banned          TINYINT(1)   NOT NULL DEFAULT 0,
  ban_reason      VARCHAR(255) NULL,
  created         INT(11)      NOT NULL DEFAULT 0,
  last_login      INT(11)      NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_owner_username (username),
  KEY idx_owner_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2) Link avatars to their owner.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS owner_id INT(11) NULL;

-- Index (MariaDB 10.5+ supports ADD KEY IF NOT EXISTS).
ALTER TABLE users
  ADD KEY IF NOT EXISTS idx_users_owner (owner_id);

-- 3) Global avatar cap (per-owner override lives on account_owners.max_avatars).
INSERT IGNORE INTO emulator_settings (`key`, `value`, `comment`)
VALUES ('retrotv.multiaccount.max_avatars', '5',
        'RetroTV: max avatars a single owner account may have');

-- 4) Migrate every existing user into its own 1:1 owner (only when missing).
INSERT INTO account_owners (username, email, password, primary_user_id, created, last_login)
SELECT u.username, u.mail, u.password, u.id,
       COALESCE(u.account_created, UNIX_TIMESTAMP()), u.last_login
  FROM users u
  LEFT JOIN account_owners o ON o.primary_user_id = u.id
 WHERE u.owner_id IS NULL
   AND o.id IS NULL;

-- 5) Backfill users.owner_id from the owner that points at each user.
UPDATE users u
  JOIN account_owners o ON o.primary_user_id = u.id
   SET u.owner_id = o.id
 WHERE u.owner_id IS NULL;
