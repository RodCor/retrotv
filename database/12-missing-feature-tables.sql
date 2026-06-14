-- RetroTV: add optional-feature tables this MS4 build looks for but the bundled
-- dump lacked. Empty tables silence the boot warnings; features stay inert until
-- populated. (Frank bot chat, @-mentions, the spin-wheel.)
CREATE TABLE IF NOT EXISTS bot_chat_responses (
  id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(64) NOT NULL DEFAULT 'Frank',
  `keys` VARCHAR(512) NOT NULL DEFAULT '',
  responses TEXT NOT NULL,
  enabled ENUM('0','1') NOT NULL DEFAULT '1',
  bot_type VARCHAR(32) NOT NULL DEFAULT 'generic',
  mode INT(11) NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS habbo_mentions (
  id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT(11) NOT NULL DEFAULT 0,
  mentioned_by INT(11) NOT NULL DEFAULT 0,
  room_id INT(11) NOT NULL DEFAULT 0,
  message VARCHAR(255) NOT NULL DEFAULT '',
  timestamp INT(11) NOT NULL DEFAULT 0,
  seen ENUM('0','1') NOT NULL DEFAULT '0'
);
CREATE TABLE IF NOT EXISTS wheel_prizes (
  id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(50) NOT NULL DEFAULT 'credits',
  amount INT(11) NOT NULL DEFAULT 0,
  chance DOUBLE NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS wheel_recent_wins (
  id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT(11) NOT NULL DEFAULT 0,
  prize VARCHAR(255) NOT NULL DEFAULT '',
  timestamp INT(11) NOT NULL DEFAULT 0
);
