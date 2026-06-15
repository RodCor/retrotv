-- RetroTV RPG framework — data foundation (see docs/RPG-FRAMEWORK.md).
-- OPT-IN PER ROOM: rooms.rpg_enabled is off by default; the room owner turns it on.
-- The emulator only references this column from the RPG plugin, so adding it is
-- safe for the stock emulator (it never reads/writes it).

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS rpg_enabled    TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rpg_ruleset_id INT(11)    NOT NULL DEFAULT 0;

-- A ruleset = one community's RPG configuration (stats, formulas, abilities).
CREATE TABLE IF NOT EXISTS rpg_rulesets (
  id          INT(11)      NOT NULL AUTO_INCREMENT,
  name        VARCHAR(80)  NOT NULL,
  description VARCHAR(255) NOT NULL DEFAULT '',
  -- tunable config (dice notation, crit rules, damage formula tokens, etc.)
  config      JSON         NULL,
  enabled     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A character sheet (one per user per ruleset).
CREATE TABLE IF NOT EXISTS rpg_characters (
  id            INT(11)     NOT NULL AUTO_INCREMENT,
  user_id       INT(11)     NOT NULL,
  ruleset_id    INT(11)     NOT NULL DEFAULT 0,
  name          VARCHAR(80) NOT NULL DEFAULT '',
  hp            INT(11)     NOT NULL DEFAULT 100,
  max_hp        INT(11)     NOT NULL DEFAULT 100,
  resource      INT(11)     NOT NULL DEFAULT 100,  -- mana / reiatsu / energy
  max_resource  INT(11)     NOT NULL DEFAULT 100,
  atk           INT(11)     NOT NULL DEFAULT 10,
  def           INT(11)     NOT NULL DEFAULT 10,
  spd           INT(11)     NOT NULL DEFAULT 10,    -- initiative
  level         INT(11)     NOT NULL DEFAULT 1,
  updated_at    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_ruleset (user_id, ruleset_id),
  KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ability definitions per ruleset.
CREATE TABLE IF NOT EXISTS rpg_abilities (
  id          INT(11)      NOT NULL AUTO_INCREMENT,
  ruleset_id  INT(11)      NOT NULL DEFAULT 0,
  name        VARCHAR(80)  NOT NULL,
  cost        INT(11)      NOT NULL DEFAULT 0,
  range_tiles INT(11)      NOT NULL DEFAULT 1,
  area_shape  ENUM('single','line','cone','radius') NOT NULL DEFAULT 'single',
  area_size   INT(11)      NOT NULL DEFAULT 0,
  damage_expr VARCHAR(120) NOT NULL DEFAULT 'atk',  -- e.g. "2d6 + atk - target.def"
  cooldown    INT(11)      NOT NULL DEFAULT 0,
  status_id   INT(11)      NOT NULL DEFAULT 0,       -- applied status effect (0 = none)
  PRIMARY KEY (id),
  KEY idx_ruleset (ruleset_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Status effect definitions (burn, poison, stun…).
CREATE TABLE IF NOT EXISTS rpg_status_effects (
  id          INT(11)     NOT NULL AUTO_INCREMENT,
  ruleset_id  INT(11)     NOT NULL DEFAULT 0,
  name        VARCHAR(60) NOT NULL,
  icon        VARCHAR(20) NOT NULL DEFAULT '',
  per_turn    VARCHAR(60) NOT NULL DEFAULT '',  -- e.g. "-5 hp"
  duration    INT(11)     NOT NULL DEFAULT 1,
  stacks      TINYINT(1)  NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_ruleset (ruleset_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A live combat session bound to a room.
CREATE TABLE IF NOT EXISTS rpg_sessions (
  id               INT(11)   NOT NULL AUTO_INCREMENT,
  room_id          INT(11)   NOT NULL,
  state            ENUM('setup','active','ended') NOT NULL DEFAULT 'setup',
  round            INT(11)   NOT NULL DEFAULT 0,
  current_user_id  INT(11)   NOT NULL DEFAULT 0,    -- whose turn
  turn_ends_at     INT(11)   NOT NULL DEFAULT 0,    -- unix; for the turn timer
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_room (room_id, state)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Participants + their live combat state within a session.
CREATE TABLE IF NOT EXISTS rpg_session_participants (
  id           INT(11)  NOT NULL AUTO_INCREMENT,
  session_id   INT(11)  NOT NULL,
  user_id      INT(11)  NOT NULL DEFAULT 0,    -- 0 = NPC/bot
  display_name VARCHAR(80) NOT NULL DEFAULT '',
  team         ENUM('a','b','neutral') NOT NULL DEFAULT 'a',
  hp           INT(11)  NOT NULL DEFAULT 100,
  max_hp       INT(11)  NOT NULL DEFAULT 100,
  initiative   INT(11)  NOT NULL DEFAULT 0,
  has_acted    TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Combat log per session.
CREATE TABLE IF NOT EXISTS rpg_session_log (
  id         INT(11)   NOT NULL AUTO_INCREMENT,
  session_id INT(11)   NOT NULL,
  ts         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  message    VARCHAR(255) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A default starter ruleset so characters have somewhere to live.
INSERT INTO rpg_rulesets (id, name, description)
VALUES (1, 'RetroTV Básico', 'Reglas tácticas por defecto: turnos por iniciativa, daño ATK vs DEF.')
ON DUPLICATE KEY UPDATE name = VALUES(name);
