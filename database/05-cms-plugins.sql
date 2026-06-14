-- RetroTV: registry of emulator plugins so staff can toggle them from the CMS.
-- The emulator entrypoint reads this at boot and loads only the enabled jars
-- from /app/plugins-available into /app/plugins. Toggling requires a restart.
CREATE TABLE IF NOT EXISTS cms_plugins (
  jar         VARCHAR(190) NOT NULL PRIMARY KEY,
  name        VARCHAR(190) NOT NULL,
  description VARCHAR(255) NOT NULL DEFAULT '',
  enabled     TINYINT(1)   NOT NULL DEFAULT 1
);

-- Seed the bundled plugins. ON DUPLICATE refreshes the label/description but
-- never the enabled flag, so re-running won't undo a staff member's toggle.
INSERT INTO cms_plugins (jar, name, description, enabled) VALUES
  ('bot-protection-2.0.jar', 'Bot Protection', 'Blocks automated bot/spam login floods.', 1),
  ('Camera-1.6.jar',         'Camera',         'Saves in-game camera photos to the server.', 1),
  ('fun-commands-2.0.jar',   'Fun Commands',   'Adds extra fun chat commands for players and staff.', 1),
  ('wordguesser-1.1.jar',    'Word Guesser',   'Word-guessing mini-game you can run in a room.', 1)
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);
