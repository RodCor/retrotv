-- RetroTV: hotel events, managed from the CRM and shown on the community page.
-- A lightweight CMS-owned table (not an emulator table) so staff can announce
-- scheduled in-hotel events (parties, competitions, etc.).
CREATE TABLE IF NOT EXISTS cms_events (
  id          INT(11)      NOT NULL AUTO_INCREMENT,
  title       VARCHAR(100) NOT NULL,
  description VARCHAR(800) NOT NULL DEFAULT '',
  image       VARCHAR(300) NOT NULL DEFAULT '',
  location    VARCHAR(120) NOT NULL DEFAULT '',
  event_date  DATETIME     NULL DEFAULT NULL,
  visible     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_visible_date (visible, event_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
