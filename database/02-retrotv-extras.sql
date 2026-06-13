-- RetroTV extras applied on top of the Extended (MS4) base database.
USE `habbo`;

-- WordGuesser plugin: it reads words from `random_words` (column `word`) but
-- does not create the table itself.
CREATE TABLE IF NOT EXISTS `random_words` (
  `id`   INT NOT NULL AUTO_INCREMENT,
  `word` VARCHAR(64) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `random_words` (`word`) VALUES
  ('habbo'),('retro'),('hotel'),('pixel'),('furni'),('rare'),('lobby'),
  ('dance'),('throne'),('dragon'),('teleport'),('wired'),('credits'),
  ('diamond'),('catalog'),('avatar'),('motto'),('jukebox'),('roller'),
  ('builder'),('moderator'),('friend'),('guild'),('badge'),('trade'),
  ('puffin'),('rubber'),('duck'),('sofa'),('rainbow');

-- Camera plugin: store photos under a Linux path served by the nitro host at
-- :8080/camera/ (the root compose mounts volume-camera into both containers).
INSERT INTO `emulator_settings` (`key`, `value`) VALUES
  ('imager.location.output.camera',     '/app/usercontent/camera/'),
  ('imager.location.output.thumbnail',  '/app/usercontent/camera/thumbnail/'),
  ('camera.url',                        'http://127.0.0.1:8080/camera/'),
  ('camera.use.https',                  '0')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);
