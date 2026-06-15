-- RetroTV RPG — enrich the schema for data-driven rulesets (see docs/RPG-RULESETS.md).
-- Adds the rich ability fields the importer fills + native BHRPG character stats.
-- Existing columns are kept; the legacy engine still reads range_tiles/area_*.

ALTER TABLE rpg_abilities
  ADD COLUMN IF NOT EXISTS rama        VARCHAR(48)  NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tipo        VARCHAR(64)  NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS rango       VARCHAR(4)   NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cost_json   JSON         NULL,      -- {"D":35,"C":45,...} or {"raw":"Variable"}
  ADD COLUMN IF NOT EXISTS range_shape VARCHAR(16)  NOT NULL DEFAULT '',  -- self|direct|line|cone|area|chase
  ADD COLUMN IF NOT EXISTS range_n     INT(11)      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS formula     VARCHAR(255) NOT NULL DEFAULT '',  -- engine-evaluable damage formula
  ADD COLUMN IF NOT EXISTS effects_json JSON        NULL,      -- typed effect nodes (auto-applied)
  ADD COLUMN IF NOT EXISTS effect_text TEXT         NULL,      -- full prose (always shown)
  ADD COLUMN IF NOT EXISTS requisitos  VARCHAR(500) NOT NULL DEFAULT '';

-- Native BHRPG character stats (NIVEL=level, FUE=atk, DEF=def, VIT=hp, VEL=spd, REI=resource).
ALTER TABLE rpg_characters
  ADD COLUMN IF NOT EXISTS arma  INT(11)     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rango VARCHAR(4)  NOT NULL DEFAULT 'D',
  ADD COLUMN IF NOT EXISTS clase VARCHAR(48) NOT NULL DEFAULT '';

-- The BHRPG ruleset (id 2). Config records the stat set + dice for the engine.
INSERT INTO rpg_rulesets (id, name, description, config)
VALUES (2, 'BHRPG', 'Bleach tactical RPG — importado de rpg_docs/bhrpg.',
  JSON_OBJECT(
    'stats', JSON_ARRAY('NIVEL','FUE','DEF','VIT','VEL','REI','ARMA'),
    'ranks', JSON_ARRAY('D','C','B','A','S'),
    'resource', 'REI', 'hp', 'VIT', 'dice', 'd20'))
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), config = VALUES(config);
